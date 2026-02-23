-- Migration 009: Performance indexes
-- Addresses: sessoes_hoje query performance, RLS EXISTS check performance

-- B-tree index on data_hora for range queries and the sessoes_hoje view.
-- DATE(data_hora) can't be indexed directly (not IMMUTABLE due to timezone),
-- but a plain index on the timestamptz column lets Postgres use an index scan
-- for conditions like: data_hora >= CURRENT_DATE AND data_hora < CURRENT_DATE + 1
CREATE INDEX IF NOT EXISTS idx_sessoes_data_hora
  ON sessoes (data_hora)
  WHERE deleted_at IS NULL;

-- Composite index to speed up RLS EXISTS subquery on pacientes
-- RLS policy checks: EXISTS (SELECT 1 FROM pacientes WHERE pacientes.id = sessoes.paciente_id AND pacientes.user_id = auth.uid())
-- This composite index makes that a single index lookup instead of two
CREATE INDEX IF NOT EXISTS idx_pacientes_id_user_id
  ON pacientes (id, user_id)
  WHERE deleted_at IS NULL;

-- Rewrite sessoes_hoje view to use range query instead of DATE() cast.
-- This allows Postgres to use the idx_sessoes_data_hora B-tree index.
CREATE OR REPLACE VIEW sessoes_hoje AS
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
    AND s.data_hora >= CURRENT_DATE
    AND s.data_hora < CURRENT_DATE + INTERVAL '1 day'
ORDER BY s.data_hora;
