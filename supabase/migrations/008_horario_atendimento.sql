-- Migration: Horário de atendimento configurável
-- Permite o terapeuta definir o range de horas visível nos calendários

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS hora_inicio_atendimento INTEGER DEFAULT 7;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS hora_fim_atendimento INTEGER DEFAULT 19;

COMMENT ON COLUMN usuarios.hora_inicio_atendimento IS 'Hora de início do atendimento (0-23), default 7';
COMMENT ON COLUMN usuarios.hora_fim_atendimento IS 'Hora de fim do atendimento (0-23), default 19';
