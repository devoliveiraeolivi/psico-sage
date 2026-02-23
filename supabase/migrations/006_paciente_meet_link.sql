-- Migration: Link fixo do Google Meet por paciente
-- Cada paciente recebe um link permanente do Meet reutilizado em todas as sessões

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS meet_calendar_event_id TEXT;

COMMENT ON COLUMN pacientes.meet_link IS 'Link fixo do Google Meet para este paciente';
COMMENT ON COLUMN pacientes.meet_calendar_event_id IS 'ID do evento no Google Calendar que gerou o Meet link';
