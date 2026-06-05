'use strict';

const env = require('./config/env');
const { createLogger } = require('./config/logger');
const app = require('./app');
const { testConnection, disconnect } = require('./database/connection');
const { purgeExpiredRevokedTokens } = require('./modules/auth/auth.repository');

createLogger(env.logDir);

async function purgeRevokedTokenStore() {
  try {
    const result = await purgeExpiredRevokedTokens();
    if (result?.count > 0) {
      console.log(`Revoked token maintenance removed ${result.count} expired entries`);
    }
  } catch (err) {
    console.error('Revoked token maintenance failed:', err.message);
  }
}

async function bootstrap() {
  await testConnection();
  console.log('Database connection established');

  await purgeRevokedTokenStore();

  const purgeInterval = setInterval(() => {
    void purgeRevokedTokenStore();
  }, env.maintenance.revokedTokenPurgeIntervalMs);

  if (typeof purgeInterval.unref === 'function') {
    purgeInterval.unref();
  }

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      clearInterval(purgeInterval);
      await disconnect();
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
