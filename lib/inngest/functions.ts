import { inngest } from './client'
import { transcribeAudio } from '@/lib/transcription/groq'
import { extractResumo } from '@/lib/ai/extract-resumo'
import { logger } from '@/lib/utils/logger'
import { captureException } from '@/lib/utils/sentry'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

/**
 * Creates an admin Supabase client for use in background jobs.
 * Background jobs don't have cookie-based sessions, so we use the service role key.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY for background processing')
  }
  return createSupabaseAdmin(url, key)
}

/**
 * Main session processing pipeline.
 * Triggered after audio upload completes.
 * Steps: transcribe → extract → finalize
 * Each step is retryable independently by Inngest.
 */
export const processSessionPipeline = inngest.createFunction(
  {
    id: 'process-session-pipeline',
    retries: 3,
    onFailure: async ({ event }) => {
      const sessaoId = event.data.event.data.sessaoId
      logger.error('Pipeline permanently failed', { sessaoId })
      captureException(new Error('Session pipeline permanently failed'), { sessaoId, operation: 'pipeline' })
      try {
        const db = getAdminClient()
        await db
          .from('sessoes')
          .update({
            recording_status: 'error',
            processing_error: 'Pipeline falhou após todas as tentativas. Use o botão "Reprocessar".',
          })
          .eq('id', sessaoId)
      } catch (e) {
        logger.error('Failed to update session on pipeline failure', { sessaoId })
      }
    },
  },
  { event: 'session/recording.stopped' },
  async ({ event, step }) => {
    const { sessaoId } = event.data

    // Step 1: Transcribe audio
    await step.run('transcribe', async () => {
      const db = getAdminClient()

      // Update status
      await db
        .from('sessoes')
        .update({ recording_status: 'transcribing' })
        .eq('id', sessaoId)

      // Fetch audio URL
      const { data: sessao, error: fetchError } = await db
        .from('sessoes')
        .select('audio_url')
        .eq('id', sessaoId)
        .single()

      if (fetchError || !sessao?.audio_url) {
        throw new Error(`Áudio não encontrado para sessão ${sessaoId}`)
      }

      // Download audio from Storage
      const { data: audioData, error: downloadError } = await db.storage
        .from('audio-sessoes')
        .download(sessao.audio_url)

      if (downloadError || !audioData) {
        throw new Error(`Download falhou: ${downloadError?.message}`)
      }

      // Transcribe
      const audioBuffer = Buffer.from(await audioData.arrayBuffer())
      logger.info('Pipeline: transcribing', { sessaoId, audioSizeMB: +(audioBuffer.length / 1024 / 1024).toFixed(1) })
      const result = await transcribeAudio(audioBuffer, sessao.audio_url)

      // Save transcription
      await db
        .from('sessoes')
        .update({
          integra: result.fullText,
          recording_status: 'processing',
        })
        .eq('id', sessaoId)

      logger.info('Pipeline: transcription complete', {
        sessaoId,
        segments: result.segments.length,
        textLength: result.fullText.length,
      })

      return { textLength: result.fullText.length }
    })

    // Step 2: Extract structured clinical data
    await step.run('extract', async () => {
      const db = getAdminClient()

      // Fetch transcription
      const { data: sessao, error: fetchError } = await db
        .from('sessoes')
        .select('integra')
        .eq('id', sessaoId)
        .single()

      if (fetchError || !sessao?.integra) {
        throw new Error(`Transcrição não encontrada para sessão ${sessaoId}`)
      }

      // Extract via Gemini
      logger.info('Pipeline: extracting', { sessaoId, textLength: sessao.integra.length })
      const resumo = await extractResumo(sessao.integra)

      // Save resumo and update status
      await db
        .from('sessoes')
        .update({
          resumo,
          status: 'aguardando_aprovacao',
          recording_status: 'done',
          processing_error: null,
        })
        .eq('id', sessaoId)

      logger.info('Pipeline: extraction complete', { sessaoId })

      return { status: 'aguardando_aprovacao' }
    })
  }
)

/**
 * Recovery job for stuck sessions.
 * Runs every 15 minutes, finds sessions stuck in intermediate states,
 * and re-triggers the pipeline.
 */
export const recoverStuckSessions = inngest.createFunction(
  { id: 'recover-stuck-sessions' },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    await step.run('find-and-recover', async () => {
      const db = getAdminClient()

      // Find sessions stuck in processing states for >10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      const { data: stuckSessions } = await db
        .from('sessoes')
        .select('id, recording_status')
        .in('recording_status', ['transcribing', 'processing', 'uploading'])
        .lt('updated_at', tenMinutesAgo)
        .limit(10)

      if (!stuckSessions || stuckSessions.length === 0) {
        return { recovered: 0 }
      }

      logger.warn('Found stuck sessions', { count: stuckSessions.length })

      // Re-trigger pipeline for each stuck session
      for (const session of stuckSessions) {
        await inngest.send({
          name: 'session/recording.stopped',
          data: { sessaoId: session.id },
        })
        logger.info('Re-triggered pipeline for stuck session', {
          sessaoId: session.id,
          previousStatus: session.recording_status,
        })
      }

      return { recovered: stuckSessions.length }
    })
  }
)
