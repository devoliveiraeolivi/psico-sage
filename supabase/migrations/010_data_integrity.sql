-- Migration 010: Data integrity improvements
-- 1. Atomic approve operation
-- 2. Advisory lock for numero_sessao race condition

-- ============================================
-- 1. Atomic approve: ensures session + patient
-- are updated together or not at all.
-- ============================================
CREATE OR REPLACE FUNCTION approve_session_atomic(
  p_sessao_id UUID,
  p_paciente_id UUID,
  p_paciente_resumo JSONB,
  p_paciente_historico JSONB
) RETURNS void AS $$
BEGIN
  -- Update session status (with optimistic lock check)
  UPDATE sessoes
  SET status = 'realizada'
  WHERE id = p_sessao_id AND status = 'aguardando_aprovacao';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão % não está aguardando aprovação', p_sessao_id;
  END IF;

  -- Update patient resumo and historico
  UPDATE pacientes
  SET resumo = p_paciente_resumo,
      historico = p_paciente_historico
  WHERE id = p_paciente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente % não encontrado', p_paciente_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Fix race condition in session number calc.
-- Uses advisory lock to serialize inserts per patient.
-- ============================================
CREATE OR REPLACE FUNCTION calculate_session_number() RETURNS trigger AS $$
BEGIN
  IF NEW.numero_sessao IS NULL THEN
    -- Advisory lock scoped to the transaction, keyed on patient ID
    PERFORM pg_advisory_xact_lock(hashtext(NEW.paciente_id::text));

    SELECT COALESCE(MAX(numero_sessao), 0) + 1 INTO NEW.numero_sessao
    FROM sessoes
    WHERE paciente_id = NEW.paciente_id
      AND status NOT IN ('cancelada')
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
