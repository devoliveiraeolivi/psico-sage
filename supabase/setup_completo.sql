-- ============================================================
-- PsicoSage - Setup Completo do Banco de Dados
-- Execute este arquivo no SQL Editor do Supabase Dashboard
-- 4 tabelas, abordagem JSONB simplificada
-- ⚠️  APAGA TUDO E RECRIA DO ZERO
-- ============================================================

-- ============================================================
-- LIMPEZA TOTAL (ordem inversa por dependências)
-- ============================================================

-- Drop views
DROP VIEW IF EXISTS tarefas_paciente CASCADE;
DROP VIEW IF EXISTS alertas_pendentes CASCADE;
DROP VIEW IF EXISTS sessoes_hoje CASCADE;
DROP VIEW IF EXISTS sessoes_com_paciente CASCADE;

-- Drop tabelas que existiam na abordagem antiga (normalizada)
DROP TABLE IF EXISTS mencoes_pessoas CASCADE;
DROP TABLE IF EXISTS pessoas_rede CASCADE;
DROP TABLE IF EXISTS medicamentos CASCADE;
DROP TABLE IF EXISTS hipoteses_diagnosticas CASCADE;
DROP TABLE IF EXISTS avaliacoes_risco CASCADE;
DROP TABLE IF EXISTS transcricoes CASCADE;
DROP TABLE IF EXISTS prontuarios_clinicos CASCADE;

