-- ============================================
-- PsicoSage - Migration 004: Prontuário + Transcrição como JSONB
-- Abordagem simplificada: JSONB nas sessões existentes
-- ============================================

-- Transcrição estruturada (substitui sessoes.integra para novas sessões)
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS transcricao JSONB;

-- Output clínico completo da IA (11 seções)
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario JSONB;

-- Workflow de aprovação do prontuário
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario_status TEXT
    CHECK (prontuario_status IN ('rascunho_ia', 'editado', 'aprovado'));

ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS prontuario_aprovado_em TIMESTAMPTZ;

-- Modelo de IA usado no processamento
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS modelo_ia_usado TEXT;

-- GIN index para busca dentro do prontuário clínico
CREATE INDEX IF NOT EXISTS idx_sessoes_prontuario ON sessoes
    USING GIN (prontuario jsonb_path_ops)
    WHERE prontuario IS NOT NULL;

-- Index para buscar sessões por status de prontuário
CREATE INDEX IF NOT EXISTS idx_sessoes_prontuario_status ON sessoes(prontuario_status)
    WHERE prontuario_status IS NOT NULL;

-- Full-text search na transcrição (texto dos segmentos)
-- Usa expressão que extrai texto_completo concatenado dos segmentos
CREATE INDEX IF NOT EXISTS idx_sessoes_transcricao ON sessoes
    USING GIN (transcricao jsonb_path_ops)
    WHERE transcricao IS NOT NULL;

-- Comentários
COMMENT ON COLUMN sessoes.transcricao IS 'Transcrição estruturada: {arquivo, engine, idioma, diarizacao, duracao_total_segundos, segmentos: [{inicio, fim, texto, speaker?}]}';
COMMENT ON COLUMN sessoes.prontuario IS 'Output clínico completo da IA (11 seções): resumo_sessao, queixa_sintomatologia, anamnese, exame_mental, formulacao, pessoas, intervencoes, plano_metas, farmacologia, evolucao_crp, alertas';
COMMENT ON COLUMN sessoes.prontuario_status IS 'Workflow: rascunho_ia → editado → aprovado';
COMMENT ON COLUMN sessoes.prontuario_aprovado_em IS 'Timestamp de quando o psicólogo aprovou o prontuário';
COMMENT ON COLUMN sessoes.modelo_ia_usado IS 'Modelo de IA usado (ex: claude-3.5-sonnet)';

-- Depreciar sessoes.integra
COMMENT ON COLUMN sessoes.integra IS 'DEPRECATED: Use sessoes.transcricao (JSONB). Mantido para backward compat.';

-- Migrar dados legados: sessoes.integra → sessoes.transcricao
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
WHERE integra IS NOT NULL
AND integra != ''
AND transcricao IS NULL
AND deleted_at IS NULL;
