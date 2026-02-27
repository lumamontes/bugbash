# Bug Bash

Plataforma de sessões de teste colaborativo gamificado. Organize bug bashes com sua equipe, reporte bugs em tempo real, acompanhe métricas de qualidade e conquiste badges.

## Features

- **Sessões de teste** — Crie e gerencie sessões de bug bash com fases (kickoff, execução, encerramento) e timer em tempo real
- **Reporte de bugs** — Formulário estruturado com severidade, evidências (screenshots), passos para reproduzir e quality score automático
- **Roteiros de teste** — Organize cenários de teste em seções com pré-condições, passos e resultados esperados
- **Gamificação** — Sistema de badges e conquistas para engajar participantes
- **Feed em tempo real** — Atualizações via SSE para acompanhar bugs reportados ao vivo
- **Integrações** — Exportação de bugs para Linear, upload de evidências via Supabase Storage, formatação assistida por IA (Anthropic)
- **Multi-organização** — Suporte a organizações, squads e roles (admin, facilitador, participante)
- **Widget embarcável** — Componente standalone para reportar bugs diretamente do produto sendo testado

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | [Astro 5](https://astro.build) (SSR via `@astrojs/node`) |
| UI | [React 19](https://react.dev) + [Tailwind CSS v4](https://tailwindcss.com) |
| Design Tokens | [Iris](https://github.com/arcotech-services/iris-tokens) |
| Banco de dados | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| Storage | Supabase Storage / R2 |
| Gerenciador | pnpm |

## Pré-requisitos

- Node.js 20+
- pnpm
- PostgreSQL (local ou Supabase)

## Quick Start

```bash
# Clone o repositório
git clone <repo-url>
cd bugbash

# Copie as variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL e demais configurações

# Instale as dependências
pnpm install

# Aplique as migrations
pnpm db:migrate

# (Opcional) Popule com dados de demonstração
pnpm db:seed

# Inicie o servidor de desenvolvimento
pnpm dev
```

O servidor estará disponível em `http://localhost:4321`.

No primeiro acesso, a aplicação redireciona para `/setup` onde você cria o usuário admin, a organização e os squads padrão.

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string do PostgreSQL |
| `AUTH_TOKEN` | Sim | Token do GitHub Packages para `@arcotech-services/iris-tokens` |
| `LINEAR_API_KEY` | Não | API key do Linear para exportação de bugs |
| `LINEAR_TEAM_ID` | Não | ID do time no Linear |
| `ANTHROPIC_API_KEY` | Não | API key da Anthropic para formatação com IA |
| `AI_ENABLED` | Não | Habilitar features de IA (`true`/`false`) |
| `R2_ACCOUNT_ID` | Não | Cloudflare R2 para upload de evidências |
| `R2_ACCESS_KEY_ID` | Não | Credencial R2 |
| `R2_SECRET_ACCESS_KEY` | Não | Credencial R2 |
| `R2_BUCKET_NAME` | Não | Nome do bucket R2 |
| `R2_PUBLIC_URL` | Não | URL pública do bucket R2 |

## Comandos

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento em `localhost:4321` |
| `pnpm build` | Build de produção para `./dist/` |
| `pnpm preview` | Preview do build de produção |
| `pnpm start` | Inicia o servidor de produção (`node dist/server/entry.mjs`) |
| `pnpm astro check` | Verificação de tipos TypeScript |
| `pnpm db:generate` | Gera SQL de migration a partir de mudanças no schema |
| `pnpm db:migrate` | Aplica migrations pendentes no banco |
| `pnpm db:seed` | Popula o banco com dados de demonstração (reseta dados existentes) |
| `pnpm db:studio` | Abre o Drizzle Studio para inspeção do banco |

## Deploy

Para produção:

```bash
pnpm build
pnpm db:migrate
pnpm start
```

A aplicação roda como servidor Node.js standalone (output: `server`). Compatível com plataformas como Railway, Fly.io, ou qualquer host que suporte Node.js.

## Usuários Demo

Após rodar `pnpm db:seed`, você pode fazer login com:

- **Admin**: `admin@arcotech.com.br`
- **Testadora**: `ana.carolina@arcotech.com.br`

O login é feito apenas por email (sem senha).

## Licença

Proprietário — uso interno.
