# ADR 001: Astro com SSR em vez de SPA

**Status**: Aceito

## Contexto

O Bug Bash precisa de um framework web que suporte autenticação server-side, rotas protegidas, acesso direto ao banco de dados e renderização de páginas com dados dinâmicos. As alternativas consideradas foram Next.js, Remix e Astro com SSR.

## Decisão

Escolhemos **Astro 5 com SSR** (via `@astrojs/node`) como framework principal, usando React apenas para componentes interativos (ilhas de interatividade).

## Consequências

**Positivas:**

- Páginas `.astro` acessam o banco diretamente sem necessidade de API routes separadas para cada operação
- Menor JavaScript enviado ao cliente — apenas componentes React interativos são hidratados
- File-based routing simples e direto
- Middleware nativo para proteção de rotas e validação de sessão
- SSE funciona nativamente com o adapter Node.js

**Negativas:**

- Componentes React não têm acesso direto ao contexto do servidor (dados passados via props)
- Ecossistema menor comparado a Next.js para SSR
- Time precisa entender a separação entre código `.astro` (servidor) e `.tsx` (cliente)
