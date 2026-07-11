-- =============================================================
-- PsicoSage — diagnóstico do banco (somente leitura)
-- Cole no SQL Editor do Supabase e rode. Falhas (✗) aparecem primeiro.
-- =============================================================

with checks as (

  -- Tabelas principais ------------------------------------------------
  select 'tabela'  as tipo, 'usuarios'  as obj, to_regclass('public.usuarios')  is not null as ok
  union all select 'tabela','pacientes', to_regclass('public.pacientes') is not null
  union all select 'tabela','sessoes',   to_regclass('public.sessoes')   is not null
  union all select 'tabela','todos',     to_regclass('public.todos')     is not null

  -- Colunas críticas do fluxo de áudio/transcrição (migration 003+) ---
  union all select 'coluna sessoes','audio_url',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='sessoes' and column_name='audio_url')
  union all select 'coluna sessoes','audio_duracao_segundos',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='sessoes' and column_name='audio_duracao_segundos')
  union all select 'coluna sessoes','recording_status',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='sessoes' and column_name='recording_status')
  union all select 'coluna sessoes','processing_error',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='sessoes' and column_name='processing_error')

  -- Colunas de Google/vídeo (migrations 005 / 012) --------------------
  union all select 'coluna usuarios','google_refresh_token',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='google_refresh_token')
  union all select 'coluna usuarios','video_plataforma',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios' and column_name='video_plataforma')

  -- Views -------------------------------------------------------------
  union all select 'view','sessoes_com_paciente', to_regclass('public.sessoes_com_paciente') is not null
  union all select 'view','sessoes_hoje',         to_regclass('public.sessoes_hoje')         is not null
  union all select 'view','alertas_pendentes',    to_regclass('public.alertas_pendentes')    is not null
  union all select 'view','tarefas_paciente',     to_regclass('public.tarefas_paciente')     is not null

  -- RLS ligado nas tabelas com dados clínicos -------------------------
  union all select 'RLS','usuarios',  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.usuarios')),  false)
  union all select 'RLS','pacientes', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.pacientes')), false)
  union all select 'RLS','sessoes',   coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.sessoes')),   false)
  union all select 'RLS','todos',     coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.todos')),     false)

  -- Storage: bucket de áudio (migration 018 / criado no Dashboard) ----
  union all select 'storage bucket','audio-sessoes',
    exists(select 1 from storage.buckets where id = 'audio-sessoes')
  union all select 'storage bucket é privado','audio-sessoes',
    exists(select 1 from storage.buckets where id = 'audio-sessoes' and public = false)
)
select
  case when ok then '✓ OK' else '✗ FALTANDO' end as status,
  tipo,
  obj
from checks
order by ok asc, tipo, obj;
