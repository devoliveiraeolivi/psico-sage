-- Migration: Suporte a OAuth2 Google por psicóloga
-- Cada psicóloga vincula sua própria conta Google para criar Meet links

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_email TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_connected_at TIMESTAMPTZ;
