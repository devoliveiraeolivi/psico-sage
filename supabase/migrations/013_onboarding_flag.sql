-- Migration: Add onboarding_completed flag to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
COMMENT ON COLUMN usuarios.onboarding_completed IS 'Whether the user has completed the onboarding tour';
