-- 016: Adiciona CHECK constraints para colunas enum-like
-- Garante integridade no banco em vez de depender apenas do app

-- =========================================================
-- 1. CHECK em usuarios.video_plataforma
-- =========================================================
ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS check_video_plataforma;

ALTER TABLE usuarios
  ADD CONSTRAINT check_video_plataforma
  CHECK (video_plataforma IN ('nenhum', 'google_meet', 'externo'));

-- =========================================================
-- 2. CHECK em usuarios.video_modo_link
-- =========================================================
ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS check_video_modo_link;

ALTER TABLE usuarios
  ADD CONSTRAINT check_video_modo_link
  CHECK (video_modo_link IN ('por_paciente', 'link_fixo'));

-- =========================================================
-- 3. CHECK em sessoes.status
-- =========================================================
ALTER TABLE sessoes
  DROP CONSTRAINT IF EXISTS check_sessao_status;

ALTER TABLE sessoes
  ADD CONSTRAINT check_sessao_status
  CHECK (status IN ('agendada', 'em_andamento', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada'));

-- =========================================================
-- 4. CHECK em sessoes.recording_status
-- =========================================================
ALTER TABLE sessoes
  DROP CONSTRAINT IF EXISTS check_recording_status;

ALTER TABLE sessoes
  ADD CONSTRAINT check_recording_status
  CHECK (recording_status IS NULL OR recording_status IN ('recording', 'uploading', 'transcribing', 'processing', 'done', 'error'));

-- =========================================================
-- 5. CHECK em pacientes.status
-- =========================================================
ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS check_paciente_status;

ALTER TABLE pacientes
  ADD CONSTRAINT check_paciente_status
  CHECK (status IN ('ativo', 'inativo', 'alta'));

-- =========================================================
-- 6. CHECK em pacientes.frequencia_sessoes
-- =========================================================
ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS check_frequencia_sessoes;

ALTER TABLE pacientes
  ADD CONSTRAINT check_frequencia_sessoes
  CHECK (frequencia_sessoes IS NULL OR frequencia_sessoes IN ('semanal', 'quinzenal', 'mensal'));

-- =========================================================
-- 7. CHECK em sessoes.duracao_prevista (range 1-300)
-- =========================================================
ALTER TABLE sessoes
  DROP CONSTRAINT IF EXISTS check_duracao_prevista;

ALTER TABLE sessoes
  ADD CONSTRAINT check_duracao_prevista
  CHECK (duracao_prevista IS NULL OR (duracao_prevista >= 1 AND duracao_prevista <= 300));

-- =========================================================
-- 8. CHECK em pacientes.duracao_padrao (range 1-300)
-- =========================================================
ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS check_duracao_padrao;

ALTER TABLE pacientes
  ADD CONSTRAINT check_duracao_padrao
  CHECK (duracao_padrao IS NULL OR (duracao_padrao >= 1 AND duracao_padrao <= 300));

-- =========================================================
-- 9. CHECK em pacientes.dia_semana_preferido (0-6)
-- =========================================================
ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS check_dia_semana;

ALTER TABLE pacientes
  ADD CONSTRAINT check_dia_semana
  CHECK (dia_semana_preferido IS NULL OR (dia_semana_preferido >= 0 AND dia_semana_preferido <= 6));
