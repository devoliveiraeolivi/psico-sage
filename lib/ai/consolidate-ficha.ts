import OpenAI from 'openai'
import type { FichaAtual, FichaPatch } from '@/lib/types'
import type { SessaoResumo } from '@/lib/types'
import { PATH_TO_HISTORICO } from '@/lib/ficha/merge'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'
const RISCO_PATHS = new Set(['estado_mental.risco_suicida', 'estado_mental.risco_heteroagressivo'])

// Paths que a IA pode emitir (escalares revisáveis + listas do mapa de histórico)
const SCALAR_PATHS = new Set([
  'sintese_clinica', 'estado_mental.humor', 'estado_mental.afeto', 'estado_mental.insight',
  'estado_mental.juizo_critica', 'estado_mental.risco_suicida', 'estado_mental.risco_heteroagressivo',
  'queixas_ativas.queixa', 'queixas_ativas.frequencia', 'farmacologia.adesao',
  'farmacologia.encaminhamento', 'metas_plano.foco_proxima_sessao',
  'anamnese.infancia', 'anamnese.adolescencia', 'anamnese.vida_adulta', 'anamnese.familia_origem',
  'anamnese.relacionamentos', 'anamnese.marcos_vida', 'anamnese.historico_tratamentos',
])
const VALID_PATHS = new Set<string>(
  [
    'sintese_clinica', 'estado_mental.humor', 'estado_mental.afeto', 'estado_mental.insight',
    'estado_mental.juizo_critica', 'estado_mental.risco_suicida', 'estado_mental.risco_heteroagressivo',
    'queixas_ativas.queixa', 'queixas_ativas.frequencia', 'farmacologia.adesao',
    'farmacologia.encaminhamento', 'metas_plano.foco_proxima_sessao',
    'anamnese.infancia', 'anamnese.adolescencia', 'anamnese.vida_adulta', 'anamnese.familia_origem',
    'anamnese.relacionamentos', 'anamnese.marcos_vida', 'anamnese.historico_tratamentos',
  ].concat(Object.keys(PATH_TO_HISTORICO))
)
const VALID_TIPOS = new Set(['adicionado', 'atualizado', 'resolvido', 'concluida'])

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

export function validatePatches(raw: unknown): FichaPatch[] {
  const arr = (raw as any)?.patches
  if (!Array.isArray(arr)) return []
  const out: FichaPatch[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object') continue
    const { path, tipo, antes, depois, motivo } = r as Record<string, unknown>
    if (typeof path !== 'string' || !VALID_PATHS.has(path)) continue
    if (typeof tipo !== 'string' || !VALID_TIPOS.has(tipo)) continue
    if (typeof depois !== 'string' || !depois.trim()) continue
    out.push({
      id: `${path}#${slug(depois)}`,
      path, tipo: tipo as FichaPatch['tipo'],
      antes: typeof antes === 'string' && antes ? antes : null,
      depois,
      motivo: typeof motivo === 'string' ? motivo : '',
      risco: RISCO_PATHS.has(path),
    })
  }
  return out
}

const SYSTEM_PROMPT = `# PAPEL
Você é um documentador clínico em psicologia. Recebe a FICHA ATUAL consolidada de um paciente e o RESUMO de uma nova sessão. Sua tarefa é emitir uma lista de PATCHES que atualizam apenas o ESTADO ATUAL da ficha.

# REGRAS
1. ATUALIZE, NUNCA INVENTE: só emita patch com base na sessão ou na ficha. Campo sem evidência nova fica como está (não emita patch).
2. MUDANÇA REAL ≠ REPETIÇÃO: se a sessão repete algo já na ficha, não emita patch. Só emita se houve evolução, contradição ou item novo.
3. CONSOLIDE ENTIDADES: descrições diferentes do mesmo padrão/pessoa já registrados = atualização (não item novo).
4. JUSTIFIQUE: todo patch tem 'motivo' clínico curto (o psicólogo lê no diff).
5. RISCO CONSERVADOR: qualquer mudança em risco_suicida/heteroagressivo SEMPRE vira patch explícito, nunca silenciosa.

# PATHS PERMITIDOS
Escalares (substituem valor): sintese_clinica, estado_mental.humor, estado_mental.afeto, estado_mental.insight, estado_mental.juizo_critica, estado_mental.risco_suicida, estado_mental.risco_heteroagressivo, queixas_ativas.queixa, queixas_ativas.frequencia, farmacologia.adesao, farmacologia.encaminhamento, metas_plano.foco_proxima_sessao, anamnese.* .
Listas (path termina em []): queixas_ativas.sintomas[], padroes_dinamicas.padroes[], padroes_dinamicas.crencas_nucleares[], padroes_dinamicas.recursos[], pessoas_chave[], farmacologia.medicacoes[], metas_plano.metas_ativas[], metas_plano.tarefas_andamento[], alertas_ativos[]. Use tipo 'concluida'/'resolvido' (com 'antes'=item exato) para remover de uma lista.

# FORMATO
Responda APENAS JSON válido, sem markdown:
{ "patches": [ { "path": "...", "tipo": "adicionado|atualizado|resolvido|concluida", "antes": "valor anterior ou null", "depois": "valor novo", "motivo": "..." } ] }
Se nada mudou, retorne { "patches": [] }.`

export async function consolidateFichaAI(atual: FichaAtual, resumo: SessaoResumo): Promise<FichaPatch[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
  const openai = new OpenAI({ apiKey })

  const parsed = await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `FICHA ATUAL:\n${JSON.stringify(atual)}\n\nRESUMO DA SESSÃO:\n${JSON.stringify(resumo)}` },
      ],
    })
    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI retornou resposta vazia')
    return JSON.parse(content)
  }, { maxRetries: 2, timeoutMs: 120_000, baseDelayMs: 3000,
       onRetry: (e, a) => logger.warn('consolidate-ficha retry', { attempt: a, error: e.message }) })

  return validatePatches(parsed)
}
