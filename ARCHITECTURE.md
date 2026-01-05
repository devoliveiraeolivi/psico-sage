# PsicoSage - Arquitetura do Sistema

## Visão Geral

Sistema para psicólogos que automatiza preparação e análise de sessões de terapia usando IA.

- **Transcrições**: Fathom (integra com Google Meet/Zoom/Teams)
- **Automações**: n8n (orquestrador central)
- **Banco/Auth**: Supabase (PostgreSQL + Auth + RLS)
- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn/ui
- **IA**: Claude API (análise e geração)

---

## Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Banco de Dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Backend | Supabase (RLS + Edge Functions se necessário) |
| Frontend | Next.js 14 (App Router) |
| Estilização | Tailwind CSS + shadcn/ui |
| Automações | n8n (self-hosted ou cloud) |
| Transcrição | Fathom |
| IA | Claude API (Anthropic) |

---

## Modelo de Dados

### Entidades Principais

```
usuarios (psicólogos)
    └── pacientes
            └── sessoes
```

### Multi-tenancy

- Cada psicólogo só vê seus próprios pacientes
- RLS (Row Level Security) no Supabase garante isolamento
- `user_id` em `pacientes` vincula ao psicólogo

---

## Estrutura dos JSONBs

### `pacientes.resumo` (Estado Atual)

Representa o "snapshot" atual do paciente. Sobrescrito após cada sessão.

```json
{
  "sintese": "Paciente com TAG, 8 meses de tratamento...",
  "humor": "estável, episódios de ansiedade situacional",
  "momento": "fase de consolidação",
  "diagnosticos": "TAG (F41.1), traços depressivos em remissão",
  "conflitos": "autocobrança no trabalho, relação com mãe",
  "traumas": "bullying - resolvido; luto avó - em processo",
  "padroes": "evitação, catastrofização em redução",
  "gatilhos": "cobranças, conflitos familiares",
  "recursos": "corrida, journaling, esposa como suporte",
  "alertas": "nenhum no momento",
  "tarefas": "manter diário, técnica de respiração"
}
```

### `pacientes.historico` (Evolução por Tema)

Log temporal de mudanças. Append-only, nunca sobrescrito.

```json
{
  "humor": [
    {"data": "2024-01-22", "sessao_id": "uuid", "valor": "estável"},
    {"data": "2024-01-15", "sessao_id": "uuid", "valor": "ansioso"}
  ],
  "conflitos": [
    {"data": "2024-01-15", "sessao_id": "uuid", "acao": "resolvido", "valor": "reconciliação com pai"}
  ],
  "traumas": [
    {"data": "2024-01-20", "sessao_id": "uuid", "acao": "resolvido", "valor": "bullying - EMDR"}
  ],
  "insights": [
    {"data": "2024-01-22", "sessao_id": "uuid", "valor": "percebeu padrão de evitação"}
  ],
  "tarefas": [
    {"data": "2024-01-22", "sessao_id": "uuid", "acao": "concluida", "valor": "exercício respiração"}
  ],
  "marcos": [
    {"data": "2024-01-15", "sessao_id": "uuid", "valor": "primeiro limite ao chefe"}
  ],
  "alertas": [
    {"data": "2024-01-08", "sessao_id": "uuid", "valor": "menção a desesperança"}
  ]
}
```

### `sessoes.preparacao` (Pré-sessão - IA gera)

```json
{
  "contexto": "Últimas sessões focaram em...",
  "pontos_retomar": ["conflito com mãe", "insônia"],
  "tarefas_pendentes": ["diário de pensamentos"],
  "sugestoes": ["validar antes de confrontar", "retomar técnica X"],
  "perguntas_sugeridas": ["Como foi a conversa com a mãe?"],
  "alertas": ["aniversário falecimento do pai próximo"]
}
```

### `sessoes.resumo` (Pós-sessão - IA gera)

```json
{
  "sintese": "Sessão focada em conflito no trabalho...",
  "humor": "ansioso",
  "temas": ["trabalho", "autocobrança"],
  "insights": ["percebeu padrão de evitação"],
  "pontos_importantes": ["mencionou vontade de pedir demissão"],
  "tarefas": ["praticar respiração antes de reuniões"],
  "alertas": []
}
```

---

## Fluxos de Automação (n8n)

### 1. Agendamento (Google Calendar → Supabase)

```
Google Calendar (novo evento com tag/padrão)
    → n8n webhook/polling
    → Identifica paciente (por título ou participante)
    → Cria sessão com status 'agendada'
    → Adiciona session_id na descrição do evento
```

### 2. Preparação Pré-sessão (Cron)

```
n8n cron (X horas antes das sessões)
    → Busca sessões próximas sem preparacao
    → Para cada sessão:
        → Lê paciente.resumo
        → Lê últimas N sessoes.resumo
        → Chama Claude API
        → Salva sessao.preparacao
```

