-- PsicoSage - Schema Inicial
-- Multi-tenancy com RLS (Row Level Security)

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS
-- ============================================

-- Perfis dos usuários (psicólogos)
-- Criado automaticamente via trigger quando usuário se registra no Supabase Auth
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT,
    crp TEXT, -- Registro no Conselho Regional de Psicologia
    telefone TEXT,
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

    -- Estado atual do paciente (sobrescrito após cada sessão)
    resumo JSONB DEFAULT '{}'::jsonb,

    -- Histórico evolutivo por tema (append-only)
    historico JSONB DEFAULT '{}'::jsonb,

    -- Notas livres do psicólogo
    notas TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de terapia
CREATE TABLE sessoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,

    -- Identificação
    numero_sessao INT,

    -- Agendamento
    data_hora TIMESTAMPTZ NOT NULL,
    duracao_prevista INT DEFAULT 50, -- minutos
    duracao_real INT, -- preenchido após a sessão

    -- Status do ciclo de vida
    status TEXT NOT NULL DEFAULT 'agendada' CHECK (
        status IN ('agendada', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada')
    ),

    -- Integrações externas
    calendar_event_id TEXT, -- ID do evento no Google Calendar
    fathom_call_id TEXT, -- ID da chamada no Fathom

    -- Conteúdo gerado pela IA
    preparacao JSONB, -- Gerado antes da sessão
    resumo JSONB, -- Gerado após a sessão

    -- Transcrição completa (pode ser grande)
    integra TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Pacientes
CREATE INDEX idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX idx_pacientes_status ON pacientes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pacientes_nome ON pacientes(nome) WHERE deleted_at IS NULL;

-- Sessões
CREATE INDEX idx_sessoes_paciente_id ON sessoes(paciente_id);
CREATE INDEX idx_sessoes_data_hora ON sessoes(data_hora);
CREATE INDEX idx_sessoes_status ON sessoes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessoes_calendar_event_id ON sessoes(calendar_event_id) WHERE calendar_event_id IS NOT NULL;
CREATE INDEX idx_sessoes_fathom_call_id ON sessoes(fathom_call_id) WHERE fathom_call_id IS NOT NULL;

-- Índice composto para buscar sessões do dia de um usuário
CREATE INDEX idx_sessoes_paciente_data ON sessoes(paciente_id, data_hora DESC);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar perfil de usuário automaticamente
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

-- Função para calcular número da sessão automaticamente
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

-- Auto-update updated_at
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pacientes_updated_at
    BEFORE UPDATE ON pacientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sessoes_updated_at
    BEFORE UPDATE ON sessoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Auto-calculate session number
CREATE TRIGGER calculate_sessao_numero
    BEFORE INSERT ON sessoes
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_number();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Usuários podem ver próprio perfil"
    ON usuarios FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
    ON usuarios FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para pacientes
CREATE POLICY "Psicólogos podem ver seus pacientes"
    ON pacientes FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Psicólogos podem criar pacientes"
    ON pacientes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Psicólogos podem atualizar seus pacientes"
    ON pacientes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Psicólogos podem deletar seus pacientes"
    ON pacientes FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para sessoes (via paciente)
CREATE POLICY "Psicólogos podem ver sessões de seus pacientes"
    ON sessoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pacientes
            WHERE pacientes.id = sessoes.paciente_id
            AND pacientes.user_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Psicólogos podem criar sessões para seus pacientes"
    ON sessoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pacientes
            WHERE pacientes.id = sessoes.paciente_id
            AND pacientes.user_id = auth.uid()
        )
    );

CREATE POLICY "Psicólogos podem atualizar sessões de seus pacientes"
    ON sessoes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM pacientes
            WHERE pacientes.id = sessoes.paciente_id
            AND pacientes.user_id = auth.uid()
        )
    );

CREATE POLICY "Psicólogos podem deletar sessões de seus pacientes"
    ON sessoes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM pacientes
            WHERE pacientes.id = sessoes.paciente_id
            AND pacientes.user_id = auth.uid()
        )
    );

-- ============================================
-- SERVICE ROLE POLICIES (para n8n/automações)
-- ============================================
-- O service_role bypassa RLS automaticamente no Supabase
-- Usado pelo n8n para criar/atualizar sessões via webhooks

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View de sessões com nome do paciente (para listagens)
CREATE VIEW sessoes_com_paciente AS
SELECT
    s.*,
    p.nome as paciente_nome,
    p.user_id
FROM sessoes s
JOIN pacientes p ON p.id = s.paciente_id
WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL;

-- View de próximas sessões do dia
CREATE VIEW sessoes_hoje AS
SELECT
    s.*,
    p.nome as paciente_nome,
    p.resumo as paciente_resumo,
    p.user_id
FROM sessoes s
JOIN pacientes p ON p.id = s.paciente_id
WHERE
    s.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND DATE(s.data_hora) = CURRENT_DATE
ORDER BY s.data_hora;

-- ============================================
-- COMENTÁRIOS (documentação)
-- ============================================

COMMENT ON TABLE usuarios IS 'Psicólogos que usam o sistema';
COMMENT ON TABLE pacientes IS 'Pacientes vinculados a um psicólogo';
COMMENT ON TABLE sessoes IS 'Sessões de terapia';

COMMENT ON COLUMN pacientes.resumo IS 'Estado atual do paciente (JSONB). Sobrescrito após cada sessão.';
COMMENT ON COLUMN pacientes.historico IS 'Evolução por tema (JSONB). Append-only, nunca sobrescrito.';
COMMENT ON COLUMN sessoes.preparacao IS 'Preparação pré-sessão gerada pela IA (JSONB)';
COMMENT ON COLUMN sessoes.resumo IS 'Resumo pós-sessão gerado pela IA (JSONB)';
COMMENT ON COLUMN sessoes.integra IS 'Transcrição completa da sessão (pode ser muito grande)';
