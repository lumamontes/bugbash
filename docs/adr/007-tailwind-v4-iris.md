# ADR 007: Tailwind CSS v4 com Iris Design Tokens

**Status**: Aceito

## Contexto

O Bug Bash precisa de um sistema de estilização que permita desenvolvimento rápido, consistência visual com os demais produtos da organização e suporte a dark mode. A organização mantém o pacote `@arcotech-services/iris-tokens` com design tokens padronizados.

## Decisão

Adotamos **Tailwind CSS v4** com integração via Vite plugin (`@tailwindcss/vite`) e tokens do **Iris Design System**:

- Tailwind v4 configurado via `@theme` block em `src/styles/global.css` (sem `tailwind.config.js`)
- Cores e tokens customizados importados do Iris
- Dark mode always-on (`color-scheme: dark`)
- Plugin Vite em vez de PostCSS para melhor integração com Astro

## Consequências

**Positivas:**

- Consistência visual com outros produtos da organização via tokens compartilhados
- Tailwind v4 com `@theme` elimina arquivo de configuração separado
- Plugin Vite oferece HMR mais rápido que PostCSS
- Dark mode nativo sem toggle — simplifica a implementação

**Negativas:**

- Tailwind v4 ainda é relativamente novo — menos exemplos e plugins da comunidade
- Dependência do pacote `@arcotech-services/iris-tokens` via GitHub Packages (requer `AUTH_TOKEN`)
- Sem suporte a light mode — pode ser limitante se requisitado no futuro
