'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const requiredVars = [
  'PORT',
  'NODE_ENV',
  'CORS_ALLOWED_ORIGINS',
  'DATABASE_URL',
  'LOG_DIR',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const env = {
  port: parseInt(process.env.PORT, 10),
  nodeEnv: process.env.NODE_ENV,

  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  },

  databaseUrl: process.env.DATABASE_URL,

  logDir: process.env.LOG_DIR,

  jwt: {
    secret: process.env.JWT_SECRET,
    mfaExpiry: process.env.JWT_MFA_EXPIRY || '10m',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: parseBoolean(process.env.SMTP_SECURE, process.env.SMTP_PORT === '465'),
    logMfaCode: parseBoolean(process.env.SMTP_LOG_MFA_CODE, process.env.NODE_ENV !== 'production'),
    // Envia por padrão sempre que SMTP estiver configurado. Defina SMTP_SKIP_SEND=true
    // apenas quando quiser impedir envio real em ambiente local/teste.
    skipSend: parseBoolean(process.env.SMTP_SKIP_SEND, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },

  smtpAnalysis: {
    to: process.env.SMTP_ANALISE_TO || '',
    user: process.env.SMTP_USER_ANALISE || process.env.SMTP_USER,
    pass: process.env.SMTP_PASS_ANALISE || process.env.SMTP_PASS,
    from: process.env.SMTP_FROM_ANALISE || process.env.SMTP_USER_ANALISE || process.env.SMTP_FROM || process.env.SMTP_USER,
  },

  maintenance: {
    revokedTokenPurgeIntervalMs: parsePositiveInt(process.env.REVOKED_TOKEN_PURGE_INTERVAL_MS, 60 * 60 * 1000),
  },

  // Configuração do pool de conexões Prisma.
  // Fórmula de segurança: instanceCount × connectionLimit < db.maxConnections
  // Defina DB_MAX_CONNECTIONS para habilitar a validação automática no startup.
  db: {
    connectionLimit: parsePositiveInt(process.env.DB_CONNECTION_LIMIT, 5),
    maxConnections: parsePositiveInt(process.env.DB_MAX_CONNECTIONS, 0), // 0 = sem validação
    instanceCount: parsePositiveInt(process.env.INSTANCE_COUNT, 1),
  },

  // true only when launched via `npm run dev`
  swaggerEnabled: process.env.npm_lifecycle_event === 'dev',
};

module.exports = env;
