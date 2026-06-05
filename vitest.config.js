'use strict';

const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.js'],
    include: ['tests/**/*.test.js'],
    globals: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
