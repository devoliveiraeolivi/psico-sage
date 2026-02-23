-- Migration: Suporte a gravação de áudio e pipeline de processamento
-- Adiciona campos para gravação, Google Meet link e status do pipeline

-- Novos campos na tabela sessoes
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS audio_duracao_segundos INT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS meet_link TEXT;
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT NULL
  CHECK (recording_status IN ('recording', 'uploading', 'transcribing', 'processing', 'done', 'error'));
ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Adicionar status 'em_andamento' ao ciclo de vida da sessão
ALTER TABLE sessoes DROP CONSTRAINT IF EXISTS sessoes_status_check;
ALTER TABLE sessoes ADD CONSTRAINT sessoes_status_check CHECK (
  status IN ('agendada', 'em_andamento', 'aguardando_aprovacao', 'realizada', 'falta', 'cancelada', 'remarcada')
);

-- Index para buscar sessões em andamento
CREATE INDEX IF NOT EXISTS idx_sessoes_recording_status ON sessoes(recording_status)
  WHERE recording_status IS NOT NULL;

-- Bucket de storage para áudios (criar manualmente no Supabase Dashboard ou via CLI)
-- supabase storage create audio-sessoes --public false
