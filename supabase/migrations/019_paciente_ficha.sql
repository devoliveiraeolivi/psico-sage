-- Migration 019: paciente ficha v2
-- 1. Add ficha JSONB column to pacientes
-- 2. Replace 4-arg approve_session_atomic with 5-arg version (adds p_paciente_ficha)

-- ============================================
-- 1. Add ficha column
-- ============================================
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ficha JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- 2. Drop old 4-arg RPC before creating new 5-arg version
--    (Postgres distinguishes functions by signature)
-- ============================================
DROP FUNCTION IF EXISTS approve_session_atomic(UUID, UUID, JSONB, JSONB);

-- ============================================
-- 3. New 5-arg atomic approve: updates session + patient (resumo, historico, ficha)
-- ============================================
CREATE OR REPLACE FUNCTION approve_session_atomic(
  p_sessao_id UUID,
  p_paciente_id UUID,
  p_paciente_resumo JSONB,
  p_paciente_historico JSONB,
  p_paciente_ficha JSONB
) RETURNS void AS $$
BEGIN
  -- Update session status (with optimistic lock check)
  UPDATE sessoes
  SET status = 'realizada'
  WHERE id = p_sessao_id AND status = 'aguardando_aprovacao';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão % não está aguardando aprovação', p_sessao_id;
  END IF;

  -- Update patient resumo, historico and ficha
  UPDATE pacientes
  SET resumo = p_paciente_resumo,
      historico = p_paciente_historico,
      ficha = p_paciente_ficha
  WHERE id = p_paciente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente % não encontrado', p_paciente_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
