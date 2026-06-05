'use strict';

const fs = require('node:fs');
const path = require('node:path');

const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', debug: 'DEBUG' };

function getLogFilePath(logDir) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logDir, `${date}.log`);
}

function formatLine(level, args) {
  const ts = new Date().toISOString();
  const message = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  return `[${ts}] [${level}] ${message}\n`;
}

function createLogger(logDir) {
  fs.mkdirSync(logDir, { recursive: true });

  function write(level, args) {
    const line = formatLine(level, args);
    const filePath = getLogFilePath(logDir);
    fs.appendFileSync(filePath, line, 'utf8');
  }

  const originalLog = console.log.bind(console);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalDebug = console.debug.bind(console);

  console.log = (...args) => {
    originalLog(...args);
    write(LEVELS.info, args);
  };

  console.warn = (...args) => {
    originalWarn(...args);
    write(LEVELS.warn, args);
  };

  console.error = (...args) => {
    originalError(...args);
    write(LEVELS.error, args);
  };

  console.debug = (...args) => {
    originalDebug(...args);
    write(LEVELS.debug, args);
  };

  process.on('uncaughtException', (err) => {
    write(LEVELS.error, [`uncaughtException: ${err.stack ?? err.message}`]);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
    write(LEVELS.error, [`unhandledRejection: ${message}`]);
  });
}

module.exports = { createLogger };
