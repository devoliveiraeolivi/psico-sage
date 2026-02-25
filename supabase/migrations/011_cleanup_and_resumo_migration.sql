-- ============================================
-- Migration 011: Cleanup + Migração de resumo para novo schema
-- ============================================
-- O que faz:
--   1. Dropa tabela `todos` e suas views (nunca usada no app)
--   2. Dropa view `sessoes_com_paciente` (não usada no app)
--   3. Dropa colunas `prontuario`, `prontuario_status`, `prontuario_aprovado_em`, `transcricao` (não usadas)
--   4. Dropa índices órfãos dessas colunas
--   5. Migra dados existentes em `sessoes.resumo` do schema antigo para o novo
--   6. Recria view `sessoes_hoje` (que usa s.* e precisa refletir colunas atualizadas)
-- ============================================

BEGIN;

-- ============================================
-- 1. DROPAR VIEWS QUE DEPENDEM DE TABELAS/COLUNAS A REMOVER
-- ============================================

DROP VIEW IF EXISTS alertas_pendentes CASCADE;
DROP VIEW IF EXISTS tarefas_paciente CASCADE;
DROP VIEW IF EXISTS sessoes_com_paciente CASCADE;
-- sessoes_hoje usa s.* então precisa ser recriada após dropar colunas
DROP VIEW IF EXISTS sessoes_hoje CASCADE;

-- ============================================
-- 2. DROPAR TABELA TODOS (nunca usada no app)
-- ============================================

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
DROP TABLE IF EXISTS todos CASCADE;

-- ============================================
-- 3. DROPAR COLUNAS NÃO USADAS DE SESSOES
-- ============================================

-- prontuario, prontuario_status, prontuario_aprovado_em (migration 004, nunca usadas no código)
-- transcricao (migration 004, não usada - o app usa `integra` TEXT)
ALTER TABLE sessoes
  DROP COLUMN IF EXISTS prontuario,
  DROP COLUMN IF EXISTS prontuario_status,
  DROP COLUMN IF EXISTS prontuario_aprovado_em,
  DROP COLUMN IF EXISTS transcricao;

-- Os índices idx_sessoes_prontuario, idx_sessoes_prontuario_status, idx_sessoes_transcricao
-- são dropados automaticamente junto com as colunas.

-- ============================================
-- 4. RECRIAR VIEW sessoes_hoje (a única view usada no app)
-- ============================================

CREATE OR REPLACE VIEW sessoes_hoje AS
SELECT
    s.*,
    p.nome AS paciente_nome,
    p.resumo AS paciente_resumo,
    p.user_id
FROM sessoes s
JOIN pacientes p ON p.id = s.paciente_id
WHERE
    s.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND s.data_hora >= CURRENT_DATE
    AND s.data_hora < CURRENT_DATE + INTERVAL '1 day'
ORDER BY s.data_hora;

-- ============================================
-- 5. MIGRAR sessoes.resumo DO SCHEMA ANTIGO PARA O NOVO
-- ============================================
-- Apenas atualiza sessões que têm o campo antigo `resumo_sessao` dentro do JSONB.
-- Sessões com schema novo (campo `resumo`) ou sem resumo ficam inalteradas.

