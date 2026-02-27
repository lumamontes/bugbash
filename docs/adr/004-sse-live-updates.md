# ADR 004: SSE em vez de WebSocket para Atualizações em Tempo Real

**Status**: Aceito

## Contexto

Durante sessões de bug bash, os participantes precisam ver bugs reportados por outros em tempo real (feed ao vivo). Precisamos de um mecanismo de comunicação server-to-client. As alternativas eram WebSocket, SSE (Server-Sent Events) e polling.

## Decisão

Escolhemos **Server-Sent Events (SSE)** via endpoint `/api/sessions/[id]/sse`.

## Consequências

**Positivas:**

- Unidirecional (server → client) — suficiente para o caso de uso (feed de bugs)
- Funciona sobre HTTP padrão — sem necessidade de upgrade de protocolo
- Reconexão automática nativa do browser (`EventSource`)
- Compatível com o adapter `@astrojs/node` sem bibliotecas adicionais
- Mais simples de implementar e depurar que WebSocket

**Negativas:**

- Não suporta comunicação bidirecional (se necessário no futuro, precisará de complemento)
- Limite de conexões simultâneas por domínio no HTTP/1.1 (6 conexões) — mitigado com HTTP/2
- Sem suporte nativo a rooms/channels — lógica de broadcast implementada manualmente
