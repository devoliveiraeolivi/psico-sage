# Deploy — PsicoSage (Portainer + Traefik)

Arquitetura: 3 stacks isoladas no Portainer, roteamento via Traefik.

```
Internet
  │
  ▼
Traefik (:80/:443)
  ├── app.dominio.com.br     → psicosage-app:3000
  ├── inngest.dominio.com.br → psicosage-inngest:8288
  └── traefik.dominio.com.br → dashboard Traefik
```

Redes Docker:
- `traefik-public` — roteamento externo (Traefik → containers)
- `psicosage-net` — comunicação interna (App ↔ Inngest, sem sair pro Traefik)

---

## Pré-requisitos

- VPS com Docker e Portainer instalados
- Domínio apontando para o IP da VPS (3 subdomínios: app, inngest, traefik)
- Imagem Docker do app já buildada e disponível (local ou registry)

---

## 1. Criar as redes Docker

Antes de subir qualquer stack, crie as redes compartilhadas:

```bash
docker network create traefik-public
docker network create psicosage-net
```

---

## 2. Build da imagem do app

Na máquina de build (CI ou VPS):

```bash
# Opção A: build local na VPS
docker build -t psicosage/app:latest .

# Opção B: push para um registry
docker build -t ghcr.io/SEU-USER/psico-sage:latest .
docker push ghcr.io/SEU-USER/psico-sage:latest
```

Se usar registry, ajuste `IMAGE` no `.env` do stack psico-sage.

---

## 3. Stack Traefik (infraestrutura)

1. No Portainer: **Stacks → Add stack**
2. Cole o conteúdo de `deploy/traefik/docker-compose.yml`
3. Adicione as variáveis de ambiente (veja `deploy/traefik/.env.example`):

| Variável | Exemplo |
|---|---|
| `DOMAIN` | `seudominio.com.br` |
| `ACME_EMAIL` | `seu@email.com` |
| `TRAEFIK_DASHBOARD_AUTH` | `admin:$$2y$$05$$...` (gerar com `htpasswd -nB admin`) |

4. Deploy

---

## 4. Stack PsicoSage (app Next.js)

1. No Portainer: **Stacks → Add stack**
2. Cole o conteúdo de `deploy/psico-sage/docker-compose.yml`
3. Adicione as variáveis de ambiente (veja `deploy/psico-sage/.env.example`)
4. Deploy

**Importante:** `INNGEST_SIGNING_KEY` e `INNGEST_EVENT_KEY` devem ser **idênticas** nas duas stacks (app e inngest).

---

## 5. Stack Inngest (background jobs)

1. No Portainer: **Stacks → Add stack**
2. Cole o conteúdo de `deploy/inngest/docker-compose.yml`
3. Adicione as variáveis de ambiente (veja `deploy/inngest/.env.example`)
4. Deploy

---

## 6. Registrar funções no Inngest

Após ambas as stacks estarem rodando, o app precisa registrar suas funções com o servidor Inngest. Isso acontece automaticamente quando o endpoint `/api/inngest` é acessado.

Acesse o dashboard do Inngest (`inngest.seudominio.com.br`) e verifique se as 2 funções aparecem:
- `process-session-pipeline`
- `recover-stuck-sessions`

Se não aparecerem, force o registro com um PUT:
```bash
curl -X PUT https://app.seudominio.com.br/api/inngest
```

---

## Gerar signing keys

```bash
# Signing key (prefixo obrigatório signkey-)
openssl rand -hex 16 | sed 's/^/signkey-prod-/'

# Event key
openssl rand -hex 16 | sed 's/^/evt-prod-/'
```

---

## Gerar basic auth para dashboards

```bash
# Instalar htpasswd (se não tiver)
apt install apache2-utils

# Gerar hash
htpasswd -nB admin

# IMPORTANTE: no docker-compose, duplique os $
# admin:$2y$05$abc → admin:$$2y$$05$$abc
```

---

## Atualizar o app

```bash
# Rebuild
docker build -t psicosage/app:latest .

# No Portainer: stack psico-sage → "Update the stack" → "Pull latest image" → Deploy
```
