-- Migration: Configuração de sessões recorrentes por paciente
-- Permite definir dia/horário fixo para auto-criar próxima sessão ao encerrar a atual

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS frequencia_sessoes TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS dia_semana_preferido INTEGER;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS hora_preferida TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS duracao_padrao INTEGER DEFAULT 50;

COMMENT ON COLUMN pacientes.frequencia_sessoes IS 'semanal, quinzenal, mensal ou null (desativado)';
COMMENT ON COLUMN pacientes.dia_semana_preferido IS '0=domingo, 1=segunda, ..., 6=sábado';
COMMENT ON COLUMN pacientes.hora_preferida IS 'Formato HH:mm, ex: 10:00';
COMMENT ON COLUMN pacientes.duracao_padrao IS 'Duração padrão da sessão em minutos';
