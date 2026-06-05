# Code Review: API Routes Security (XSS, CSRF, Prompt Injection, SQL Injection)
**Date**: 2026-04-29
**Ready for Production**: No
**Critical Issues**: 0
**High Issues**: 1
**Medium Issues**: 1
**Low Issues**: 2

## Remediation Status
- Status: Implemented in codebase on 2026-04-29
- Implemented files:
  - `src/app.js`
  - `src/config/env.js`
  - `src/middlewares/csrf.js`
  - `src/middlewares/rate-limit.js`
  - `src/middlewares/security-headers.js`
  - `src/modules/auth/auth.security.js`
  - `src/modules/auth/auth.routes.js`
  - `src/server.js`
  - `src/utils/sanitize.js`
  - `src/modules/home/home.service.js`
  - `src/modules/testimonials/testimonials.service.js`
  - `src/modules/how-we-work/how-we-work.service.js`
  - `src/modules/services/services.service.js`
  - `src/modules/clients/clients.service.js`
  - `src/modules/blog/blog.service.js`
  - `src/modules/config/config.service.js`
  - `src/modules/users/users.service.js`

## Scope Reviewed
- Route entry and global middleware: `src/app.js`, `src/middlewares/*.js`
- All route modules:
  - `src/modules/auth/auth.routes.js`
  - `src/modules/home/home.routes.js`
  - `src/modules/testimonials/testimonials.routes.js`
  - `src/modules/how-we-work/how-we-work.routes.js`
  - `src/modules/services/services.routes.js`
  - `src/modules/clients/clients.routes.js`
  - `src/modules/blog/blog.routes.js`
  - `src/modules/config/config.routes.js`
  - `src/modules/users/users.routes.js`
- Controller/service/repository layers of all modules
- Data model: `src/database/prisma/schema.prisma`

## Review Plan Used (Targeted)
1. Injection-focused data-flow review (request -> service -> repository -> DB)
2. Browser threat model checks (CSRF and CORS behavior)
3. Stored content security checks (XSS persistence and output safety)
4. AI/LLM attack surface discovery (prompt construction and model calls)

## Priority 1 (Must Fix) ⛔

### 1) Stored XSS risk across content CRUD routes
**Severity**: High  
**Category**: OWASP A03 Injection (XSS vector via stored rich text/JSON)

**Evidence**
- Content-bearing fields are accepted and persisted without sanitization in services, for example:
  - `src/modules/blog/blog.service.js` (create/update path for `content`, `title`, `subtitle`)
  - `src/modules/testimonials/testimonials.service.js` (create/update path for `description`, `name`, `position`)
  - `src/modules/services/services.service.js` (page/card text fields)
  - `src/modules/clients/clients.service.js` (`clientDescription`, `cardsClients`, `segment`)
  - `src/modules/config/config.service.js` (`description`, `socialMedia`, `contactUs`)
  - `src/modules/home/home.service.js` and `src/modules/how-we-work/how-we-work.service.js` (JSON content blocks)
- Prisma schema confirms many string/text/json fields that can hold user-controlled markup/script payloads:
  - `src/database/prisma/schema.prisma` (e.g., `BlogPost.content`, `Testimonial.description`, `Company.clientDescription`, multiple `Json` fields)

**Why this matters**
- The API stores and later serves user-provided text/JSON. If any frontend renders these values as HTML (directly or indirectly), malicious payloads can execute in browser context.

**Recommended Fix**
- Introduce server-side sanitization at write-time for all content endpoints.
- Use an allowlist-based HTML sanitizer if rich text is required; otherwise store plain text only.
- Add output-encoding guidance and tests for dangerous payloads (`<script>`, event handlers, `javascript:` URLs).

**Example secure approach**
```js
// Example pattern in service layer
const sanitizeHtml = require('sanitize-html');

function cleanText(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
```

## Priority 2 (Should Fix)

### 2) CSRF defenses are not explicit; safety is currently architecture-dependent
**Severity**: Medium  
**Category**: OWASP A01/A05 (Access/control misconfiguration pattern)

