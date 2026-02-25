-- Migration: Configuracao flexivel de videochamada
-- Permite ao terapeuta escolher plataforma de video, modo de link, e link externo

-- =========================================================
-- 1. Novas colunas em usuarios (configuracao do terapeuta)
-- =========================================================

-- Plataforma de video: 'nenhum' | 'google_meet' | 'externo'
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS video_plataforma TEXT DEFAULT 'nenhum';

-- Modo do link: 'por_paciente' | 'link_fixo'
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS video_modo_link TEXT DEFAULT 'por_paciente';

-- Link fixo global (usado quando video_modo_link = 'link_fixo')
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS video_link_fixo TEXT;

-- Nome da plataforma externa para exibicao (ex: 'Zoom', 'Teams')
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS video_plataforma_nome TEXT;

COMMENT ON COLUMN usuarios.video_plataforma IS 'Plataforma de video: nenhum, google_meet, externo';
COMMENT ON COLUMN usuarios.video_modo_link IS 'Modo do link: por_paciente ou link_fixo';
COMMENT ON COLUMN usuarios.video_link_fixo IS 'Link fixo global de videochamada (quando video_modo_link = link_fixo)';
COMMENT ON COLUMN usuarios.video_plataforma_nome IS 'Nome da plataforma externa (Zoom, Teams, etc)';

-- =========================================================
-- 2. Backfill: terapeutas que ja tem Google conectado
-- =========================================================

UPDATE usuarios SET video_plataforma = 'google_meet'
WHERE google_refresh_token IS NOT NULL AND video_plataforma = 'nenhum';

-- =========================================================
-- 3. Renomear colunas para nomenclatura generica
-- =========================================================

ALTER TABLE pacientes RENAME COLUMN meet_link TO video_link;
ALTER TABLE pacientes RENAME COLUMN meet_calendar_event_id TO video_calendar_event_id;
ALTER TABLE sessoes RENAME COLUMN meet_link TO video_link;
