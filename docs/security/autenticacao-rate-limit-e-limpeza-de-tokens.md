# Segurança de Autenticação: Rate Limit Progressivo e Limpeza de Tokens Revogados

## Objetivo
Este documento descreve como a API protege o fluxo de autenticação contra tentativas automatizadas e como mantém a base de revogação de tokens saudável ao longo do tempo.

## Resumo Rápido
- Login e MFA agora têm rate limit progressivo por IP e por identidade.
- Bloqueios aumentam gradualmente em caso de repetidas falhas.
- Quando o usuário autentica com sucesso, os contadores são resetados.
- Tokens revogados expirados são removidos no startup e periodicamente em background.

---

## Visão Técnica

### Arquitetura implementada
- Rate limiter genérico baseado em falhas:
  - `src/middlewares/rate-limit.js`
- Composição de regras do módulo de autenticação:
  - `src/modules/auth/auth.security.js`
- Aplicação nas rotas de autenticação:
  - `src/modules/auth/auth.routes.js`
- Limpeza de tokens revogados:
  - `src/modules/auth/auth.repository.js`
  - `src/server.js`
- Configuração de intervalo de manutenção:
  - `src/config/env.js`

### Fluxo do rate limit
1. Middleware identifica uma chave de controle (por exemplo: `login:ip:<ip>`).
2. Antes de processar a request, verifica se a chave está bloqueada.
3. Se estiver bloqueada, responde `429` com header `Retry-After`.
4. Se não estiver bloqueada, a request segue normalmente.
5. No evento `finish` da resposta:
- Se `2xx`, zera contador de falhas e penalidade.
- Se status de falha rastreável (`400`, `401`, `403`), incrementa falha.
- Ao atingir limite, aplica bloqueio com duração progressiva.

### Políticas aplicadas

#### `/api/auth/login`
- Controle por IP:
  - Janela: 15 minutos
  - Falhas para bloquear: 5
  - Escalada de bloqueio: 1 min, 5 min, 15 min
- Controle por conta (`email` normalizado):
  - Mesma política acima

#### `/api/auth/mfa`
- Controle por IP:
  - Janela: 10 minutos
  - Falhas para bloquear: 5
  - Escalada de bloqueio: 2 min, 10 min, 30 min
- Controle por token MFA:
  - Chave baseada em fingerprint SHA-256 parcial do Bearer token
  - Mesma política acima

### Limpeza de tokens revogados
No bootstrap do servidor:
1. Executa limpeza imediata de `revokedToken` expirado.
2. Inicia `setInterval` para manutenção contínua.
3. No shutdown gracioso, interrompe o intervalo antes de desconectar o banco.

### Configuração
Variável opcional:
- `REVOKED_TOKEN_PURGE_INTERVAL_MS`

Valor padrão (se não informado):
- `3600000` (1 hora)

Exemplo `.env`:
```env
REVOKED_TOKEN_PURGE_INTERVAL_MS=3600000
```

### Observabilidade
- Quando remove entradas expiradas, o servidor registra a quantidade removida.
- Em falha de manutenção, registra erro sem derrubar o processo.
- Rate limit retorna `429` com `Retry-After`, facilitando monitoramento por cliente e gateway.

### Considerações de segurança
- Estratégia é em memória de processo (instância local).
- Em ambiente multi-instância, recomenda-se backend compartilhado (Redis) para rate limit distribuído.
- A limpeza periódica melhora performance da checagem de revogação e evita crescimento indefinido da tabela.

---

## Explicação Leiga

### O que mudou na prática
A API ganhou dois mecanismos de proteção:
1. Um freio contra várias tentativas erradas de login/código.
2. Uma faxina automática de tokens antigos invalidados.

### Como funciona o freio (rate limit)
Imagine uma catraca inteligente:
- Se alguém erra poucas vezes, continua tentando normalmente.
- Se insiste em errar muitas vezes em sequência, a catraca trava por um tempo.
- Se continuar forçando depois, o tempo de trava aumenta.
- Se acertar, o sistema “perdoa” e zera a punição.

### Como funciona a faxina de tokens
Quando um usuário sai da conta, o token dele é marcado como revogado.
Com o tempo, muitos desses tokens ficam vencidos e inúteis.
Agora o sistema:
- limpa esses registros ao iniciar;
- continua limpando automaticamente em intervalos.

Isso mantém a base mais leve e evita acúmulo desnecessário.

### Benefícios para o negócio
- Reduz risco de ataque automatizado em autenticação.
- Mantém API mais estável sob tentativa de abuso.
- Melhora manutenção e previsibilidade de performance.
- Facilita operação com logs claros e comportamento consistente.

---

## Testes Automatizados Relacionados
- `tests/security/rate-limit.test.js`
- `tests/security/csrf.test.js`
- `tests/security/sanitize.test.js`
- `tests/security/security-headers.test.js`
- `tests/security/services-sanitization.test.js`
