'use strict';

const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

function sanitizeString(value) {
  const normalized = value.replace(/\u0000/g, '');

  if (/^\s*javascript:/i.test(normalized)) {
    return '';
  }

  return normalized.replace(/[&<>"'`]/g, (char) => HTML_ENTITY_MAP[char]);
}

function sanitizeDeep(value) {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeDeep);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, innerValue]) => [key, sanitizeDeep(innerValue)]));
  }

  return value;
}

// Strict allowlist for user-supplied URL fields (image src, video links, etc.).
// Only http:// and https:// are accepted. Everything else — data:, javascript:,
// vbscript:, blob:, file:, and protocol-relative (//host) — is rejected and
// replaced with '' to prevent XSS via SVG data URIs or other injection vectors.
function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\u0000/g, '').trim();
  if (!normalized) return '';
  if (!/^https?:\/\//i.test(normalized)) return '';
  return normalized.replace(/[&<>"'`]/g, (char) => HTML_ENTITY_MAP[char]);
}

module.exports = { sanitizeString, sanitizeDeep, sanitizeUrl };
