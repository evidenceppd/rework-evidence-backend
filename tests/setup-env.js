'use strict';

process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CORS_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || 'http://trusted.local,http://admin.local';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://test:test@127.0.0.1:3306/test_db';
process.env.LOG_DIR = process.env.LOG_DIR || './logs';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.test.local';
process.env.SMTP_PORT = process.env.SMTP_PORT || '465';
process.env.SMTP_USER = process.env.SMTP_USER || 'test-user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'test-pass';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'noreply@test.local';
process.env.REVOKED_TOKEN_PURGE_INTERVAL_MS = process.env.REVOKED_TOKEN_PURGE_INTERVAL_MS || '60000';
