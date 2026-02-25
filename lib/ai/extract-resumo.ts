/**
 * Extração de prontuário clínico de transcrições de sessões de terapia.
 * Usa OpenAI GPT-5.2 para gerar SessaoResumo completo (normas CFP).
 */

import OpenAI from 'openai'
import type { SessaoResumo } from '@/lib/types'
import { withRetry } from '@/lib/utils/retry'
import { logger } from '@/lib/utils/logger'

const MODEL = 'gpt-5.2'

const SYSTEM_PROMPT = `# PAPEL

Você é um documentador clínico especializado em psicologia. Analise transcrições de sessões de psicoterapia e extraia informações para prontuário técnico seguindo normas do CFP.

# PRINCÍPIOS

1. **Extraia, não crie.** Registre apenas o que está explícito na transcrição.
2. **Não mencionado = null ou [].** Campos vazios são normais — uma sessão típica preenche 30-50% dos campos.
3. **Citações inline.** Inclua falas literais do paciente entre aspas simples nos campos relevantes. Ex: pensamentos de inadequação ('sou uma fraude').
4. **Linguagem técnica.** Use terminologia CID-11/DSM-5 quando aplicável. Humor com termos clínicos (ansioso, eutímico, lábil, disfórico), não coloquiais.
5. **Farmacologia e encaminhamentos referem-se APENAS ao paciente em atendimento**, nunca a terceiros.
6. **Anamnese = dados biográficos NOVOS do paciente.** Dinâmicas atuais já estão em outras seções. História de terceiros vai em pessoas. Eventos recentes não são anamnese.

---

# ESTRUTURA

Duas camadas: **PRINCIPAL** (leitura rápida) e **DADOS** (consulta detalhada).

## PRINCIPAL

### resumo
- **sintese**: 1-2 frases com o foco principal da sessão.
- **pontos_principais**: 3-6 bullets com os acontecimentos/descobertas mais relevantes.

### pontos_atencao
- **urgentes**: Risco iminente (suicídio, violência, abuso). Se nenhum = [].
- **monitorar**: Pontos importantes não urgentes. Se nenhum = [].
- **acompanhar_proximas**: Questões para próximas sessões. Se nenhum = [].

### estrategia_plano
- **tarefas_novas**: Orientações e acordos comportamentais desta sessão — inclui exercícios formais, mas também orientações de manejo (ex: "retirar-se do ambiente em situações de agressão"), reflexões sugeridas e limites a estabelecer. Se nenhuma = [].
- **metas_acordadas**: Metas terapêuticas estabelecidas/reafirmadas. Se nenhuma = null.
- **foco_proxima_sessao**: Se não definido = null.

### evolucao_cfp
Texto de evolução padrão CFP. Parágrafo único, 5-12 linhas. Adapte conforme o tipo de sessão (crise, primeira sessão, devolutiva, follow-up).

Estrutura sugerida: estado geral → queixa/progresso → observações do estado mental → temas trabalhados → intervenções → tarefas → plano → avaliação de risco.

Regras: linguagem técnica e impessoal; prefira termos formais (genitor/genitora, cônjuge, fraterno) a coloquiais; sem nomes completos de terceiros; sempre incluir avaliação de risco ao final.

---

## DADOS

### queixas_sintomas
- **queixa_sessao**: Motivo principal desta sessão (1-2 frases). null se não claro.
- **sintomas_relatados**: Lista completa — físicos E psicológicos, termos clínicos, com citação inline. Ex: "Parestesia ('minha mão começou a formigar')". [] se não mencionou.
- **intensidade**: 0-10, apenas se mencionado. null se não.
- **frequencia**: Ex: "diariamente", "2-3x por semana". null se não.
- **fatores_agravantes**: Situações, pensamentos ou dinâmicas que pioram. [] se não.
- **fatores_alivio**: O que ajuda — inclui estratégias usadas, apoio de pessoas, atividades de autocuidado mencionadas positivamente. [] se não.

### estado_mental
Baseie-se APENAS no observável/relatado.

- **humor**: Termo clínico. Pode combinar. null se não observável.
- **afeto**: "congruente" | "incongruente" | "embotado" | "expansivo" | null.
- **pensamento_curso**: "normal" | "acelerado" | "lentificado" | "desorganizado" | null.
- **pensamento_conteudo**: Crenças/ideias predominantes com citações inline. null se não observável.
- **insight**: "presente" | "parcial" | "ausente" | null.
- **juizo_critica**: "preservados" | "parcialmente preservados" | "prejudicados" | null.
- **risco_suicida**: "ausente" | "ideação passiva" | "ideação ativa" | "plano estruturado" | "não avaliado".
- **risco_heteroagressivo**: "ausente" | "presente" | "não avaliado".
- **outras_observacoes**: Qualquer outra observação relevante (aparência, consciência, orientação, atenção, memória, sensopercepção). null se nada adicional.

### mudancas_padroes
- **mudancas_positivas**: Insights, aplicação de técnicas, mudanças de comportamento. [] se nenhuma.
- **padroes_identificados**: Padrões de pensamento/comportamento observados. [] se nenhum.
- **crencas_centrais**: Crenças nucleares expressas, com citação inline. [] se nenhuma.
- **defesas_predominantes**: Mecanismos de defesa observados. [] se nenhum.
- **recursos_paciente**: Forças e recursos identificados. [] se nenhum.
- **persistencias**: Sintomas/padrões que se mantêm sem melhora. [] se nenhum.

### progresso_tarefas
Status de tarefas/orientações de sessões anteriores. Inclui tanto tarefas formais quanto comportamentos que o paciente relate ter tentado implementar a partir de discussões prévias (ex: "tentei impor limite como combinamos", "li o livro que você sugeriu").

Formato: [{"meta": "...", "status": "concluida|parcial|nao_realizada|em_andamento", "observacao": "..."}]

- **meta**: Nome CURTO da tarefa (3-6 palavras). Apenas o rótulo identificador, sem explicações, contexto ou instruções terapêuticas entre parênteses. Ex: "Verificação de fatos", "Leitura do livro sugerido", "Estabelecimento de limites".
- **observacao**: Aqui sim coloque todo o detalhe — o que o paciente relatou, como executou, dificuldades, contexto terapêutico.

[] se primeira sessão ou nenhuma menção a ações de sessões anteriores.

### pessoas_centrais
Pessoas cuja dinâmica com o paciente foi ATIVAMENTE TRABALHADA pelo terapeuta nesta sessão (houve intervenção, psicoeducação ou planejamento de ação sobre essa relação). Máximo 6.

Teste: "O terapeuta interveio sobre essa relação?" Se não → pessoas_secundarias.

Para cada: nome_usado, categoria (familia_origem|familia_constituida|trabalho|social|profissional_saude|outros), tipo, mencao (contexto relacional E qual intervenção terapêutica foi realizada sobre essa dinâmica).

[] se nenhuma.

### pessoas_secundarias
Todas as demais pessoas mencionadas — contexto, narrativa, pano de fundo.

Para cada: nome_usado, categoria, tipo, mencao (resumo breve, 1-2 frases).

[] se nenhuma.

### farmacologia
APENAS do paciente. Se não falou de medicação do paciente = tudo null.

- **medicacoes**: [{"nome": "...", "dose": "..." ou null}]. null se não.
- **adesao**: "boa" | "irregular" | "abandonou". null se não.
- **efeitos_relatados**: null se não.
- **mudancas**: null se não.
- **encaminhamento_psiquiatrico**: null se não.

### intervencoes
- **tecnicas_utilizadas**: Lista com detalhes. Ex: "Reestruturação cognitiva (busca de evidências)". [] se não identificável.
- **temas_trabalhados**: Assuntos principais trabalhados na sessão. Para cada tema, inclua uma citação literal do paciente ou trecho da transcrição que evidencie o tema. Formato: [{"tema": "Nome do tema", "evidencia": "citação literal entre aspas simples ou trecho que comprova"}]. Ex: [{"tema": "Invalidação emocional intrafamiliar", "evidencia": "'Minha mãe disse que eu tava chorando à toa'"}]. [] se nenhum.
- **observacoes_processo**: Notas sobre engajamento, dinâmica transferencial, aspectos do processo. null se nenhuma.

### anamnese
Informações biográficas NOVAS do paciente. Não repita dinâmicas atuais (já estão em outras seções) nem registre história de terceiros.

- **infancia**: Memórias/eventos da infância DO PACIENTE. null se não.
- **adolescencia**: null se não.
- **vida_adulta**: null se não.
- **familia_origem**: Dados históricos sobre a criação/dinâmica da família de origem do paciente. null se não.
- **relacionamentos**: null se não.
- **marcos_vida**: null se não.
- **historico_tratamentos**: null se não.

---

# FORMATO

Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown:

{
  "resumo": {
    "sintese": "...",
    "pontos_principais": ["..."]
  },
  "pontos_atencao": {
    "urgentes": [],
    "monitorar": [],
    "acompanhar_proximas": []
  },
  "estrategia_plano": {
    "tarefas_novas": [],
    "metas_acordadas": null,
    "foco_proxima_sessao": null
  },
  "evolucao_cfp": "...",
  "queixas_sintomas": {
    "queixa_sessao": null,
    "sintomas_relatados": [],
    "intensidade": null,
    "frequencia": null,
    "fatores_agravantes": [],
    "fatores_alivio": []
  },
  "estado_mental": {
    "humor": null,
    "afeto": null,
    "pensamento_curso": null,
    "pensamento_conteudo": null,
    "insight": null,
    "juizo_critica": null,
    "risco_suicida": "não avaliado",
    "risco_heteroagressivo": "não avaliado",
    "outras_observacoes": null
  },
  "mudancas_padroes": {
    "mudancas_positivas": [],
    "padroes_identificados": [],
    "crencas_centrais": [],
    "defesas_predominantes": [],
    "recursos_paciente": [],
    "persistencias": []
  },
  "progresso_tarefas": [],
  "pessoas_centrais": [],
  "pessoas_secundarias": [],
  "farmacologia": {
    "medicacoes": null,
    "adesao": null,
    "efeitos_relatados": null,
    "mudancas": null,
    "encaminhamento_psiquiatrico": null
  },
  "intervencoes": {
    "tecnicas_utilizadas": [],
    "temas_trabalhados": [],
    "observacoes_processo": null
  },
  "anamnese": {
    "infancia": null,
    "adolescencia": null,
    "vida_adulta": null,
    "familia_origem": null,
    "relacionamentos": null,
    "marcos_vida": null,
    "historico_tratamentos": null
  }
}`

