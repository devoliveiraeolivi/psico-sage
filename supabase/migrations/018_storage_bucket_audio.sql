-- Migration: bucket de Storage para áudios das sessões
--
-- O upload é feito pelo browser via signed upload URL (gerada com service_role
-- no endpoint /api/sessoes/[id]/upload-url), e todo acesso server-side ao áudio
-- usa o service_role (admin) — que bypassa RLS. Por isso o bucket é privado e
-- não precisa de policies em storage.objects.
--
-- Idempotente: roda sem erro mesmo se o bucket já existir.

insert into storage.buckets (id, name, public)
values ('audio-sessoes', 'audio-sessoes', false)
on conflict (id) do nothing;
