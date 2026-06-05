'use strict';

const { sanitizeString, sanitizeDeep } = require('../../src/utils/sanitize');

describe('sanitize utils', () => {
  it('escapes dangerous HTML characters', () => {
    const raw = `<img src=x onerror="alert('xss')">`;
    const sanitized = sanitizeString(raw);

    expect(sanitized).toBe('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;');
    expect(sanitized.includes('<')).toBe(false);
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('');
    expect(sanitizeString('   JAVASCRIPT:alert(1)')).toBe('');
  });

  it('sanitizes nested objects and arrays deeply', () => {
    const payload = {
      title: '<script>alert(1)</script>',
      blocks: [
        { text: 'ok' },
        { text: '<b>bold</b>' },
      ],
      links: {
        safe: 'https://example.com',
        dangerous: 'javascript:alert(1)',
      },
    };

    const sanitized = sanitizeDeep(payload);

    expect(sanitized.title).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sanitized.blocks[1].text).toBe('&lt;b&gt;bold&lt;/b&gt;');
    expect(sanitized.links.safe).toBe('https://example.com');
    expect(sanitized.links.dangerous).toBe('');
  });
});