-- Drop tabelas principais (ordem inversa de dependência)
DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS sessoes CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Drop funções
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS calculate_session_number() CASCADE;
DROP FUNCTION IF EXISTS populate_texto_completo() CASCADE;
DROP FUNCTION IF EXISTS user_owns_paciente(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_owns_sessao(UUID) CASCADE;
DROP FUNCTION IF EXISTS sync_sessao_resumo_from_prontuario() CASCADE;

-- ============================================================
-- MIGRATION 001: Schema Inicial (usuarios, pacientes, sessoes)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Perfis dos usuários (psicólogos)
CREATE TABLE IF NOT EXISTS usuarios (
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
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    data_inicio_terapia DATE,
    data_fim_terapia DATE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
    -- Estado atual do paciente (sobrescrito pela IA #2 após cada sessão)
    resumo JSONB DEFAULT '{}'::jsonb,
    -- Histórico evolutivo por tema (append-only)
    historico JSONB DEFAULT '{}'::jsonb,
    notas TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de terapia
CREATE TABLE IF NOT EXISTS sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    numero_sessao INT,
    data_hora TIMESTAMPTZ NOT NULL,
    duracao_prevista INT DEFAULT 50,
    duracao_real INT,
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (
        status IN ('agendada', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada')
    ),
    calendar_event_id TEXT,
    fathom_call_id TEXT,
    -- Conteúdo IA
    preparacao JSONB,
    resumo JSONB,
    integra TEXT,
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON pacientes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_paciente_id ON sessoes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data_hora ON sessoes(data_hora);
CREATE INDEX IF NOT EXISTS idx_sessoes_status ON sessoes(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_calendar_event_id ON sessoes(calendar_event_id) WHERE calendar_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_fathom_call_id ON sessoes(fathom_call_id) WHERE fathom_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_paciente_data ON sessoes(paciente_id, data_hora DESC);

-- Funções auxiliares
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

-- Triggers
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_pacientes_updated_at ON pacientes;
CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sessoes_updated_at ON sessoes;
CREATE TRIGGER update_sessoes_updated_at
    BEFORE UPDATE ON sessoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS calculate_sessao_numero ON sessoes;
CREATE TRIGGER calculate_sessao_numero
    BEFORE INSERT ON sessoes FOR EACH ROW EXECUTE FUNCTION calculate_session_number();

-- RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;

-- Policies usuarios
DO $$ BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON usuarios;
    CREATE POLICY "Usuários podem ver próprio perfil"
        ON usuarios FOR SELECT USING (auth.uid() = id);
    DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON usuarios;
    CREATE POLICY "Usuários podem atualizar próprio perfil"
        ON usuarios FOR UPDATE USING (auth.uid() = id);
END $$;

-- Policies pacientes
DO $$ BEGIN
    DROP POLICY IF EXISTS "Psicólogos podem ver seus pacientes" ON pacientes;
    CREATE POLICY "Psicólogos podem ver seus pacientes"
        ON pacientes FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
    DROP POLICY IF EXISTS "Psicólogos podem criar pacientes" ON pacientes;
    CREATE POLICY "Psicólogos podem criar pacientes"
        ON pacientes FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Psicólogos podem atualizar seus pacientes" ON pacientes;
    CREATE POLICY "Psicólogos podem atualizar seus pacientes"
        ON pacientes FOR UPDATE USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Psicólogos podem deletar seus pacientes" ON pacientes;
    CREATE POLICY "Psicólogos podem deletar seus pacientes"
        ON pacientes FOR DELETE USING (auth.uid() = user_id);
END $$;

-- Policies sessoes
DO $$ BEGIN
    DROP POLICY IF EXISTS "Psicólogos podem ver sessões de seus pacientes" ON sessoes;
    CREATE POLICY "Psicólogos podem ver sessões de seus pacientes"
        ON sessoes FOR SELECT
        USING (EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid()) AND deleted_at IS NULL);
    DROP POLICY IF EXISTS "Psicólogos podem criar sessões para seus pacientes" ON sessoes;
    CREATE POLICY "Psicólogos podem criar sessões para seus pacientes"
        ON sessoes FOR INSERT
        WITH CHECK (EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Psicólogos podem atualizar sessões de seus pacientes" ON sessoes;
    CREATE POLICY "Psicólogos podem atualizar sessões de seus pacientes"
        ON sessoes FOR UPDATE
        USING (EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid()));
    DROP POLICY IF EXISTS "Psicólogos podem deletar sessões de seus pacientes" ON sessoes;
    CREATE POLICY "Psicólogos podem deletar sessões de seus pacientes"
        ON sessoes FOR DELETE
        USING (EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid()));
END $$;

-- Views
CREATE OR REPLACE VIEW sessoes_com_paciente AS
SELECT s.*, p.nome as paciente_nome, p.user_id
FROM sessoes s JOIN pacientes p ON p.id = s.paciente_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL;

CREATE OR REPLACE VIEW sessoes_hoje AS
SELECT s.*, p.nome as paciente_nome, p.resumo as paciente_resumo, p.user_id
FROM sessoes s JOIN pacientes p ON p.id = s.paciente_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL AND DATE(s.data_hora) = CURRENT_DATE
ORDER BY s.data_hora;

-- Comentários
COMMENT ON TABLE usuarios IS 'Psicólogos que usam o sistema';
COMMENT ON TABLE pacientes IS 'Pacientes vinculados a um psicólogo';
COMMENT ON TABLE sessoes IS 'Sessões de terapia';
COMMENT ON COLUMN pacientes.resumo IS 'Estado atual do paciente (JSONB). Sobrescrito pela IA #2 após cada sessão aprovada.';
COMMENT ON COLUMN pacientes.historico IS 'Evolução longitudinal por tema (JSONB). Append-only, nunca sobrescrito.';


-- ============================================================
-- MIGRATION 002: Tabela todos (tarefas e alertas)
-- ============================================================

CREATE TABLE IF NOT EXISTS todos (
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

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_paciente_id ON todos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_todos_tipo ON todos(tipo);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_destinatario ON todos(destinatario);
CREATE INDEX IF NOT EXISTS idx_todos_user_destinatario_status ON todos(user_id, destinatario, status);
CREATE INDEX IF NOT EXISTS idx_todos_paciente_destinatario_status ON todos(paciente_id, destinatario, status);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Usuários podem ver seus todos" ON todos;
    CREATE POLICY "Usuários podem ver seus todos" ON todos FOR SELECT USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Usuários podem criar todos" ON todos;
    CREATE POLICY "Usuários podem criar todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Usuários podem atualizar seus todos" ON todos;
    CREATE POLICY "Usuários podem atualizar seus todos" ON todos FOR UPDATE USING (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Usuários podem deletar seus todos" ON todos;
    CREATE POLICY "Usuários podem deletar seus todos" ON todos FOR DELETE USING (auth.uid() = user_id);
END $$;

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE VIEW alertas_pendentes AS
SELECT t.*, p.nome AS paciente_nome
FROM todos t LEFT JOIN pacientes p ON t.paciente_id = p.id
WHERE t.tipo = 'alerta' AND t.destinatario = 'psico' AND t.status IN ('pendente', 'em_andamento')
ORDER BY CASE t.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 WHEN 'baixa' THEN 4 END, t.created_at DESC;

CREATE OR REPLACE VIEW tarefas_paciente AS
SELECT t.*
FROM todos t
WHERE t.tipo = 'tarefa' AND t.destinatario = 'paciente' AND t.status IN ('pendente', 'em_andamento')
ORDER BY CASE t.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 WHEN 'baixa' THEN 4 END, t.data_limite ASC NULLS LAST, t.created_at DESC;


-- ============================================================
-- MIGRATION 003: Audio Recording + Pipeline
-- ============================================================

ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS audio_duracao_segundos INT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT NULL
    CHECK (recording_status IN ('recording', 'uploading', 'transcribing', 'processing', 'done', 'error'));
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS processing_error TEXT;

ALTER TABLE sessoes DROP CONSTRAINT IF EXISTS sessoes_status_check;
ALTER TABLE sessoes ADD CONSTRAINT sessoes_status_check CHECK (
    status IN ('agendada', 'em_andamento', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada')
);

CREATE INDEX IF NOT EXISTS idx_sessoes_recording_status ON sessoes(recording_status)
    WHERE recording_status IS NOT NULL;


-- ============================================================
-- MIGRATION 004: Prontuário + Transcrição como JSONB
-- ============================================================

-- Transcrição estruturada (JSONB com segmentos timestamped)
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS transcricao JSONB;

-- Output clínico completo da IA (11 seções)
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario JSONB;

-- Workflow de aprovação
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario_status TEXT
    CHECK (prontuario_status IN ('rascunho_ia', 'editado', 'aprovado'));
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario_aprovado_em TIMESTAMPTZ;

-- Modelo de IA usado
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS modelo_ia_usado TEXT;

-- Indexes para JSONB
CREATE INDEX IF NOT EXISTS idx_sessoes_prontuario ON sessoes
    USING GIN (prontuario jsonb_path_ops) WHERE prontuario IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_prontuario_status ON sessoes(prontuario_status)
    WHERE prontuario_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessoes_transcricao ON sessoes
    USING GIN (transcricao jsonb_path_ops) WHERE transcricao IS NOT NULL;

-- GIN index no resumo do paciente para buscas
CREATE INDEX IF NOT EXISTS idx_pacientes_resumo ON pacientes
    USING GIN (resumo jsonb_path_ops);

-- Comentários
COMMENT ON COLUMN sessoes.transcricao IS 'Transcrição estruturada JSONB: {arquivo, engine, idioma, diarizacao, duracao_total_segundos, segmentos: [{inicio, fim, texto, speaker?}]}';
COMMENT ON COLUMN sessoes.prontuario IS 'Output clínico completo da IA (11 seções JSONB): resumo_sessao, queixa, anamnese, exame_mental, formulacao, pessoas, intervencoes, plano_metas, farmacologia, evolucao_crp, alertas';
COMMENT ON COLUMN sessoes.prontuario_status IS 'Workflow: rascunho_ia → editado → aprovado';
COMMENT ON COLUMN sessoes.integra IS 'DEPRECATED: Use sessoes.transcricao (JSONB).';

-- Migrar dados legados
UPDATE sessoes
SET transcricao = jsonb_build_object(
    'arquivo', null,
    'engine', 'legacy',
    'idioma', 'pt',
    'diarizacao', false,
    'duracao_total_segundos', null,
    'segmentos', '[]'::jsonb,
    'texto_completo', integra
)
WHERE integra IS NOT NULL AND integra != '' AND transcricao IS NULL AND deleted_at IS NULL;


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

SELECT '=== TABELAS ===' AS info;
SELECT table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT '=== VIEWS ===' AS info;
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT '=== COLUNAS SESSOES ===' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessoes'
ORDER BY ordinal_position;

SELECT '=== RLS ATIVO ===' AS info;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '=== RESUMO ===' AS info;
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tabelas,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS views,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS triggers;