export async function extractResumo(transcricao: string): Promise<SessaoResumo> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada')
  }

  // GPT-5.2 tem janela de contexto grande, mas truncamos por segurança
  const maxChars = 120000
  const textoTruncado = transcricao.length > maxChars
    ? transcricao.slice(0, maxChars) + '\n\n[... transcrição truncada por limite de tamanho]'
    : transcricao

  logger.info('OpenAI extraction starting', { transcriptionLength: textoTruncado.length })

  const openai = new OpenAI({ apiKey })

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
            content: `Analise a seguinte transcrição de sessão de terapia e extraia os dados estruturados para prontuário clínico:\n\n<transcricao>\n${textoTruncado}\n</transcricao>`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content

      if (!content) {
        throw new Error('OpenAI retornou resposta vazia')
      }

      try {
        return JSON.parse(content)
      } catch (parseError) {
        throw new Error(`OpenAI retornou JSON inválido: ${(content || '').slice(0, 200)}`)
      }
    },
    {
      maxRetries: 2,
      timeoutMs: 180_000, // 3 min per attempt
      baseDelayMs: 3000,
      onRetry: (error, attempt) => {
        logger.warn('OpenAI extraction retry', { attempt, error: error.message })
      },
    }
  )

  logger.info('OpenAI extraction complete')

  // Garantir estrutura completa com defaults seguros
  const em = parsed.estado_mental || {}
  const q = parsed.queixas_sintomas || {}
  const mp = parsed.mudancas_padroes || {}
  const farm = parsed.farmacologia || {}
  const anam = parsed.anamnese || {}

  const mapPessoa = (p: any) => ({
    nome_usado: p.nome_usado || '',
    categoria: p.categoria || 'outros',
    tipo: p.tipo || 'outro',
    mencao: p.mencao || p.nota || '',
  })

  return {
    // === PRINCIPAL ===
    resumo: {
      sintese: parsed.resumo?.sintese || '',
      pontos_principais: parsed.resumo?.pontos_principais || [],
    },
    pontos_atencao: {
      urgentes: parsed.pontos_atencao?.urgentes || [],
      monitorar: parsed.pontos_atencao?.monitorar || [],
      acompanhar_proximas: parsed.pontos_atencao?.acompanhar_proximas || [],
    },
    estrategia_plano: {
      tarefas_novas: parsed.estrategia_plano?.tarefas_novas || [],
      metas_acordadas: parsed.estrategia_plano?.metas_acordadas ?? null,
      foco_proxima_sessao: parsed.estrategia_plano?.foco_proxima_sessao ?? null,
    },
    evolucao_cfp: parsed.evolucao_cfp || '',

    // === DADOS ===
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
    progresso_tarefas: Array.isArray(parsed.progresso_tarefas)
      ? parsed.progresso_tarefas
      : [],
    pessoas_centrais: Array.isArray(parsed.pessoas_centrais)
      ? parsed.pessoas_centrais.map(mapPessoa)
      : [],
    pessoas_secundarias: Array.isArray(parsed.pessoas_secundarias)
      ? parsed.pessoas_secundarias.map(mapPessoa)
      : [],
    farmacologia: {
      medicacoes: Array.isArray(farm.medicacoes) ? farm.medicacoes : null,
      adesao: farm.adesao ?? null,
      efeitos_relatados: farm.efeitos_relatados ?? null,
      mudancas: farm.mudancas ?? null,
      encaminhamento_psiquiatrico: farm.encaminhamento_psiquiatrico ?? null,
    },
    intervencoes: {
      tecnicas_utilizadas: parsed.intervencoes?.tecnicas_utilizadas || [],
      temas_trabalhados: parsed.intervencoes?.temas_trabalhados || [],
      observacoes_processo: parsed.intervencoes?.observacoes_processo ?? null,
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
  }
}
