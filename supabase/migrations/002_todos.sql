-- ============================================
-- TABELA: todos (tarefas e alertas)
-- ============================================
-- Tarefas: psico/ia cria → paciente executa
-- Alertas: ia/sistema cria → psico vê

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES sessoes(id) ON DELETE SET NULL,

  -- Tipo e direção
  tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'alerta')),
  responsavel TEXT NOT NULL CHECK (responsavel IN ('psico', 'ia', 'sistema')),
  destinatario TEXT NOT NULL CHECK (destinatario IN ('psico', 'paciente')),

  -- Conteúdo
  titulo TEXT NOT NULL,
  descricao TEXT,

  -- Status e prioridade
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada', 'arquivada')),

  -- Datas
  data_limite DATE,
  data_conclusao TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_paciente_id ON todos(paciente_id);
CREATE INDEX idx_todos_tipo ON todos(tipo);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_destinatario ON todos(destinatario);

-- Índice composto para queries comuns
CREATE INDEX idx_todos_user_destinatario_status ON todos(user_id, destinatario, status);
CREATE INDEX idx_todos_paciente_destinatario_status ON todos(paciente_id, destinatario, status);

-- RLS (Row Level Security)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Policy: usuário só vê seus próprios todos
CREATE POLICY "Usuários podem ver seus todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: alertas_pendentes (para dashboard)
-- ============================================
CREATE VIEW alertas_pendentes AS
SELECT
  t.*,
  p.nome AS paciente_nome
FROM todos t
LEFT JOIN pacientes p ON t.paciente_id = p.id
WHERE t.tipo = 'alerta'
  AND t.destinatario = 'psico'
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY
  CASE t.prioridade
    WHEN 'urgente' THEN 1
    WHEN 'alta' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'baixa' THEN 4
  END,
  t.created_at DESC;

-- ============================================
-- VIEW: tarefas_paciente (para página do paciente)
-- ============================================
CREATE VIEW tarefas_paciente AS
SELECT
  t.*
FROM todos t
WHERE t.tipo = 'tarefa'
  AND t.destinatario = 'paciente'
  AND t.status IN ('pendente', 'em_andamento')
ORDER BY
  CASE t.prioridade
    WHEN 'urgente' THEN 1
    WHEN 'alta' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'baixa' THEN 4
  END,
  t.data_limite ASC NULLS LAST,
  t.created_at DESC;
