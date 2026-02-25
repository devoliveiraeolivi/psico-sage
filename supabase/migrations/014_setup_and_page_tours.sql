-- Setup wizard completion flag + page tours tracking
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS page_tours_completed TEXT[] DEFAULT '{}';

COMMENT ON COLUMN usuarios.setup_completed IS 'Whether the user has completed the initial setup wizard';
COMMENT ON COLUMN usuarios.page_tours_completed IS 'Array of page tour IDs the user has completed';
