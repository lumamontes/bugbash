# ADR 005: Sistema de Gamificação com Badges

**Status**: Aceito

## Contexto

Sessões de bug bash dependem do engajamento dos participantes para serem produtivas. Precisamos de mecanismos para motivar a participação ativa e reconhecer contribuições de qualidade.

## Decisão

Implementamos um **sistema de gamificação baseado em badges** com:

- Definições de badges no banco (`badge_definitions`) com slug, nome, ícone, tier e categoria
- Badges conquistados por usuário/sessão (`user_badges`)
- Lógica de avaliação em `src/lib/gamification.ts`
- Thresholds configuráveis por badge (ex.: "reportar 5 bugs críticos")

## Consequências

**Positivas:**

- Incentiva participação ativa e competição saudável durante as sessões
- Badges servem como reconhecimento visível das contribuições
- Sistema extensível — novas categorias e tiers podem ser adicionados via banco
- Métricas de gamificação ajudam a medir engajamento

**Negativas:**

- Adiciona complexidade ao modelo de dados (2 tabelas extras)
- Lógica de avaliação de badges precisa ser executada após cada ação relevante
- Risco de gamificação incentivar quantidade sobre qualidade (mitigado pelo quality score)
