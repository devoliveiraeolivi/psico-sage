-- ============================================
-- PsicoSage - RESET COMPLETO DO BANCO
-- Cola isso no SQL Editor do Supabase
-- ============================================

-- 1. Dropar views primeiro (dependem das tabelas)
DROP VIEW IF EXISTS alertas_pendentes CASCADE;
DROP VIEW IF EXISTS tarefas_paciente CASCADE;
DROP VIEW IF EXISTS sessoes_hoje CASCADE;
DROP VIEW IF EXISTS sessoes_com_paciente CASCADE;

-- 2. Dropar triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS calculate_sessao_numero ON sessoes;
DROP TRIGGER IF EXISTS update_sessoes_updated_at ON sessoes;
DROP TRIGGER IF EXISTS update_pacientes_updated_at ON pacientes;
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;

-- 3. Dropar tabelas (ordem importa por foreign keys)
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS sessoes CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 4. Dropar funções
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS calculate_session_number() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS
-- ============================================

-- Perfis dos psicólogos
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    crp TEXT,
    telefone TEXT,
    google_refresh_token TEXT,
    google_email TEXT,
    google_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pacientes
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    data_inicio_terapia DATE,
    data_fim_terapia DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
    resumo JSONB DEFAULT '{}'::jsonb,
    historico JSONB DEFAULT '{}'::jsonb,
    notas TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de terapia
CREATE TABLE sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    numero_sessao INT,
    data_hora TIMESTAMPTZ NOT NULL,
    duracao_prevista INT DEFAULT 50,
    duracao_real INT,
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (
        status IN ('agendada', 'em_andamento', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada')
    ),
    calendar_event_id TEXT,
    fathom_call_id TEXT,
    preparacao JSONB,
    resumo JSONB,
    integra TEXT,
    -- Audio/recording pipeline
    audio_url TEXT,
    audio_duracao_segundos INT,
    meet_link TEXT,
    recording_status TEXT CHECK (recording_status IN ('recording', 'uploading', 'transcribing', 'processing', 'done', 'error')),
    processing_error TEXT,
    -- Prontuário clínico
    transcricao JSONB,
    prontuario JSONB,
    prontuario_status TEXT CHECK (prontuario_status IN ('rascunho_ia', 'editado', 'aprovado')),
    prontuario_aprovado_em TIMESTAMPTZ,
    modelo_ia_usado TEXT,
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Todos (tarefas e alertas)
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
    sessao_id UUID REFERENCES sessoes(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'alerta')),
    responsavel TEXT NOT NULL CHECK (responsavel IN ('psico', 'ia', 'sistema')),
    destinatario TEXT NOT NULL CHECK (destinatario IN ('psico', 'paciente')),
    titulo TEXT NOT NULL,
    descricao TEXT,
    prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada', 'arquivada')),
    data_limite DATE,
    data_conclusao TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX idx_pacientes_status ON pacientes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pacientes_nome ON pacientes(nome) WHERE deleted_at IS NULL;

CREATE INDEX idx_sessoes_paciente_id ON sessoes(paciente_id);
CREATE INDEX idx_sessoes_data_hora ON sessoes(data_hora);
CREATE INDEX idx_sessoes_status ON sessoes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessoes_paciente_data ON sessoes(paciente_id, data_hora DESC);
CREATE INDEX idx_sessoes_recording_status ON sessoes(recording_status) WHERE recording_status IS NOT NULL;
CREATE INDEX idx_sessoes_prontuario ON sessoes USING GIN (prontuario jsonb_path_ops) WHERE prontuario IS NOT NULL;
CREATE INDEX idx_sessoes_prontuario_status ON sessoes(prontuario_status) WHERE prontuario_status IS NOT NULL;
CREATE INDEX idx_sessoes_transcricao ON sessoes USING GIN (transcricao jsonb_path_ops) WHERE transcricao IS NOT NULL;

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_paciente_id ON todos(paciente_id);
CREATE INDEX idx_todos_user_destinatario_status ON todos(user_id, destinatario, status);

-- ============================================
-- FUNÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO usuarios (id, email, nome)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_session_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_sessao IS NULL THEN
        SELECT COALESCE(MAX(numero_sessao), 0) + 1
        INTO NEW.numero_sessao
        FROM sessoes
        WHERE paciente_id = NEW.paciente_id
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessoes_updated_at
    BEFORE UPDATE ON sessoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER calculate_sessao_numero
    BEFORE INSERT ON sessoes FOR EACH ROW EXECUTE FUNCTION calculate_session_number();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Usuarios
CREATE POLICY "Usuários podem ver próprio perfil"
    ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar próprio perfil"
    ON usuarios FOR UPDATE USING (auth.uid() = id);

-- Pacientes
CREATE POLICY "Psicólogos podem ver seus pacientes"
    ON pacientes FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Psicólogos podem criar pacientes"
    ON pacientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Psicólogos podem atualizar seus pacientes"
    ON pacientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Psicólogos podem deletar seus pacientes"
    ON pacientes FOR DELETE USING (auth.uid() = user_id);

-- Sessões
CREATE POLICY "Psicólogos podem ver sessões de seus pacientes"
    ON sessoes FOR SELECT USING (
        EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid())
        AND deleted_at IS NULL
    );
CREATE POLICY "Psicólogos podem criar sessões para seus pacientes"
    ON sessoes FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid())
    );
CREATE POLICY "Psicólogos podem atualizar sessões de seus pacientes"
    ON sessoes FOR UPDATE USING (
        EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid())
    );
CREATE POLICY "Psicólogos podem deletar sessões de seus pacientes"
    ON sessoes FOR DELETE USING (
        EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid())
    );

-- Todos
CREATE POLICY "Usuários podem ver seus todos"
    ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar todos"
    ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus todos"
    ON todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus todos"
    ON todos FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW sessoes_com_paciente AS
SELECT s.*, p.nome as paciente_nome, p.user_id
FROM sessoes s JOIN pacientes p ON p.id = s.paciente_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL;

CREATE VIEW sessoes_hoje AS
SELECT s.*, p.nome as paciente_nome, p.resumo as paciente_resumo, p.user_id
FROM sessoes s JOIN pacientes p ON p.id = s.paciente_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL AND DATE(s.data_hora) = CURRENT_DATE
ORDER BY s.data_hora;

CREATE VIEW alertas_pendentes AS
SELECT t.*, p.nome AS paciente_nome
FROM todos t LEFT JOIN pacientes p ON t.paciente_id = p.id
WHERE t.tipo = 'alerta' AND t.destinatario = 'psico' AND t.status IN ('pendente', 'em_andamento')
ORDER BY CASE t.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 WHEN 'baixa' THEN 4 END, t.created_at DESC;

CREATE VIEW tarefas_paciente AS
SELECT t.*
FROM todos t
WHERE t.tipo = 'tarefa' AND t.destinatario = 'paciente' AND t.status IN ('pendente', 'em_andamento')
ORDER BY CASE t.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 WHEN 'baixa' THEN 4 END, t.data_limite ASC NULLS LAST, t.created_at DESC;
