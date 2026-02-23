// Tipos gerados a partir do schema do Supabase
// Podem ser regenerados com: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// TIPOS DAS TABELAS
// ============================================

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nome: string | null
          crp: string | null
          telefone: string | null
          google_refresh_token: string | null
          google_email: string | null
          google_connected_at: string | null
          hora_inicio_atendimento: number
          hora_fim_atendimento: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nome?: string | null
          crp?: string | null
          telefone?: string | null
          google_refresh_token?: string | null
          google_email?: string | null
          google_connected_at?: string | null
          hora_inicio_atendimento?: number
          hora_fim_atendimento?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string | null
          crp?: string | null
          telefone?: string | null
          google_refresh_token?: string | null
          google_email?: string | null
          google_connected_at?: string | null
          hora_inicio_atendimento?: number
          hora_fim_atendimento?: number
          created_at?: string
          updated_at?: string
        }
      }
      pacientes: {
        Row: {
          id: string
          user_id: string
          nome: string
          email: string | null
          telefone: string | null
          data_nascimento: string | null
          data_inicio_terapia: string | null
          data_fim_terapia: string | null
          status: PacienteStatus
          resumo: PacienteResumo
          historico: PacienteHistorico
          notas: string | null
          meet_link: string | null
          meet_calendar_event_id: string | null
          frequencia_sessoes: string | null
          dia_semana_preferido: number | null
          hora_preferida: string | null
          duracao_padrao: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          email?: string | null
          telefone?: string | null
          data_nascimento?: string | null
          data_inicio_terapia?: string | null
          data_fim_terapia?: string | null
          status?: PacienteStatus
          resumo?: PacienteResumo
          historico?: PacienteHistorico
          notas?: string | null
          meet_link?: string | null
          meet_calendar_event_id?: string | null
          frequencia_sessoes?: string | null
          dia_semana_preferido?: number | null
          hora_preferida?: string | null
          duracao_padrao?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          email?: string | null
          telefone?: string | null
          data_nascimento?: string | null
          data_inicio_terapia?: string | null
          data_fim_terapia?: string | null
          status?: PacienteStatus
          resumo?: PacienteResumo
          historico?: PacienteHistorico
          notas?: string | null
          meet_link?: string | null
          meet_calendar_event_id?: string | null
          frequencia_sessoes?: string | null
          dia_semana_preferido?: number | null
          hora_preferida?: string | null
          duracao_padrao?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessoes: {
        Row: {
          id: string
          paciente_id: string
          numero_sessao: number | null
          data_hora: string
          duracao_prevista: number
          duracao_real: number | null
          status: SessaoStatus
          calendar_event_id: string | null
          fathom_call_id: string | null
          // Conteúdo IA
          preparacao: SessaoPreparacao | null
          transcricao: SessaoTranscricao | null
          prontuario: ConteudoClinico | null
          prontuario_status: ProntuarioStatus | null
          prontuario_aprovado_em: string | null
          resumo: SessaoResumo | null
          modelo_ia_usado: string | null
          // Legacy
          integra: string | null
          // Áudio
          audio_url: string | null
          audio_duracao_segundos: number | null
          meet_link: string | null
          recording_status: RecordingStatus | null
          processing_error: string | null
          // Meta
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          paciente_id: string
          numero_sessao?: number | null
          data_hora: string
          duracao_prevista?: number
          duracao_real?: number | null
          status?: SessaoStatus
          calendar_event_id?: string | null
          fathom_call_id?: string | null
          preparacao?: SessaoPreparacao | null
          transcricao?: SessaoTranscricao | null
          prontuario?: ConteudoClinico | null
          prontuario_status?: ProntuarioStatus | null
          prontuario_aprovado_em?: string | null
          resumo?: SessaoResumo | null
          modelo_ia_usado?: string | null
          integra?: string | null
          audio_url?: string | null
          audio_duracao_segundos?: number | null
          meet_link?: string | null
          recording_status?: RecordingStatus | null
          processing_error?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          paciente_id?: string
          numero_sessao?: number | null
          data_hora?: string
          duracao_prevista?: number
          duracao_real?: number | null
          status?: SessaoStatus
          calendar_event_id?: string | null
          fathom_call_id?: string | null
          preparacao?: SessaoPreparacao | null
          transcricao?: SessaoTranscricao | null
          prontuario?: ConteudoClinico | null
          prontuario_status?: ProntuarioStatus | null
          prontuario_aprovado_em?: string | null
          resumo?: SessaoResumo | null
          modelo_ia_usado?: string | null
          integra?: string | null
          audio_url?: string | null
          audio_duracao_segundos?: number | null
          meet_link?: string | null
          recording_status?: RecordingStatus | null
          processing_error?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      sessoes_com_paciente: {
        Row: {
          id: string
          paciente_id: string
          paciente_nome: string
          user_id: string
          numero_sessao: number | null
          data_hora: string
          duracao_prevista: number
          duracao_real: number | null
          status: SessaoStatus
          preparacao: SessaoPreparacao | null
          resumo: SessaoResumo | null
        }
      }
      sessoes_hoje: {
        Row: {
          id: string
          paciente_id: string
          paciente_nome: string
          paciente_resumo: PacienteResumo
          user_id: string
          data_hora: string
          status: SessaoStatus
          preparacao: SessaoPreparacao | null
        }
      }
    }
  }
}

// ============================================
// ENUMS
// ============================================

export type PacienteStatus = 'ativo' | 'pausado' | 'encerrado'

export type SessaoStatus =
  | 'agendada'
  | 'em_andamento'
  | 'aguardando_aprovacao'
  | 'realizada'
  | 'falta'
  | 'cancelada'
  | 'remarcada'

export type RecordingStatus =
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'processing'
  | 'done'
  | 'error'

export type ProntuarioStatus = 'rascunho_ia' | 'editado' | 'aprovado'

// ============================================
// TRANSCRIÇÃO ESTRUTURADA (JSONB em sessoes.transcricao)
// ============================================

export interface SessaoTranscricao {
  arquivo: string | null
  engine: string               // 'groq', 'deepgram', 'whisper', 'legacy'
  idioma: string               // default 'pt'
  diarizacao: boolean
  duracao_total_segundos: number | null
  segmentos: TranscricaoSegmento[]
  texto_completo?: string      // concatenação dos segmentos (para legacy/busca)
}

export interface TranscricaoSegmento {
  inicio: number
  fim: number
  texto: string
  speaker?: string
}

// ============================================
// CONTEÚDO CLÍNICO COMPLETO (11 seções do prompt)
// Espelha exatamente o output JSON da IA
// Armazenado em sessoes.prontuario
// ============================================

export interface ConteudoClinico {
  resumo_sessao: {
    sintese: string
    pontos_principais: string[]
    mudancas_observadas: string[]
    proximos_passos: string[]
  }
  queixa_sintomatologia: {
    queixa_sessao: string | null
    sintomas_relatados: string[]
    intensidade: number | null
    frequencia: string | null
    fatores_agravantes: string[]
    fatores_alivio: string[]
  }
  anamnese: {
    infancia: string | null
    adolescencia: string | null
    vida_adulta: string | null
    familia_origem: string | null
    relacionamentos: string | null
    marcos_vida: string | null
    historico_tratamentos: string | null
  }
  exame_mental: {
    aparencia: string | null
    consciencia: string | null
    orientacao: string | null
    atencao: string | null
    memoria: string | null
    humor: string | null
    afeto: string | null
    pensamento_curso: string | null
    pensamento_conteudo: string | null
    sensopercepcao: string | null
    juizo_critica: string | null
    insight: string | null
    risco_suicida: string
    risco_heteroagressivo: string
  }
  formulacao: {
    hipoteses: Array<{ codigo_cid?: string; descricao: string }> | null
    fatores_predisponentes: string[]
    fatores_precipitantes: string[]
    fatores_mantenedores: string[]
    padroes_identificados: string[]
    crencas_centrais: string[]
    defesas_predominantes: string[]
    recursos: string[]
    transferencia: string | null
  }
  pessoas: Array<{
    nome_usado: string
    categoria: string
    tipo: string
    mencao: string
  }>
  intervencoes: {
    tecnicas_utilizadas: string[]
    temas_trabalhados: string[]
    objetivos_sessao: string | null
    observacoes: string | null
  }
  plano_metas: {
    progresso_relatado: Array<{
      meta: string
      status: 'concluida' | 'em_andamento' | 'nao_realizada' | 'parcial'
      observacao: string
    }>
    tarefas_novas: string[]
    metas_acordadas: string | null
    proxima_sessao: string | null
  }
  farmacologia: {
    medicacoes_mencionadas: Array<{ nome: string; dose?: string }> | null
    adesao: string | null
    efeitos_relatados: string[] | null
    mudancas: string | null
    encaminhamentos: string | null
  }
  evolucao_crp: string
  alertas: {
    urgentes: string[]
    atencao: string[]
    acompanhar: string[]
  }
}

// ============================================
// TIPOS DOS JSONB (pacientes.resumo)
// Estado atual — sobrescrito pela IA #2 após cada sessão
// ============================================

export interface PacienteResumo {
  // Campos base
  sintese?: string
  humor?: string
  momento?: string

  // Diagnósticos (string para UI existente)
  diagnosticos?: string

  // Clínico
  conflitos?: string
  traumas?: string
  padroes?: string
  gatilhos?: string
  recursos?: string
  alertas?: string
  tarefas?: string

  // Enriquecido pelo prontuário clínico
  exame_mental_resumo?: {
    humor: string
    afeto?: string
    insight?: string
  }
  medicamentos_atuais?: Array<{
    nome: string
    dosagem?: string
    adesao?: string
  }>
  risco?: {
    suicida: string
    heteroagressivo: string
    ultima_avaliacao: string
  }
  pessoas_chave?: Array<{
    nome: string
    tipo: string
    categoria?: string
  }>
  temas_recorrentes?: string[]
  crencas_nucleares?: string[]
  recursos_paciente?: string[]
  alertas_ativos?: Array<{
    tipo: string
    msg: string
  }>

  // Referência
  ultima_sessao_id?: string
  ultima_atualizacao?: string
}

// ============================================
// TIPOS DOS JSONB (pacientes.historico)
// Evolução longitudinal — append-only
// ============================================

export interface HistoricoItem {
  data: string
  sessao_id: string
  valor: string
  acao?: 'resolvido' | 'concluida' | 'adicionado' | 'atualizado'
}

export interface PacienteHistorico {
  // Tracks base
  humor?: HistoricoItem[]
  conflitos?: HistoricoItem[]
  traumas?: HistoricoItem[]
  insights?: HistoricoItem[]
  tarefas?: HistoricoItem[]
  marcos?: HistoricoItem[]
  alertas?: HistoricoItem[]

  // Tracks longitudinais
  diagnosticos?: HistoricoItem[]
  medicamentos?: HistoricoItem[]
  risco_suicida?: HistoricoItem[]
  sintomas?: HistoricoItem[]
  metas?: HistoricoItem[]

  [key: string]: HistoricoItem[] | undefined
}

// ============================================
// TIPOS DOS JSONB (sessoes)
// ============================================

// Preparação pré-sessão (gerada pela IA)
export interface SessaoPreparacao {
  contexto?: string
  pontos_retomar?: string[]
  tarefas_pendentes?: string[]
  sugestoes?: string[]
  perguntas_sugeridas?: string[]
  alertas?: string[]
}

// Prontuário clínico pós-sessão (normas CFP) — v2
// Session AI: extração pura por sessão, sem contexto longitudinal

export interface Evidencia {
  trecho: string
  quem: 'paciente' | 'terapeuta'
}

export interface EvidenciaQueixa extends Evidencia {
  campo: 'queixa' | 'sintomas' | 'gatilhos' | 'estrategias'
}

export interface SessaoResumo {
  resumo_sessao: {
    sintese: string
    pontos_principais: string[]
    mudancas_observadas: string[]
    proximos_passos: string[]
  }
  queixa_sintomatologia: {
    queixa_sessao: string | null
    sintomas_relatados: string[]
    intensidade: number | null
    frequencia: string | null
    gatilhos: string[]
    estrategias_que_ajudaram: string[]
    evidencias: EvidenciaQueixa[]
  }
  estado_mental_sessao: {
    humor: string | null
    afeto: string | null
    pensamento_curso: string | null
    pensamento_conteudo: {
      resumo: string | null
      evidencias: Evidencia[]
    }
    insight: string | null
    juizo_critica: string | null
    sensopercepcao: string | null
    risco_suicida: string
    risco_heteroagressivo: string
  }
  pessoas_mencionadas: PessoaMencionada[]
  intervencoes: {
    objetivos_sessao: string | null
    tecnicas_utilizadas: string[]
    temas_trabalhados: string[]
    resposta_do_paciente: string | null
  }
  plano_metas: {
    progresso_relatado: ProgressoMeta[]
    tarefas_novas: string[]
    metas_acordadas: string | null
    foco_proxima_sessao: string | null
  }
  medicacao_sessao: {
    medicacoes_mencionadas: string | null
    adesao: string | null
    efeitos_relatados: string | null
    mudancas: string | null
    encaminhamentos: string | null
  }
  fatos_novos_biograficos: string[]
  alertas: {
    urgentes: string[]
    atencao: string[]
    acompanhar: string[]
  }
  evolucao_crp: string
}

export interface PessoaMencionada {
  nome_usado: string
  categoria: 'familia_origem' | 'familia_constituida' | 'trabalho' | 'social' | 'profissional_saude' | 'outros'
  tipo: string
  contexto: string | null
  relevancia: 'central' | 'secundaria'
  nota: string
}

export interface ProgressoMeta {
  meta: string
  status: 'concluida' | 'em_andamento' | 'nao_realizada' | 'parcial'
  observacao: string
}

// ============================================
// TIPOS DE TODOS (TAREFAS E ALERTAS)
// ============================================

export type TodoTipo = 'tarefa' | 'alerta'
export type TodoResponsavel = 'psico' | 'ia' | 'sistema'
export type TodoDestinatario = 'psico' | 'paciente'
export type TodoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'
export type TodoStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'arquivada'

export interface Todo {
  id: string
  user_id: string
  paciente_id: string | null
  sessao_id: string | null
  tipo: TodoTipo
  responsavel: TodoResponsavel
  destinatario: TodoDestinatario
  titulo: string
  descricao: string | null
  prioridade: TodoPrioridade
  status: TodoStatus
  data_limite: string | null
  data_conclusao: string | null
  created_at: string
  updated_at: string
}

export type NovoTodo = Omit<Todo, 'id' | 'created_at' | 'updated_at'>
export type AtualizaTodo = Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>

// ============================================
// TIPOS AUXILIARES
// ============================================

export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']
export type Sessao = Database['public']['Tables']['sessoes']['Row']

export type NovoPaciente = Database['public']['Tables']['pacientes']['Insert']
export type NovaSessao = Database['public']['Tables']['sessoes']['Insert']

export type AtualizaPaciente = Database['public']['Tables']['pacientes']['Update']
export type AtualizaSessao = Database['public']['Tables']['sessoes']['Update']

export type SessaoComPaciente = Database['public']['Views']['sessoes_com_paciente']['Row']
export type SessaoHoje = Database['public']['Views']['sessoes_hoje']['Row']
