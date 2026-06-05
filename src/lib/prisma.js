'use strict';

const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

// Singleton: em produção, o cache de módulos do Node.js garante uma única instância.
// O globalThis serve de guarda adicional para ambientes com hot-reload (dev) ou
// serverless onde o módulo pode ser reavaliado na mesma instância de processo.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

// Cacheia em todos os ambientes — protege contra re-avaliação do módulo (serverless/edge).
globalForPrisma.prisma = prisma;

// Validação da fórmula de conexões no startup:
// N_instâncias × connection_limit deve ser < max_conexões_db
if (env.db.maxConnections > 0) {
  const poolUsed = env.db.instanceCount * env.db.connectionLimit;
  if (poolUsed >= env.db.maxConnections) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Prisma] AVISO DE POOL: ${env.db.instanceCount} instância(s) × ` +
      `${env.db.connectionLimit} connection_limit = ${poolUsed} conexões ≥ ` +
      `${env.db.maxConnections} máximo do banco. Risco de esgotamento de conexões.`,
    );
  }
}

module.exports = { prisma };
