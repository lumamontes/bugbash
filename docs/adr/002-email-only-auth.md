# ADR 002: Autenticação por Email sem Senha

**Status**: Aceito

## Contexto

O Bug Bash é uma ferramenta interna usada por equipes durante sessões de teste. Precisamos de um sistema de autenticação simples que minimize atrito para os participantes, sem depender de provedores OAuth externos (Google, GitHub, etc.) que podem não estar disponíveis no ambiente corporativo.

## Decisão

Implementamos **autenticação apenas por email**, sem senha e sem OAuth. O fluxo é:

1. Primeiro acesso: `/setup` cria o admin e a organização
2. Novos usuários entram via link de convite (`/convite/[code]`) gerado por admin/facilitador
3. Login subsequente: usuário informa apenas o email em `/entrar`
4. Sessão mantida via cookie `bugbash_token` (httpOnly, 30 dias de expiração)

## Consequências

**Positivas:**

- Zero atrito para participantes — não precisam lembrar senha
- Sem dependência de provedores externos (Google, GitHub)
- Implementação simples — sem fluxo de reset de senha, 2FA, etc.
- Convites controlam quem pode acessar (allowlist por domínio de email)

**Negativas:**

- Segurança depende do controle de acesso ao email e à rede
- Não adequado para aplicações expostas à internet pública sem camada adicional de segurança
- Sem verificação de posse do email (sem magic link com token)