### 3. Processamento Pós-sessão (Fathom Webhook)

```
Fathom (transcrição pronta)
    → n8n webhook
    → Extrai session_id do título/descrição
    → Salva sessao.integra + duracao_real
    → Chama Claude API para gerar sessao.resumo
    → Atualiza sessao.status = 'aguardando_aprovacao'
    → [FUTURO] Notifica psicólogo para aprovar
```

### 4. Propagação Aprovada (Após aprovação)

```
Psicólogo aprova resumo da sessão
    → n8n ou Edge Function
    → Chama Claude API para atualizar paciente.resumo
    → Append em paciente.historico (itens novos)
    → sessao.status = 'realizada'
```

### 5. Verificação de Faltas (Cron diário)

```
n8n cron (fim do dia)
    → Busca sessões 'agendada' com data_hora no passado
    → Se não tem integra → status = 'falta'
```

---

## Frontend (Next.js 14)

### Estrutura de Pastas

```
/app
  /layout.tsx              # Layout principal com auth check
  /page.tsx                # Redirect para /dashboard
  /(auth)
    /login/page.tsx        # Login com Supabase Auth
  /(app)
    /layout.tsx            # Layout autenticado (sidebar, header)
    /dashboard/page.tsx    # Sessões do dia, alertas
    /pacientes
      /page.tsx            # Lista de pacientes
      /novo/page.tsx       # Criar paciente
      /[id]/page.tsx       # Ficha do paciente
    /sessoes
      /[id]/page.tsx       # Detalhes da sessão (prep/resumo)
    /agenda/page.tsx       # Calendário de sessões

/components
  /ui/                     # shadcn/ui components
  /paciente-card.tsx
  /sessao-card.tsx
  /resumo-viewer.tsx       # Renderiza JSONB formatado
  /historico-timeline.tsx  # Timeline de evolução
  /preparacao-viewer.tsx

/lib
  /supabase/
    /client.ts             # Browser client
    /server.ts             # Server client
    /middleware.ts         # Auth middleware
  /types/
    /database.ts           # Tipos do Supabase
    /index.ts
  /utils.ts

/hooks
  /use-pacientes.ts
  /use-sessoes.ts
```

### Rotas e Funcionalidades

| Rota | Função |
|------|--------|
| `/login` | Autenticação com Supabase Auth |
| `/dashboard` | Sessões do dia, alertas ativos, pendências |
| `/pacientes` | Lista com busca e filtro por status |
| `/pacientes/[id]` | Ficha: resumo + histórico (timeline) + sessões |
| `/sessoes/[id]` | Preparação (pré) ou Resumo (pós) + íntegra |
| `/agenda` | Calendário mensal/semanal |

---

## Fluxo do Psicólogo

1. **Antes da sessão**: Abre `/sessoes/[id]` → vê preparação gerada pela IA
2. **Durante**: Fathom grava automaticamente (Google Meet/Zoom/Teams)
3. **Depois**: Sistema processa → psicólogo vê resumo, aprova propagação
4. **Consulta**: Abre `/pacientes/[id]` → visão completa com histórico evolutivo

---

## Segurança e Compliance

### Implementado no MVP

- [x] Autenticação obrigatória (Supabase Auth)
- [x] RLS (Row Level Security) - isolamento por psicólogo
- [x] HTTPS em produção
- [x] Soft delete (deleted_at) para recuperação

### TODO (Pós-MVP)

- [ ] Audit log de acessos e modificações
- [ ] Criptografia de campos sensíveis em repouso
- [ ] Backup automatizado com retenção
- [ ] Termos de consentimento para pacientes
- [ ] Exportação de dados (LGPD)

---

## Roadmap de Implementação

### Fase 1 - Fundação
1. Schema Supabase + RLS + Auth
2. Projeto Next.js + Tailwind + shadcn/ui
3. CRUD pacientes + telas lista/ficha
4. CRUD sessões + tela visualização

### Fase 2 - Integrações
5. Integração n8n + Google Calendar
6. Integração n8n + Fathom
7. Agentes IA (preparação + resumo)

### Fase 3 - Polish
8. Dashboard com métricas
9. Agenda/calendário
10. Fluxo de aprovação de resumos

---

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Armazenamento de transcrição | TEXT no PostgreSQL | Simplicidade para MVP, até ~1GB por campo |
| Versionamento do resumo | Sobrescrever | MVP simples, histórico granular já existe |
| Aprovação de dados | Pós-MVP | Complexidade, foco no fluxo básico primeiro |
| Real-time updates | Não | n8n como orquestrador, refresh manual |
| Audit log | Pós-MVP | Implementar antes de produção |
