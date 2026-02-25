import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireSessionOwner } from '@/lib/utils/auth'
import { logger } from '@/lib/utils/logger'

const MAX_PDF_SIZE_MB = 5
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /api/sessoes/[id]/comprovante — Envia comprovante por email */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email não configurado. Adicione RESEND_API_KEY nas variáveis de ambiente.' },
        { status: 503 }
      )
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { user, db, error: authError } = await requireAuth()
    if (authError) return authError

    const ownership = await requireSessionOwner(db, user!.id, id)
    if (ownership.error) return ownership.error

    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const destinatario = formData.get('email') as string | null
    const pacienteNome = formData.get('pacienteNome') as string | null

    if (!pdfFile || !destinatario) {
      return NextResponse.json({ error: 'PDF e email são obrigatórios' }, { status: 400 })
    }

    // Validate PDF MIME type
    if (pdfFile.type && pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Arquivo deve ser um PDF' }, { status: 400 })
    }

    // Validate PDF size
    const pdfSizeMB = pdfFile.size / (1024 * 1024)
    if (pdfSizeMB > MAX_PDF_SIZE_MB) {
      return NextResponse.json(
        { error: `PDF muito grande (${pdfSizeMB.toFixed(1)}MB). Limite: ${MAX_PDF_SIZE_MB}MB.` },
        { status: 413 }
      )
    }

    // Validate email format
    if (!EMAIL_REGEX.test(destinatario)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    // Buscar nome do profissional para o remetente
    const { data: usuario } = await db
      .from('usuarios')
      .select('nome, crp')
      .eq('id', user!.id)
      .single()

    const nomeProf = usuario?.nome || 'Psicólogo(a)'
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

    const { error } = await resend.emails.send({
      from: `${nomeProf} <comprovante@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: destinatario,
      subject: `Declaração de Comparecimento — ${pacienteNome || 'Atendimento Psicológico'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">Declaração de Comparecimento</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Olá${pacienteNome ? ` ${pacienteNome.split(' ')[0]}` : ''},
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Segue em anexo a declaração de comparecimento referente ao atendimento psicológico realizado.
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Atenciosamente,<br/>
            <strong style="color: #1e293b;">${nomeProf}</strong>
            ${usuario?.crp ? `<br/><span style="color: #94a3b8; font-size: 12px;">CRP ${usuario.crp}</span>` : ''}
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px;">
            Enviado via PsicoApp
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `comprovante-${id.slice(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    if (error) {
      logger.error('Resend error', { sessaoId: id, error: error.message })
      return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Erro ao enviar comprovante', { sessaoId: id, error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