UPDATE sessoes
SET resumo = jsonb_build_object(
    -- === PRINCIPAL ===
    'resumo', COALESCE(resumo->'resumo_sessao', '{"sintese":"","pontos_principais":[]}'::jsonb),

    'pontos_atencao', jsonb_build_object(
        'urgentes',            COALESCE(resumo->'alertas'->'urgentes', '[]'::jsonb),
        'monitorar',           COALESCE(resumo->'alertas'->'atencao', '[]'::jsonb),
        'acompanhar_proximas', COALESCE(resumo->'alertas'->'acompanhar', '[]'::jsonb)
    ),

    'estrategia_plano', jsonb_build_object(
        'tarefas_novas',      COALESCE(resumo->'plano_metas'->'tarefas_novas', '[]'::jsonb),
        'metas_acordadas',    resumo->'plano_metas'->'metas_acordadas',
        'foco_proxima_sessao', resumo->'plano_metas'->'foco_proxima_sessao'
    ),

    'evolucao_cfp', COALESCE(resumo->>'evolucao_crp', ''),

    -- === DADOS ===
    'queixas_sintomas', jsonb_build_object(
        'queixa_sessao',       resumo->'queixa_sintomatologia'->'queixa_sessao',
        'sintomas_relatados',  COALESCE(resumo->'queixa_sintomatologia'->'sintomas_relatados', '[]'::jsonb),
        'intensidade',         resumo->'queixa_sintomatologia'->'intensidade',
        'frequencia',          resumo->'queixa_sintomatologia'->'frequencia',
        'fatores_agravantes',  COALESCE(resumo->'queixa_sintomatologia'->'gatilhos', '[]'::jsonb),
        'fatores_alivio',      COALESCE(resumo->'queixa_sintomatologia'->'estrategias_que_ajudaram', '[]'::jsonb)
    ),

    'estado_mental', jsonb_build_object(
        'humor',                  resumo->'estado_mental_sessao'->'humor',
        'afeto',                  resumo->'estado_mental_sessao'->'afeto',
        'pensamento_curso',       resumo->'estado_mental_sessao'->'pensamento_curso',
        'pensamento_conteudo',    CASE
                                    WHEN jsonb_typeof(resumo->'estado_mental_sessao'->'pensamento_conteudo') = 'object'
                                    THEN resumo->'estado_mental_sessao'->'pensamento_conteudo'->'resumo'
                                    ELSE resumo->'estado_mental_sessao'->'pensamento_conteudo'
                                  END,
        'insight',                resumo->'estado_mental_sessao'->'insight',
        'juizo_critica',          resumo->'estado_mental_sessao'->'juizo_critica',
        'risco_suicida',          COALESCE(resumo->'estado_mental_sessao'->'risco_suicida', '"não avaliado"'::jsonb),
        'risco_heteroagressivo',  COALESCE(resumo->'estado_mental_sessao'->'risco_heteroagressivo', '"não avaliado"'::jsonb),
        'outras_observacoes',     resumo->'estado_mental_sessao'->'sensopercepcao'
    ),

    'mudancas_padroes', jsonb_build_object(
        'mudancas_positivas',     COALESCE(resumo->'resumo_sessao'->'mudancas_observadas', '[]'::jsonb),
        'padroes_identificados',  '[]'::jsonb,
        'crencas_centrais',       '[]'::jsonb,
        'defesas_predominantes',  '[]'::jsonb,
        'recursos_paciente',      '[]'::jsonb,
        'persistencias',          '[]'::jsonb
    ),

    'progresso_tarefas', COALESCE(resumo->'plano_metas'->'progresso_relatado', '[]'::jsonb),

    'pessoas_centrais', COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'nome_usado', COALESCE(p->>'nome', ''),
                'categoria',  COALESCE(p->>'categoria', 'outros'),
                'tipo',       COALESCE(p->>'tipo', 'outro'),
                'mencao',     COALESCE(p->>'nota', '')
            )
        ) FROM jsonb_array_elements(resumo->'pessoas_mencionadas') AS p),
        '[]'::jsonb
    ),

    'pessoas_secundarias', '[]'::jsonb,

    'farmacologia', jsonb_build_object(
        'medicacoes',                CASE
                                        WHEN resumo->'medicacao_sessao'->>'medicacoes_mencionadas' IS NOT NULL
                                            AND resumo->'medicacao_sessao'->>'medicacoes_mencionadas' != ''
                                        THEN jsonb_build_array(jsonb_build_object(
                                            'nome', resumo->'medicacao_sessao'->>'medicacoes_mencionadas',
                                            'dose', null
                                        ))
                                        ELSE null
                                     END,
        'adesao',                    resumo->'medicacao_sessao'->'adesao',
        'efeitos_relatados',         resumo->'medicacao_sessao'->'efeitos_colaterais',
        'mudancas',                  resumo->'medicacao_sessao'->'mudancas',
        'encaminhamento_psiquiatrico', resumo->'medicacao_sessao'->'encaminhamentos'
    ),

    'intervencoes', jsonb_build_object(
        'tecnicas_utilizadas', COALESCE(resumo->'intervencoes'->'tecnicas_utilizadas', '[]'::jsonb),
        'temas_trabalhados',   COALESCE(resumo->'intervencoes'->'temas_trabalhados', '[]'::jsonb),
        'observacoes_processo', resumo->'intervencoes'->'resposta_do_paciente'
    ),

    'anamnese', jsonb_build_object(
        'infancia',              resumo->'fatos_novos_biograficos'->'infancia_adolescencia',
        'adolescencia',          null,
        'vida_adulta',           resumo->'fatos_novos_biograficos'->'vida_adulta',
        'familia_origem',        resumo->'fatos_novos_biograficos'->'familia_origem',
        'relacionamentos',       resumo->'fatos_novos_biograficos'->'relacionamentos',
        'marcos_vida',           null,
        'historico_tratamentos', resumo->'fatos_novos_biograficos'->'tratamentos_anteriores'
    )
)
WHERE resumo IS NOT NULL
  AND resumo ? 'resumo_sessao'
  AND NOT (resumo ? 'evolucao_cfp');  -- Evita re-migrar sessões já no schema novo

-- ============================================
-- 6. LIMPAR modelo_ia_usado E fathom_call_id SE NÃO USADOS
-- ============================================
-- modelo_ia_usado é setado pelo extract mas não lido em lugar nenhum.
-- Mantemos por ora pois é útil para auditoria.
-- fathom_call_id foi para uma integração antiga. Mantemos pois não custa nada.

COMMIT;
