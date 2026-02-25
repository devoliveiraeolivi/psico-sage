/**
 * Ajuste cirúrgico de prontuário clínico via IA.
 * Recebe resumo atual + transcrição + instrução do terapeuta,
 * e retorna o resumo com APENAS as alterações solicitadas.
 */

import OpenAI from 'openai'
import type { SessaoResumo } from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'

const SYSTEM_PROMPT = `# PAPEL

Você é um assistente de documentação clínica em psicologia. Você receberá:
1. O prontuário atual (JSON) gerado a partir de uma sessão de terapia
2. A transcrição original da sessão
3. Instruções do terapeuta sobre o que ajustar

# REGRAS

1. **Mude APENAS o que o terapeuta pediu.** Todos os demais campos devem permanecer IDÊNTICOS ao prontuário atual. Não reescreva, não melhore, não reorganize campos que não foram mencionados.
2. **Autoridade clínica.** O terapeuta tem autoridade sobre o conteúdo. Se a instrução contradiz a transcrição, siga o terapeuta.
3. **Base factual.** Quando possível, use a transcrição para embasar os ajustes. Inclua citações literais do paciente entre aspas simples quando relevante.
4. **Mesma estrutura.** Retorne o JSON completo no mesmo formato, incluindo todos os campos — mesmo os não alterados.
5. **Linguagem técnica.** Mantenha terminologia CID-11/DSM-5. Humor com termos clínicos (ansioso, eutímico, lábil, disfórico).
6. **Campos vazios.** Se o terapeuta pedir para remover algo, use null para campos string ou [] para arrays.
7. **Se não houver nada a mudar**, retorne o prontuário idêntico e explique na descricao_ajustes que não encontrou alterações necessárias.

# FORMATO

Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown.
O JSON DEVE conter dois campos raiz: "prontuario" (o SessaoResumo completo) e "descricao_ajustes" (string em português descrevendo o que foi alterado — use bullet points com "•" para cada mudança).

{
  "descricao_ajustes": "• Campo X alterado de 'valor antigo' para 'valor novo'\n• Adicionado Y na seção Z",
  "prontuario": {
  "resumo": { "sintese": "...", "pontos_principais": ["..."] },
  "pontos_atencao": { "urgentes": [], "monitorar": [], "acompanhar_proximas": [] },
  "estrategia_plano": { "tarefas_novas": [], "metas_acordadas": null, "foco_proxima_sessao": null },
  "evolucao_cfp": "...",
  "queixas_sintomas": { "queixa_sessao": null, "sintomas_relatados": [], "intensidade": null, "frequencia": null, "fatores_agravantes": [], "fatores_alivio": [] },
  "estado_mental": { "humor": null, "afeto": null, "pensamento_curso": null, "pensamento_conteudo": null, "insight": null, "juizo_critica": null, "risco_suicida": "não avaliado", "risco_heteroagressivo": "não avaliado", "outras_observacoes": null },
  "mudancas_padroes": { "mudancas_positivas": [], "padroes_identificados": [], "crencas_centrais": [], "defesas_predominantes": [], "recursos_paciente": [], "persistencias": [] },
  "progresso_tarefas": [],
  "pessoas_centrais": [],
  "pessoas_secundarias": [],
  "farmacologia": { "medicacoes": null, "adesao": null, "efeitos_relatados": null, "mudancas": null, "encaminhamento_psiquiatrico": null },
  "intervencoes": { "tecnicas_utilizadas": [], "temas_trabalhados": [], "observacoes_processo": null },
  "anamnese": { "infancia": null, "adolescencia": null, "vida_adulta": null, "familia_origem": null, "relacionamentos": null, "marcos_vida": null, "historico_tratamentos": null }
  }
}`

export interface AdjustResult {
  resumo: SessaoResumo
  descricao_ajustes: string
}

