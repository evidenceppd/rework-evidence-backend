'use strict';

/**
 * Seed inicial: cria o AdminUser master e os 5 formulários de diagnóstico.
 * Run once: node src/database/seed.js
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD as environment variables, or edit the
 * defaults below before running.
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { FORM_TYPES } = require('../modules/diagnosis/diagnosis.questions');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Master Admin';

async function seedAdmin() {
  if (!ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_PASSWORD in .env or as an environment variable before seeding.');
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, nomeCompleto: ADMIN_NAME, role: 'MASTER', active: true },
    create: { email: ADMIN_EMAIL, passwordHash, nomeCompleto: ADMIN_NAME, role: 'MASTER', active: true },
  });

  console.log(`Master admin upserted: ${user.email} (id: ${user.id})`);
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

