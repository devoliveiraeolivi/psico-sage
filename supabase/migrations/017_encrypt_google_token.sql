-- 017: Marca google_refresh_token como campo criptografado
--
-- A criptografia é feita no app (AES-256-GCM via lib/utils/crypto.ts).
-- O campo continua TEXT no banco, mas o valor armazenado passa a ser:
--   "enc:v1:<iv>:<authTag>:<ciphertext>"
--
-- IMPORTANTE: Após aplicar esta migration, rode o script de backfill:
--   npx tsx scripts/encrypt-google-tokens.ts
--
-- Isso criptografa tokens existentes que estão em texto puro.

COMMENT ON COLUMN usuarios.google_refresh_token IS 'Google OAuth2 refresh token — criptografado no app (enc:v1:...)';
