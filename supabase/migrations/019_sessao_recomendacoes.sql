-- Migration 019: coluna de recomendações clínicas (apoio à decisão)
-- Gerada pela IA após a aprovação do prontuário. Conteúdo criptografado na
-- aplicação (AES-256-GCM), então a coluna guarda string "enc:v1:..." ou JSONB
-- legado. Tipo lógico: SessaoRecomendacoes.

ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS recomendacoes JSONB;

COMMENT ON COLUMN sessoes.recomendacoes IS 'Recomendações clínicas (SessaoRecomendacoes) geradas pela IA após aprovação. Criptografadas na aplicação.';
