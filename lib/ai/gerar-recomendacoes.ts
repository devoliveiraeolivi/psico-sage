/**
 * Geração de recomendações clínicas de APOIO À DECISÃO a partir do prontuário
 * aprovado. Usa OpenAI GPT-5.2. Não substitui o julgamento do profissional.
 */

import OpenAI from 'openai'
import type {
  SessaoResumo,
  PacienteResumo,
  SessaoRecomendacoes,
  HipoteseDiagnostica,
  AlertaClinico,
  ConducaoProximaSessao,
} from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'

const SYSTEM_PROMPT = `# PAPEL

Você é um assistente clínico de APOIO À DECISÃO para psicólogos. A partir do prontuário já revisado de uma sessão, sugira caminhos terapêuticos. Você NÃO substitui o julgamento clínico do profissional — apenas oferece opções para ele considerar.

# REGRAS INVIOLÁVEIS

1. **Diagnóstico é HIPÓTESE, nunca afirmação.** Use sempre linguagem condicional: "sinais compatíveis com X, considere investigar". Liste critérios que ainda faltam confirmar e perguntas de rastreio. Ancore em CID-11 ou DSM-5.
2. **NUNCA cite referência bibliográfica específica** (autor, ano, livro, artigo, número de página). Fale "técnica de reestruturação cognitiva", nunca "(Beck, 2011)". Inventar fonte é proibido.
3. **Toda técnica vem com rótulo de abordagem** (ex.: "TCC", "ACT", "Psicanálise", "Sistêmica", "Fenomenológica"). Cubra múltiplas abordagens quando fizer sentido.
4. **Eleve sinais de risco** (ideação suicida, autoagressão, heteroagressão, violência) em alertas_clinicos com nivel "urgente".
5. **Não invente conteúdo** que não tenha base no prontuário. Campo sem base = lista vazia [].

# SAÍDA

Responda APENAS com JSON válido, sem markdown, no formato:

{
  "tecnicas_sugeridas": [
    { "abordagem": "TCC", "nome": "...", "descricao_curta": "...", "quando_usar": "..." }
  ],
  "hipoteses_diagnosticas": [
    { "hipotese": "sinais compatíveis com ...", "sistema": "CID-11", "sinais_observados": ["..."], "criterios_a_confirmar": ["..."], "perguntas_rastreio": ["..."] }
  ],
  "escalas_sugeridas": [
    { "nome": "PHQ-9", "objetivo": "...", "quando_aplicar": "..." }
  ],
  "psicoeducacao": [
    { "tema": "...", "descricao_curta": "..." }
  ],
  "conducao_proxima_sessao": [
    { "tipo": "retomar", "conteudo": "..." }
  ],
  "alertas_clinicos": [
    { "nivel": "monitorar", "descricao": "..." }
  ]
}

Onde "sistema" ∈ {"CID-11","DSM-5"}, "tipo" ∈ {"retomar","foco","pergunta","tarefa"}, "nivel" ∈ {"urgente","monitorar"}.`

const SISTEMAS = ['CID-11', 'DSM-5'] as const
const TIPOS_CONDUCAO = ['retomar', 'foco', 'pergunta', 'tarefa'] as const
const NIVEIS_ALERTA = ['urgente', 'monitorar'] as const

const asArray = (v: any): any[] => (Array.isArray(v) ? v : [])
const asStr = (v: any): string => (typeof v === 'string' ? v : '')
const asStrArray = (v: any): string[] => asArray(v).filter((x) => typeof x === 'string')

export function normalizeRecomendacoes(
  parsed: any,
  modelo: string,
  geradoEm: string
): SessaoRecomendacoes {
  const p = parsed || {}

  const hipoteses: HipoteseDiagnostica[] = asArray(p.hipoteses_diagnosticas).map((h: any) => ({
    hipotese: asStr(h?.hipotese),
    sistema: SISTEMAS.includes(h?.sistema) ? h.sistema : 'CID-11',
    sinais_observados: asStrArray(h?.sinais_observados),
    criterios_a_confirmar: asStrArray(h?.criterios_a_confirmar),
    perguntas_rastreio: asStrArray(h?.perguntas_rastreio),
  }))

  const conducao: ConducaoProximaSessao[] = asArray(p.conducao_proxima_sessao).map((c: any) => ({
    tipo: TIPOS_CONDUCAO.includes(c?.tipo) ? c.tipo : 'foco',
    conteudo: asStr(c?.conteudo),
  }))

  const alertas: AlertaClinico[] = asArray(p.alertas_clinicos).map((a: any) => ({
    nivel: NIVEIS_ALERTA.includes(a?.nivel) ? a.nivel : 'monitorar',
    descricao: asStr(a?.descricao),
  }))

  return {
    tecnicas_sugeridas: asArray(p.tecnicas_sugeridas).map((t: any) => ({
      abordagem: asStr(t?.abordagem),
      nome: asStr(t?.nome),
      descricao_curta: asStr(t?.descricao_curta),
      quando_usar: asStr(t?.quando_usar),
    })),
    hipoteses_diagnosticas: hipoteses,
    escalas_sugeridas: asArray(p.escalas_sugeridas).map((e: any) => ({
      nome: asStr(e?.nome),
      objetivo: asStr(e?.objetivo),
      quando_aplicar: asStr(e?.quando_aplicar),
    })),
    psicoeducacao: asArray(p.psicoeducacao).map((e: any) => ({
      tema: asStr(e?.tema),
      descricao_curta: asStr(e?.descricao_curta),
    })),
    conducao_proxima_sessao: conducao,
    alertas_clinicos: alertas,
    gerado_em: geradoEm,
    modelo_ia_usado: modelo,
  }
}

export async function generateRecomendacoes(
  resumo: SessaoResumo,
  pacienteResumo: PacienteResumo | null
): Promise<SessaoRecomendacoes> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada')
  }

  const openai = new OpenAI({ apiKey })

  const contextoPaciente = pacienteResumo
    ? `\n\n<contexto_paciente>\n${JSON.stringify(pacienteResumo)}\n</contexto_paciente>`
    : ''

  logger.info('OpenAI recomendacoes starting')

  const parsed = await withRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 12000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `A partir do prontuário aprovado a seguir, gere recomendações clínicas de apoio à decisão:\n\n<prontuario>\n${JSON.stringify(resumo)}\n</prontuario>${contextoPaciente}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('OpenAI retornou resposta vazia')
      }
      try {
        return JSON.parse(content)
      } catch {
        throw new Error(`OpenAI retornou JSON inválido: ${(content || '').slice(0, 200)}`)
      }
    },
    {
      maxRetries: 2,
      timeoutMs: 180_000,
      baseDelayMs: 3000,
      onRetry: (error, attempt) => {
        logger.warn('OpenAI recomendacoes retry', { attempt, error: error.message })
      },
    }
  )

  logger.info('OpenAI recomendacoes complete')

  return normalizeRecomendacoes(parsed, MODEL, new Date().toISOString())
}