**Evidence**
- API relies on Bearer token checks for write operations (`src/app.js` protected methods middleware + `src/middlewares/jwt.js`).
- CORS is enabled with credentials and allowlist origin callback: `src/middlewares/cors.js`.
- No explicit CSRF middleware/token verification found in runtime path.
- No cookie-based auth evidence found in current codebase (no `res.cookie`/`Set-Cookie` usage), reducing immediate CSRF exploitability.

**Why this matters**
- Current approach is generally safe while auth stays strictly header-based.
- If cookie auth is introduced later (or token transport changes), write endpoints become CSRF-prone without additional controls.

**Recommended Fix**
- Keep JWT strictly in `Authorization` header and document this invariant.
- Add explicit Origin/Referer checks for state-changing requests as defense-in-depth.
- If cookies are introduced, implement CSRF token protection (`double-submit` or synchronizer token) and strict `SameSite` policy.

## Priority 3 (Improve)

### 3) Security headers middleware not present
**Severity**: Low  
**Category**: OWASP A05 Security Misconfiguration

**Evidence**
- App middleware stack does not include hardening headers middleware (`src/app.js`).
- Dependencies currently include `cors`, but no `helmet` package in `package.json`.

**Recommended Fix**
- Add `helmet` with a CSP tuned to frontend requirements.
- Disable `x-powered-by` and define explicit `referrerPolicy`, `frameguard`, and MIME sniffing protections.

### 4) Internal error messages are returned to clients
**Severity**: Low  
**Category**: Information disclosure hardening

**Evidence**
- Error handler returns `err.message` directly: `src/app.js`.

**Recommended Fix**
- Return generic message for 5xx responses, keep detailed errors only in logs.

## SQL Injection Assessment
**Result**: No direct SQL Injection path identified in reviewed routes.

**Evidence**
- Repository layer uses Prisma model operations (`findUnique`, `findMany`, `create`, `update`, `delete`, `upsert`) across all modules.
- No raw SQL usage identified in route/controller/service/repository code paths (`$queryRawUnsafe`, string-concatenated SQL, manual SQL execution not present).

**Residual Risk**
- Future introduction of raw SQL/dynamic sorting/filtering can re-open risk; keep allowlists and avoid unsafe raw query APIs.

## LLM Prompt Injection Assessment
**Result**: Not currently applicable in runtime API.

**Evidence**
- No LLM SDK usage or prompt-building pipeline found in API source paths.

**Residual Risk**
- If AI features are added later, enforce prompt isolation, input sanitization, output filtering, tool-call allowlists, and data classification boundaries.

## Route Coverage Matrix
- `POST /api/auth/login`: reviewed for CSRF and injection behavior
- `POST /api/auth/mfa`: reviewed for CSRF and auth-token transport assumptions
- `POST /api/auth/logout`: reviewed for CSRF/auth assumptions
- All CRUD write routes under:
  - `/api/home`
  - `/api/testimonials` and `/api/testimonials/entries`
  - `/api/how-we-work`
  - `/api/services` and `/api/services/cards`
  - `/api/clients` and `/api/clients/companies`
  - `/api/blog` and `/api/blog/posts`
  - `/api/config`
  - `/api/users`
- Read routes were also reviewed for exposure behavior and returned payloads.

## Recommended Security Test Cases
1. Stored-XSS payload insertion tests in every writable text/json field.
2. CSRF simulation tests (cross-origin form post/fetch) for all state-changing endpoints.
3. SQLi payload fuzzing on all ID/query/body inputs to confirm Prisma-layer immunity.
4. Negative tests to ensure 5xx responses do not expose internal error details.

## Automated Tests Implemented
- Test framework configured:
  - `vitest.config.js`
  - `tests/setup-env.js`
- Test files added:
  - `tests/security/api-smoke.test.js`
  - `tests/security/rate-limit.test.js`
  - `tests/security/sanitize.test.js`
  - `tests/security/csrf.test.js`
  - `tests/security/security-headers.test.js`
  - `tests/security/services-sanitization.test.js`
- Package scripts updated:
  - `npm test` -> `vitest run`
  - `npm run test:watch` -> `vitest`
