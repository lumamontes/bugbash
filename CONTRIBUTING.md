# Contribuindo com o Bug Bash

Obrigado pelo interesse em contribuir! Este guia explica como configurar o ambiente e as convenções do projeto.

## Setup do Ambiente

1. **Clone o repositório** e instale as dependências:

```bash
git clone <repo-url>
cd bugbash
pnpm install
```

2. **Configure as variáveis de ambiente**:

```bash
cp .env.example .env
```

Preencha pelo menos `DATABASE_URL` com uma instância PostgreSQL.

3. **Prepare o banco de dados**:

```bash
pnpm db:migrate
pnpm db:seed    # opcional, popula com dados demo
```

4. **Inicie o dev server**:

```bash
pnpm dev
```

## Estrutura de Pastas

```
src/
├── assets/          # Imagens e assets estáticos
├── components/      # Componentes React (.tsx)
├── db/
│   ├── schema.ts    # Schema Drizzle (todas as tabelas)
│   └── index.ts     # Conexão e auto-migration
├── layouts/         # Layouts Astro (base + app com sidebar)
├── lib/             # Utilitários (auth, gamification, quality, storage, linear)
├── pages/           # Rotas (file-based routing, arquivos .astro)
├── stores/          # Nanostores para estado client-side
└── styles/          # CSS global com Tailwind v4
drizzle/             # Migrations SQL geradas
packages/widget/     # Widget embarcável standalone
```

## Workflow de Contribuição

1. Crie uma branch a partir de `main`:

```bash
git checkout -b feat/minha-feature
```

2. Faça suas alterações seguindo as convenções abaixo.

3. Verifique os tipos:

```bash
pnpm astro check
```

4. Faça commit e abra um Pull Request.

## Convenções de Código

### Idioma

- **UI (labels, textos)**: PT-BR
- **Código (variáveis, funções, comentários)**: Inglês

### Estilo

- TypeScript strict mode
- Componentes React em `.tsx`, páginas em `.astro`
- Estilização via Tailwind CSS v4 (classes utilitárias)
- Dark mode always-on (não implementar light mode)
- Path aliases: `@components/*`, `@lib/*`, `@db/*`

### Naming

- Arquivos de componentes: `PascalCase.tsx`
- Arquivos de páginas Astro: `kebab-case.astro`
- Variáveis e funções: `camelCase`
- Tabelas e colunas do banco: `snake_case`
- Constantes: `UPPER_SNAKE_CASE`

## Workflow de Banco de Dados

Ao modificar o schema (`src/db/schema.ts`):

1. Edite o schema em `src/db/schema.ts`
2. Gere a migration:

```bash
pnpm db:generate
```

3. Aplique a migration:

```bash
pnpm db:migrate
```

4. Commite o schema e os arquivos de migration gerados em `drizzle/`

> As migrations são auto-aplicadas na inicialização do servidor de desenvolvimento. Para produção, rode `pnpm db:migrate` antes de iniciar a aplicação.

## Padrões de Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar filtro por severidade na lista de bugs
fix: corrigir contagem de badges duplicados
refactor: extrair lógica de quality score para módulo separado
docs: atualizar README com instruções de deploy
```

## Roles e Permissões

| Role | Capacidades |
|------|------------|
| `admin` | Tudo — gerenciar organização, squads, usuários, sessões |
| `facilitator` | Criar e gerenciar sessões, gerar convites |
| `participant` | Participar de sessões, reportar bugs |

## Autenticação

O sistema usa login por email sem senha. Novos usuários são adicionados via links de convite (`/convite/[code]`), gerados por admins ou facilitadores.

## Integrações Opcionais

- **Linear**: Exportação de bugs como issues — requer `LINEAR_API_KEY` e `LINEAR_TEAM_ID`
- **Anthropic AI**: Formatação inteligente de bugs — requer `ANTHROPIC_API_KEY`
- **Supabase/R2 Storage**: Upload de evidências (screenshots) — requer configuração R2
