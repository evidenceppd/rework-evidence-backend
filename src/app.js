'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const corsMiddleware = require('./middlewares/cors');
const securityHeaders = require('./middlewares/security-headers');
const { requireTrustedOrigin } = require('./middlewares/csrf');
const { requireAuth } = require('./middlewares/jwt');
const { publicReadLimiter } = require('./middlewares/rate-limit');
const healthRouter = require('./routes/health');
const authRouter = require('./modules/auth/auth.routes');
const homeRouter = require('./modules/home/home.routes');
const testimonialsRouter = require('./modules/testimonials/testimonials.routes');
const howWeWorkRouter = require('./modules/how-we-work/how-we-work.routes');
const servicesRouter = require('./modules/services/services.routes');
const clientsRouter = require('./modules/clients/clients.routes');
const blogRouter = require('./modules/blog/blog.routes');
const configRouter = require('./modules/config/config.routes');
const usersRouter = require('./modules/users/users.routes');
const diagnosisRouter = require('./modules/diagnosis/diagnosis.routes');
const env = require('./config/env');
const swaggerSpec = require('./config/swagger');

const PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const app = express();
app.disable('x-powered-by');

app.use(corsMiddleware);
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use((req, res, next) => {
  if (PROTECTED_METHODS.has(req.method)) {
    return requireTrustedOrigin(req, res, next);
  }
  next();
});

if (env.swaggerEnabled) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

// Public form submissions — must be mounted before the requireAuth middleware block
app.use('/api/diagnosis', diagnosisRouter);

// Rate limit para rotas públicas de leitura (GET sem autenticação).
// Protege o pool de conexões do Prisma contra rajadas de F5 e crawlers.
app.use('/api/home', publicReadLimiter);
app.use('/api/testimonials', publicReadLimiter);
app.use('/api/how-we-work', publicReadLimiter);
app.use('/api/services', publicReadLimiter);
app.use('/api/clients', publicReadLimiter);
app.use('/api/blog', publicReadLimiter);

// Protect all write methods on every route mounted below
app.use((req, res, next) => {
  if (PROTECTED_METHODS.has(req.method)) {
    return requireAuth(req, res, next);
  }
  next();
});

app.use('/api/home', homeRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/how-we-work', howWeWorkRouter);
app.use('/api/services', servicesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/blog', blogRouter);
app.use('/api/config', configRouter);
app.use('/api/users', usersRouter);

app.get('/', (_req, res) => {
  res.json({
    status: 'success',
    name: 'rework-evidence',
    version: '1.0.0',
    docs: env.swaggerEnabled ? '/api/docs' : null,
  });
});

app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use((err, req, res, _next) => {
  // Map Prisma validation errors (e.g. invalid UUID format) → 400
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ status: 'error', message: 'Invalid request data' });
  }

  // Map Prisma known request errors by code
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    if (err.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Record not found' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'A record with this value already exists' });
    }
    return res.status(400).json({ status: 'error', message: err.message });
  }

  const status = err.status ?? 500;
  const message = status >= 500 ? 'Internal server error' : err.message;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ status: 'error', message });
});

module.exports = app;
