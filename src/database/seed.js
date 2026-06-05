'use strict';

/**
 * Seed inicial: cria o AdminUser master e os 5 formulários de diagnóstico.
 * Run once: node src/database/seed.js
 *
 * Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD as environment variables to
 * override the development defaults below before running.
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { FORM_TYPES } = require('../modules/diagnosis/diagnosis.questions');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'master@evidence.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Master@123456';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Master Admin';

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, nomeCompleto: ADMIN_NAME, role: 'MASTER', active: true },
    create: { email: ADMIN_EMAIL, passwordHash, nomeCompleto: ADMIN_NAME, role: 'MASTER', active: true },
  });

  console.log(`Master admin upserted: ${user.email} (id: ${user.id})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log('Using default development admin password. Set SEED_ADMIN_PASSWORD before seeding production/staging.');
  }
}

async function seedForms() {
  for (const [slug, { label, sections }] of Object.entries(FORM_TYPES)) {
    await prisma.diagnosticForm.upsert({
      where: { slug },
      update: { title: label, sections, isActive: true },
      create: { slug, title: label, sections, isActive: true },
    });
    console.log(`Form upserted: ${slug} — ${label}`);
  }
}

async function main() {
  await seedAdmin();
  await seedForms();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

