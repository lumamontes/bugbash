# Session Log — Claude Code (Feb 25–27, 2026)

Registro conciso das sessões de desenvolvimento com Claude Code.

## Fase 1 — Fundação (25/02)

- **Scaffolding**: Astro SSR + Drizzle DB + cookie auth + seed data + dark sidebar layout
- **Auth V1**: Login por email (sem senha), convite por link, seed de usuários
- **Role-Based UI**: Separação de views admin vs participante
- **Seeder**: Roteiros de teste com passos específicos para parametrizador
- **Bug fixes**: Erros de SQLite, tslib, CORS, upload de imagens

## Fase 2 — Deploy + Migração (25–26/02)

- **Deploy Railway**: Configuração de porta, railway.json, variáveis de ambiente
- **SQLite → Supabase**: Migração completa do banco para PostgreSQL
- **Supabase Storage**: Substituição do Cloudflare R2 para uploads
- **Remoção de Keycloak**: Auth simplificado sem SSO
- **Refatoração**: Service layer, correção de imports/tipos, boas práticas Astro

## Fase 3 — Design System + Branding (26/02)

- **Iris tokens**: Integração dos tokens do design system Arcotech (cores, tipografia, espaçamento)
- **Branding Arcotech**: Logo, favicon, cores dos botões, visual completo
- **Remoção de squads**: Simplificação para V1

## Fase 4 — Real-time + UX (26/02)

- **SSE + Nanostores**: Notificações em tempo real entre admin e participante (sem prop drilling)
- **Session management**: Admin pode editar sessão, reiniciar fases (kickoff → execução)
- **Timer**: Simplificação do contador de sessão
- **Roteiro de Testes**: Redesign UX — wizard step-by-step com 3 opções (passou/falhou/parcial)

## Fase 5 — Documentação (26/02)

- **ADRs** em PT-BR (decisões arquiteturais)
- **README.md** + **CONTRIBUTING.md**
- **CLAUDE.md** atualizado

## Preocupações Pendentes

- Load test com ~20 usuários simultâneos no Supabase free tier
- Web notifications (OneSignal considerado mas não implementado)
- Widget embeddable (adiado para fase futura)
- Export para Linear (bugs de sintaxe pendentes)
