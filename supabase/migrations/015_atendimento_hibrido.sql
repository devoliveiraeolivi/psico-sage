-- 015: Adiciona flag de atendimento híbrido (presencial + online)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atendimento_hibrido BOOLEAN DEFAULT false;
