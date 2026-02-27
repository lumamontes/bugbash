# ADR 003: Drizzle ORM em vez de Prisma

**Status**: Aceito

## Contexto

Precisamos de um ORM TypeScript para PostgreSQL que ofereça type-safety, migrations e boa integração com o ecossistema Node.js. As alternativas avaliadas foram Prisma, TypeORM e Drizzle ORM.

## Decisão

Escolhemos **Drizzle ORM** com o driver `pg` para PostgreSQL.

- Schema definido em TypeScript (`src/db/schema.ts`) com `pgTable`
- Migrations geradas via `drizzle-kit generate` e armazenadas em `drizzle/`
- Auto-migration na inicialização do servidor de desenvolvimento
- Drizzle Studio para inspeção visual do banco

## Consequências

**Positivas:**

- Schema é TypeScript puro — sem linguagem DSL separada (como `schema.prisma`)
- Queries SQL-like com type-safety completo
- Sem code generation — tipos inferidos diretamente do schema
- Bundle menor e startup mais rápido que Prisma (sem engine binária)
- `drizzle-kit` gera migrations SQL legíveis e editáveis

**Negativas:**

- Ecossistema e comunidade menores que Prisma
- Documentação menos madura
- Relações declaradas separadamente das tabelas (mais verboso)
