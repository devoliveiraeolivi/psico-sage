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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nome?: string | null
          crp?: string | null
          telefone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string | null
          crp?: string | null
          telefone?: string | null
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
          preparacao: SessaoPreparacao | null
          resumo: SessaoResumo | null
          integra: string | null
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
          integra?: string | null
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
          integra?: string | null
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
  | 'aguardando_aprovacao'
  | 'realizada'
  | 'falta'
  | 'cancelada'
  | 'remarcada'

// ============================================
// TIPOS DOS JSONB
// ============================================

// Estado atual do paciente (sobrescrito após cada sessão)
export interface PacienteResumo {
  sintese?: string
  humor?: string
  momento?: string
  diagnosticos?: string
  conflitos?: string
  traumas?: string
  padroes?: string
  gatilhos?: string
  recursos?: string
  alertas?: string
  tarefas?: string
}

// Item do histórico evolutivo
export interface HistoricoItem {
  data: string // ISO date
  sessao_id: string
  valor: string
  acao?: 'resolvido' | 'concluida' | 'adicionado' | 'atualizado'
}

// Histórico evolutivo por tema (append-only)
export interface PacienteHistorico {
  humor?: HistoricoItem[]
  conflitos?: HistoricoItem[]
  traumas?: HistoricoItem[]
  insights?: HistoricoItem[]
  tarefas?: HistoricoItem[]
  marcos?: HistoricoItem[]
  alertas?: HistoricoItem[]
  [key: string]: HistoricoItem[] | undefined // Permite temas dinâmicos
}

// Preparação pré-sessão (gerada pela IA)
export interface SessaoPreparacao {
  contexto?: string
  pontos_retomar?: string[]
  tarefas_pendentes?: string[]
  sugestoes?: string[]
  perguntas_sugeridas?: string[]
  alertas?: string[]
}

// Resumo pós-sessão (gerado pela IA)
export interface SessaoResumo {
  sintese?: string
  humor?: string
  temas?: string[]
  insights?: string[]
  pontos_importantes?: string[]
  tarefas?: string[]
  alertas?: string[]
}

// ============================================
// TIPOS DE TODOS (TAREFAS E ALERTAS)
// ============================================

export type TodoTipo = 'tarefa' | 'alerta'
export type TodoResponsavel = 'psico' | 'ia' | 'sistema'
export type TodoDestinatario = 'psico' | 'paciente'
export type TodoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'
export type TodoStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' | 'arquivada'

// Tarefa: psico/ia cria → paciente executa (aparece na página do paciente)
// Alerta: ia/sistema cria → psico vê (aparece no dashboard)
export interface Todo {
  id: string
  user_id: string // terapeuta owner
  paciente_id: string | null // relacionado a qual paciente
  sessao_id: string | null // gerado de qual sessão (se aplicável)

  tipo: TodoTipo
  responsavel: TodoResponsavel // quem criou
  destinatario: TodoDestinatario // para quem

  titulo: string
  descricao: string | null

  prioridade: TodoPrioridade
  status: TodoStatus

  data_limite: string | null // prazo (ISO date)
  data_conclusao: string | null // quando foi concluída

  created_at: string
  updated_at: string
}

export type NovoTodo = Omit<Todo, 'id' | 'created_at' | 'updated_at'>
export type AtualizaTodo = Partial<Omit<Todo, 'id' | 'user_id' | 'created_at'>>

// ============================================
// TIPOS AUXILIARES
// ============================================

// Tipos extraídos para uso comum
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Paciente = Database['public']['Tables']['pacientes']['Row']
export type Sessao = Database['public']['Tables']['sessoes']['Row']

// Para criação
export type NovoPaciente = Database['public']['Tables']['pacientes']['Insert']
export type NovaSessao = Database['public']['Tables']['sessoes']['Insert']

// Para atualização
export type AtualizaPaciente = Database['public']['Tables']['pacientes']['Update']
export type AtualizaSessao = Database['public']['Tables']['sessoes']['Update']

// Views
export type SessaoComPaciente = Database['public']['Views']['sessoes_com_paciente']['Row']
export type SessaoHoje = Database['public']['Views']['sessoes_hoje']['Row']
