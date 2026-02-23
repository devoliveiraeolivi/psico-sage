/**
 * Extração de prontuário clínico de transcrições de sessões de terapia.
 * Usa Gemini 2.5 Flash (Google) para gerar SessaoResumo completo (normas CFP).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SessaoResumo } from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `# PAPEL
Você é um extrator clínico. Analise uma transcrição de psicoterapia e produza JSON estruturado para registro da SESSÃO.
Você NÃO atualiza histórico longitudinal — apenas extrai o que apareceu nesta sessão.

# REGRAS ABSOLUTAS
1. NUNCA invente informações. Você é extrator, não criador.
2. NÃO MENCIONADO = null (ou [] quando lista). Muitos nulls = você está fazendo certo.
3. NÃO inferir diagnóstico, defesas, transferência ou crenças centrais sem evidência explícita.
4. Use terminologia CID-11/DSM-5 quando aplicável.
5. Registre fatos observáveis, sem julgamentos de valor.

# GUARDRAILS CRÍTICOS
- humor: use APENAS termos clínicos (ansioso, deprimido, eutímico, lábil, disfórico, irritável). Pode combinar: "eutímico com traços de ansiedade". "Cansada" ≠ humor.
- sintomas: inclua físicos E psicológicos; normalize para termos clínicos (taquicardia, dispneia, tremor, parestesia). NÃO inclua expressões coloquiais ("no limite" não é sintoma).
- emoção ≠ sintoma: raiva e tristeza são afetos/emoções, não sintomas. Se o paciente relata raiva intensa recorrente como sofrimento, pode entrar; se é reação pontual, não.
- pensamento_conteudo: crenças, medos recorrentes, autocrítica, ruminação, catastrofização = conteúdo. Inclua evidência com citação direta.
- progresso_relatado: se houver QUALQUER menção a tarefa/meta anterior, registre (mesmo "não consegui" = nao_realizada). NUNCA deixe [] se houve discussão sobre tarefas anteriores.
- intensidade 0-10: só preencha se o paciente deu nota explícita ou disse algo como "no máximo 9/10". Se não: null.
- evidencias: no máximo 2 trechos por campo. Trechos curtos, ipsis litteris, com quem disse.
- tarefas_novas: registre TODAS as tarefas acordadas (exercícios, registros de pensamento, respiração, limites a estabelecer, autocuidado).
- tecnicas_utilizadas: seja específico — "Reestruturação cognitiva (busca de evidências)", não apenas "reestruturação".
- alertas.atencao: se o terapeuta mencionar possibilidade de encaminhamento (psiquiatra, médico) ou condição a monitorar, registre.

# PESSOAS (enums obrigatórios para consistência no merge)
- categoria (enum fechado): "familia_origem" | "familia_constituida" | "trabalho" | "social" | "profissional_saude" | "outros"
- tipo (enum fechado):
  - familia_origem: mae, pai, irmao, irma, avo, tio, tia, primo, prima, padrasto, madrasta
  - familia_constituida: parceiro, ex_parceiro, filho, filha, sogro, sogra, cunhado, cunhada
  - trabalho: chefe, colega, subordinado, cliente, socio, mentor
  - social: amigo, vizinho, conhecido
  - profissional_saude: psiquiatra, medico, terapeuta_anterior
  - outros: outro
- contexto (string curta, opcional): esclarece relação quando tipo não basta. Ex: "irmão do parceiro", "namorada do cunhado". Relação direta com paciente = null.
- relevancia: "central" (impacto direto no caso) | "secundaria" (menção contextual)

# EVOLUÇÃO CRP
Parágrafo único, 5-8 linhas, linguagem técnica e impessoal.
Sem nomes próprios de terceiros (use "parceiro", "mãe", "irmão").
Verbos no passado ou presente. Sem metáforas ou linguagem coloquial.
SEMPRE finalizar com avaliação de risco: "Risco suicida [x]; risco heteroagressivo [y]."
Se risco não foi avaliado: "Risco não avaliado nesta sessão."

# OUTPUT (JSON)
Gere APENAS JSON válido seguindo esta estrutura:

{
  "resumo_sessao": {
    "sintese": "1 frase resumindo o foco da sessão",
    "pontos_principais": ["3-5 bullets, até 15 palavras cada"],
    "mudancas_observadas": ["evoluções/insights observados. Se nenhuma = []"],
    "proximos_passos": ["o que ficou para seguimento. Se nenhum = []"]
  },
  "queixa_sintomatologia": {
    "queixa_sessao": "string|null — motivo principal DESTA sessão (1-2 frases)",
    "sintomas_relatados": ["termos clínicos. Se não mencionou = []"],
    "intensidade": "number|null — 0-10, APENAS se paciente deu nota explícita",
    "frequencia": "string|null — ex: 'diariamente', '2-3x por semana'",
    "gatilhos": ["o que desencadeou/piorou sintomas NESTA sessão. Se não mencionou = []"],
    "estrategias_que_ajudaram": ["o que aliviou. Se não mencionou = []"],
    "evidencias": [{"campo": "queixa|sintomas|gatilhos|estrategias", "trecho": "citação ipsis litteris, curta", "quem": "paciente|terapeuta"}]
  },
  "estado_mental_sessao": {
    "humor": "string|null — termos clínicos APENAS",
    "afeto": "congruente|incongruente|embotado|expansivo|null",
    "pensamento_curso": "normal|acelerado|lentificado|desorganizado|null",
    "pensamento_conteudo": {
      "resumo": "string|null — ideias/crenças predominantes",
      "evidencias": [{"trecho": "citação direta", "quem": "paciente|terapeuta"}]
    },
    "insight": "presente|parcial|ausente|null",
    "juizo_critica": "preservados|parcialmente preservados|prejudicados|null",
    "sensopercepcao": "sem alterações|descrever se houver|null",
    "risco_suicida": "ausente|ideação passiva|ideação ativa|plano estruturado|não avaliado",
    "risco_heteroagressivo": "ausente|presente|não avaliado"
  },
  "pessoas_mencionadas": [
    {
      "nome_usado": "como o paciente se referiu",
      "categoria": "enum — ver PESSOAS acima",
      "tipo": "enum — ver PESSOAS acima",
      "contexto": "string|null — esclarecimento quando tipo não basta",
      "relevancia": "central|secundaria",
      "nota": "máx 2 frases sobre o que foi dito"
    }
  ],
  "intervencoes": {
    "objetivos_sessao": "string|null — o que se buscou alcançar",
    "tecnicas_utilizadas": ["ser específico, ver GUARDRAILS"],
    "temas_trabalhados": ["assuntos principais abordados"],
    "resposta_do_paciente": "string|null — como o paciente reagiu/engajou"
  },
  "plano_metas": {
    "progresso_relatado": [{"meta": "descrição", "status": "concluida|em_andamento|nao_realizada|parcial", "observacao": "detalhes"}],
    "tarefas_novas": ["TODAS as tarefas acordadas"],
    "metas_acordadas": "string|null",
    "foco_proxima_sessao": "string|null"
  },
  "medicacao_sessao": {
    "medicacoes_mencionadas": "string|null",
    "adesao": "string|null",
    "efeitos_relatados": "string|null",
    "mudancas": "string|null",
    "encaminhamentos": "string|null"
  },
  "fatos_novos_biograficos": ["informações biográficas reveladas NESTA sessão. Se nenhuma = []"],
  "alertas": {
    "urgentes": ["risco iminente (suicídio, violência, abuso). Se nenhum = []"],
    "atencao": ["importante mas não urgente (encaminhamentos, sintomas físicos, episódios significativos). Se nenhum = []"],
    "acompanhar": ["monitorar nas próximas sessões (adesão, sintomas, padrões, relacionamentos). Se nenhum = []"]
  },
  "evolucao_crp": "ver regras EVOLUÇÃO CRP acima"
}`

export async function extractResumo(transcricao: string): Promise<SessaoResumo> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada')
  }

  // Gemini 2.5 Flash tem janela de contexto grande, mas truncamos por segurança
  const maxChars = 120000
  const textoTruncado = transcricao.length > maxChars
    ? transcricao.slice(0, maxChars) + '\n\n[... transcrição truncada por limite de tamanho]'
    : transcricao

  logger.info('Gemini extraction starting', { transcriptionLength: textoTruncado.length })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 40000,
      responseMimeType: 'application/json',
    },
  })

  const parsed = await withRetry(
    async () => {
      const result = await model.generateContent(
        `Analise a seguinte transcrição de sessão de terapia e extraia os dados estruturados para prontuário clínico:\n\n${textoTruncado}`
      )

      const content = result.response.text()

      if (!content) {
        throw new Error('Gemini retornou resposta vazia')
      }

      try {
        return JSON.parse(content)
      } catch (parseError) {
        throw new Error(`Gemini retornou JSON inválido: ${(content || '').slice(0, 200)}`)
      }
    },
    {
      maxRetries: 2,
      timeoutMs: 180_000, // 3 min per attempt
      baseDelayMs: 3000,
      onRetry: (error, attempt) => {
        logger.warn('Gemini extraction retry', { attempt, error: error.message })
      },
    }
  )

  logger.info('Gemini extraction complete')

  // Garantir estrutura completa com defaults seguros
  const em = parsed.estado_mental_sessao || parsed.exame_mental || {}
  const pc = em.pensamento_conteudo
  const q = parsed.queixa_sintomatologia || {}

  return {
    resumo_sessao: {
      sintese: parsed.resumo_sessao?.sintese || '',
      pontos_principais: parsed.resumo_sessao?.pontos_principais || [],
      mudancas_observadas: parsed.resumo_sessao?.mudancas_observadas || [],
      proximos_passos: parsed.resumo_sessao?.proximos_passos || [],
    },
    queixa_sintomatologia: {
      queixa_sessao: q.queixa_sessao ?? null,
      sintomas_relatados: q.sintomas_relatados || [],
      intensidade: q.intensidade ?? null,
      frequencia: q.frequencia ?? null,
      gatilhos: q.gatilhos || q.fatores_agravantes || [],
      estrategias_que_ajudaram: q.estrategias_que_ajudaram || q.fatores_alivio || [],
      evidencias: Array.isArray(q.evidencias) ? q.evidencias.slice(0, 6) : [],
    },
    estado_mental_sessao: {
      humor: em.humor ?? null,
      afeto: em.afeto ?? null,
      pensamento_curso: em.pensamento_curso ?? null,
      pensamento_conteudo: {
        resumo: typeof pc === 'string' ? pc : (pc?.resumo ?? null),
        evidencias: Array.isArray(pc?.evidencias) ? pc.evidencias.slice(0, 2) : [],
      },
      insight: em.insight ?? null,
      juizo_critica: em.juizo_critica ?? null,
      sensopercepcao: em.sensopercepcao ?? null,
      risco_suicida: em.risco_suicida || 'não avaliado',
      risco_heteroagressivo: em.risco_heteroagressivo || 'não avaliado',
    },
    pessoas_mencionadas: Array.isArray(parsed.pessoas_mencionadas || parsed.pessoas)
      ? (parsed.pessoas_mencionadas || parsed.pessoas).map((p: any) => ({
          nome_usado: p.nome_usado || '',
          categoria: p.categoria || 'outros',
          tipo: p.tipo || 'outro',
          contexto: p.contexto ?? null,
          relevancia: p.relevancia || 'secundaria',
          nota: p.nota || p.mencao || '',
        }))
      : [],
    intervencoes: {
      objetivos_sessao: parsed.intervencoes?.objetivos_sessao ?? null,
      tecnicas_utilizadas: parsed.intervencoes?.tecnicas_utilizadas || [],
      temas_trabalhados: parsed.intervencoes?.temas_trabalhados || [],
      resposta_do_paciente: parsed.intervencoes?.resposta_do_paciente ?? null,
    },
    plano_metas: {
      progresso_relatado: Array.isArray(parsed.plano_metas?.progresso_relatado)
        ? parsed.plano_metas.progresso_relatado
        : [],
      tarefas_novas: parsed.plano_metas?.tarefas_novas || [],
      metas_acordadas: parsed.plano_metas?.metas_acordadas ?? null,
      foco_proxima_sessao: parsed.plano_metas?.foco_proxima_sessao ?? parsed.plano_metas?.proxima_sessao ?? null,
    },
    medicacao_sessao: {
      medicacoes_mencionadas: parsed.medicacao_sessao?.medicacoes_mencionadas ?? parsed.farmacologia?.medicacoes_mencionadas ?? null,
      adesao: parsed.medicacao_sessao?.adesao ?? parsed.farmacologia?.adesao ?? null,
      efeitos_relatados: parsed.medicacao_sessao?.efeitos_relatados ?? parsed.farmacologia?.efeitos_relatados ?? null,
      mudancas: parsed.medicacao_sessao?.mudancas ?? parsed.farmacologia?.mudancas ?? null,
      encaminhamentos: parsed.medicacao_sessao?.encaminhamentos ?? parsed.farmacologia?.encaminhamentos ?? null,
    },
    fatos_novos_biograficos: parsed.fatos_novos_biograficos || [],
    alertas: {
      urgentes: parsed.alertas?.urgentes || [],
      atencao: parsed.alertas?.atencao || [],
      acompanhar: parsed.alertas?.acompanhar || [],
    },
    evolucao_crp: parsed.evolucao_crp || '',
  }
}