export async function adjustResumo(
  currentResumo: SessaoResumo,
  transcricao: string,
  instrucoes: string,
): Promise<AdjustResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada')
  }

  const maxChars = 120000
  const textoTruncado = transcricao.length > maxChars
    ? transcricao.slice(0, maxChars) + '\n\n[... transcrição truncada por limite de tamanho]'
    : transcricao

  logger.info('OpenAI adjustment starting', { instructionLength: instrucoes.length })

  const openai = new OpenAI({ apiKey })

  const userMessage = `## Prontuário Atual
${JSON.stringify(currentResumo, null, 2)}

## Transcrição da Sessão
<transcricao>
${textoTruncado}
</transcricao>

## Instrução do Terapeuta
${instrucoes}

Aplique APENAS os ajustes solicitados e retorne o JSON completo atualizado.`

  const parsed = await withRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        max_completion_tokens: 12000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
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
      timeoutMs: 120_000,
      baseDelayMs: 3000,
      onRetry: (error, attempt) => {
        logger.warn('OpenAI adjustment retry', { attempt, error: error.message })
      },
    },
  )

  logger.info('OpenAI adjustment complete')

  const descricao_ajustes: string = parsed.descricao_ajustes || 'Ajuste realizado.'

  // O prontuário pode estar dentro de parsed.prontuario ou diretamente no parsed
  const pron = parsed.prontuario || parsed

  // Normalização safe-defaults (idêntica a extractResumo)
  const em = pron.estado_mental || {}
  const q = pron.queixas_sintomas || {}
  const mp = pron.mudancas_padroes || {}
  const farm = pron.farmacologia || {}
  const anam = pron.anamnese || {}

  const mapPessoa = (p: any) => ({
    nome_usado: p.nome_usado || '',
    categoria: p.categoria || 'outros',
    tipo: p.tipo || 'outro',
    mencao: p.mencao || p.nota || '',
  })

  return {
    descricao_ajustes,
    resumo: {
      resumo: {
        sintese: pron.resumo?.sintese || '',
        pontos_principais: pron.resumo?.pontos_principais || [],
      },
      pontos_atencao: {
        urgentes: pron.pontos_atencao?.urgentes || [],
        monitorar: pron.pontos_atencao?.monitorar || [],
        acompanhar_proximas: pron.pontos_atencao?.acompanhar_proximas || [],
      },
      estrategia_plano: {
        tarefas_novas: pron.estrategia_plano?.tarefas_novas || [],
        metas_acordadas: pron.estrategia_plano?.metas_acordadas ?? null,
        foco_proxima_sessao: pron.estrategia_plano?.foco_proxima_sessao ?? null,
      },
      evolucao_cfp: pron.evolucao_cfp || '',
      queixas_sintomas: {
        queixa_sessao: q.queixa_sessao ?? null,
        sintomas_relatados: q.sintomas_relatados || [],
        intensidade: q.intensidade ?? null,
        frequencia: q.frequencia ?? null,
        fatores_agravantes: q.fatores_agravantes || [],
        fatores_alivio: q.fatores_alivio || [],
      },
      estado_mental: {
        humor: em.humor ?? null,
        afeto: em.afeto ?? null,
        pensamento_curso: em.pensamento_curso ?? null,
        pensamento_conteudo: em.pensamento_conteudo ?? null,
        insight: em.insight ?? null,
        juizo_critica: em.juizo_critica ?? null,
        risco_suicida: em.risco_suicida || 'não avaliado',
        risco_heteroagressivo: em.risco_heteroagressivo || 'não avaliado',
        outras_observacoes: em.outras_observacoes ?? null,
      },
      mudancas_padroes: {
        mudancas_positivas: mp.mudancas_positivas || [],
        padroes_identificados: mp.padroes_identificados || [],
        crencas_centrais: mp.crencas_centrais || [],
        defesas_predominantes: mp.defesas_predominantes || [],
        recursos_paciente: mp.recursos_paciente || [],
        persistencias: mp.persistencias || [],
      },
      progresso_tarefas: Array.isArray(pron.progresso_tarefas)
        ? pron.progresso_tarefas
        : [],
      pessoas_centrais: Array.isArray(pron.pessoas_centrais)
        ? pron.pessoas_centrais.map(mapPessoa)
        : [],
      pessoas_secundarias: Array.isArray(pron.pessoas_secundarias)
        ? pron.pessoas_secundarias.map(mapPessoa)
        : [],
      farmacologia: {
        medicacoes: Array.isArray(farm.medicacoes) ? farm.medicacoes : null,
        adesao: farm.adesao ?? null,
        efeitos_relatados: farm.efeitos_relatados ?? null,
        mudancas: farm.mudancas ?? null,
        encaminhamento_psiquiatrico: farm.encaminhamento_psiquiatrico ?? null,
      },
      intervencoes: {
        tecnicas_utilizadas: pron.intervencoes?.tecnicas_utilizadas || [],
        temas_trabalhados: pron.intervencoes?.temas_trabalhados || [],
        observacoes_processo: pron.intervencoes?.observacoes_processo ?? null,
      },
      anamnese: {
        infancia: anam.infancia ?? null,
        adolescencia: anam.adolescencia ?? null,
        vida_adulta: anam.vida_adulta ?? null,
        familia_origem: anam.familia_origem ?? null,
        relacionamentos: anam.relacionamentos ?? null,
        marcos_vida: anam.marcos_vida ?? null,
        historico_tratamentos: anam.historico_tratamentos ?? null,
      },
    },
  }
}
