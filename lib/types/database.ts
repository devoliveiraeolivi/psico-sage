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
          video_plataforma: VideoPlataforma
          video_modo_link: VideoModoLink
          video_link_fixo: string | null
          video_plataforma_nome: string | null
          onboarding_completed: boolean
          setup_completed: boolean
          page_tours_completed: string[]
          atendimento_hibrido: boolean
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
          video_plataforma?: VideoPlataforma
          video_modo_link?: VideoModoLink
          video_link_fixo?: string | null
          video_plataforma_nome?: string | null
          onboarding_completed?: boolean
          setup_completed?: boolean
          page_tours_completed?: string[]
          atendimento_hibrido?: boolean
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
          video_plataforma?: VideoPlataforma
          video_modo_link?: VideoModoLink
          video_link_fixo?: string | null
          video_plataforma_nome?: string | null
          onboarding_completed?: boolean
          setup_completed?: boolean
          page_tours_completed?: string[]
          atendimento_hibrido?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
          video_link: string | null
          video_calendar_event_id: string | null
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
          video_link?: string | null
          video_calendar_event_id?: string | null
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
          video_link?: string | null
          video_calendar_event_id?: string | null
          frequencia_sessoes?: string | null
          dia_semana_preferido?: number | null
          hora_preferida?: string | null
          duracao_padrao?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pacientes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          }
        ]
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
          resumo: SessaoResumo | null
          modelo_ia_usado: string | null
          // Transcrição
          integra: string | null
          // Áudio
          audio_url: string | null
          audio_duracao_segundos: number | null
          video_link: string | null
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
          resumo?: SessaoResumo | null
          modelo_ia_usado?: string | null
          integra?: string | null
          audio_url?: string | null
          audio_duracao_segundos?: number | null
          video_link?: string | null
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
          resumo?: SessaoResumo | null
          modelo_ia_usado?: string | null
          integra?: string | null
          audio_url?: string | null
          audio_duracao_segundos?: number | null
          video_link?: string | null
          recording_status?: RecordingStatus | null
          processing_error?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessoes_paciente_id_fkey'
            columns: ['paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
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
    Functions: {
      approve_sessao: {
        Args: {
          p_sessao_id: string
          p_paciente_id: string
          p_paciente_resumo: string | null
          p_paciente_historico: string | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
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

export type VideoPlataforma = 'nenhum' | 'google_meet' | 'externo'
export type VideoModoLink = 'por_paciente' | 'link_fixo'


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

// Prontuário clínico pós-sessão (normas CFP) — v3
// Estrutura: PRINCIPAL (leitura rápida) + DADOS (consulta detalhada)

export type PessoaCategoria = 'familia_origem' | 'familia_constituida' | 'trabalho' | 'social' | 'profissional_saude' | 'outros'

export interface PessoaCentral {
  nome_usado: string
  categoria: PessoaCategoria
  tipo: string
  mencao: string
}

export interface PessoaSecundaria {
  nome_usado: string
  categoria?: PessoaCategoria
  tipo: string
  mencao: string
}

export interface ProgressoMeta {
  meta: string
  status: 'concluida' | 'em_andamento' | 'nao_realizada' | 'parcial'
  observacao: string
}

export interface Medicacao {
  nome: string
  dose: string | null
}

export interface SessaoResumo {
  // === PRINCIPAL ===
  resumo: {
    sintese: string
    pontos_principais: string[]
  }
  pontos_atencao: {
    urgentes: string[]
    monitorar: string[]
    acompanhar_proximas: string[]
  }
  estrategia_plano: {
    tarefas_novas: string[]
    metas_acordadas: string | null
    foco_proxima_sessao: string | null
  }
  evolucao_cfp: string

  // === DADOS ===
  queixas_sintomas: {
    queixa_sessao: string | null
    sintomas_relatados: string[]
    intensidade: number | null
    frequencia: string | null
    fatores_agravantes: string[]
    fatores_alivio: string[]
  }
  estado_mental: {
    humor: string | null
    afeto: 'congruente' | 'incongruente' | 'embotado' | 'expansivo' | null
    pensamento_curso: 'normal' | 'acelerado' | 'lentificado' | 'desorganizado' | null
    pensamento_conteudo: string | null
    insight: 'presente' | 'parcial' | 'ausente' | null
    juizo_critica: 'preservados' | 'parcialmente preservados' | 'prejudicados' | null
    risco_suicida: 'ausente' | 'ideação passiva' | 'ideação ativa' | 'plano estruturado' | 'não avaliado'
    risco_heteroagressivo: 'ausente' | 'presente' | 'não avaliado'
    outras_observacoes: string | null
  }
  mudancas_padroes: {
    mudancas_positivas: string[]
    padroes_identificados: string[]
    crencas_centrais: string[]
    defesas_predominantes: string[]
    recursos_paciente: string[]
    persistencias: string[]
  }
  progresso_tarefas: ProgressoMeta[]
  pessoas_centrais: PessoaCentral[]
  pessoas_secundarias: PessoaSecundaria[]
  farmacologia: {
    medicacoes: Medicacao[] | null
    adesao: 'boa' | 'irregular' | 'abandonou' | null
    efeitos_relatados: string | null
    mudancas: string | null
    encaminhamento_psiquiatrico: string | null
  }
  intervencoes: {
    tecnicas_utilizadas: string[]
    temas_trabalhados: (string | { tema: string; evidencia: string })[]
    observacoes_processo: string | null
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
}

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

export type SessaoHoje = Database['public']['Views']['sessoes_hoje']['Row']
