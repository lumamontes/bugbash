# ADR 006: Algoritmo de Quality Score para Bugs

**Status**: Aceito

## Contexto

Em sessões de bug bash, a qualidade dos relatórios de bug varia significativamente. Relatórios incompletos ou vagos geram retrabalho para os desenvolvedores. Precisamos de um mecanismo para incentivar relatórios de alta qualidade e fornecer feedback imediato aos testadores.

## Decisão

Implementamos um **quality score automático** (`src/lib/quality.ts`) que avalia cada bug reportado com base em critérios objetivos:

- Presença e comprimento do título
- Descrição detalhada
- Passos para reproduzir
- Severidade definida
- Evidências anexadas (screenshots)
- Associação com cenário de teste

O score é armazenado no campo `quality_score` da tabela `bugs` como valor `real` (0 a 1).

## Consequências

**Positivas:**

- Feedback imediato ao testador sobre a qualidade do relato
- Incentiva relatórios mais completos e acionáveis
- Métricas agregadas de qualidade por sessão e por participante
- Complementa o sistema de gamificação (badges de qualidade)

**Negativas:**

- Score algorítmico não captura qualidade semântica (relevância, clareza da escrita)
- Critérios fixos podem não se aplicar igualmente a todos os tipos de bug
- Testadores podem "jogar" o sistema preenchendo campos com conteúdo genérico
