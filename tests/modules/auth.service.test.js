'use strict';

// Spy on nodemailer.createTransport BEFORE requiring any module that depends on it.
// This ensures mailer.js captures a mock transporter (never connects to SMTP server).
const nodemailer = require('nodemailer');
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail: mockSendMail });

const authService = require('../../src/modules/auth/auth.service');
const repo = require('../../src/modules/auth/auth.repository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('authService.login', () => {
  it('throws 400 when email is missing', async () => {
    await expect(authService.login('', 'password')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('throws 400 when password is missing', async () => {
    await expect(authService.login('user@test.com', '')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('throws 401 for unknown email (user not found)', async () => {
    vi.spyOn(repo, 'findUserByEmail').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(authService.login('unknown@test.com', 'pass')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('throws 401 for wrong password', async () => {
    vi.spyOn(repo, 'findUserByEmail').mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: '$2a$12$hash',
      active: true,
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(authService.login('user@test.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('throws 401 for inactive user', async () => {
    vi.spyOn(repo, 'findUserByEmail').mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: '$2a$12$hash',
      active: false,
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    await expect(authService.login('user@test.com', 'pass')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('returns mfaToken and stores MFA code on success', async () => {
    vi.spyOn(repo, 'findUserByEmail').mockResolvedValue({
      id: 'user-1',
      email: 'user@test.com',
      passwordHash: '$2a$12$hash',
      active: true,
    });
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const createMfaSpy = vi.spyOn(repo, 'createMfaCode').mockResolvedValue({ id: 'mfa-1' });

    const result = await authService.login('user@test.com', 'pass');

    expect(typeof result.mfaToken).toBe('string');
    expect(createMfaSpy).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
  });

  it('always runs bcrypt even when user is not found (timing attack prevention)', async () => {
    vi.spyOn(repo, 'findUserByEmail').mockResolvedValue(null);
    const compareSpy = vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(authService.login('ghost@test.com', 'pass')).rejects.toMatchObject({ status: 401 });

    expect(compareSpy).toHaveBeenCalledOnce();
  });
});

// ─── verifyMfa ───────────────────────────────────────────────────────────────

describe('authService.verifyMfa', () => {
  it('throws 400 when mfaToken is missing', async () => {
    await expect(authService.verifyMfa('', '123456')).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when code is missing', async () => {
    await expect(authService.verifyMfa('some-token', '')).rejects.toMatchObject({ status: 400 });
  });

  it('throws 401 when mfaToken has invalid signature', async () => {
    await expect(authService.verifyMfa('invalid.token.here', '123456')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid or expired MFA token',
    });
  });

  it('throws 401 when token scope is not mfa', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'access', jti: 'jti-1' });

    await expect(authService.verifyMfa('valid-token', '123456')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid token scope',
    });
  });

  it('throws 401 when no active MFA code exists', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa' });
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue(null);

    await expect(authService.verifyMfa('valid-token', '123456')).rejects.toMatchObject({
      status: 401,
      message: 'MFA code expired or not found',
    });
  });

  it('throws 401 when code does not match', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa' });

    // Hash of '000000'
    const crypto = require('node:crypto');
    const wrongHash = crypto.createHash('sha256').update('999999').digest('hex');
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: wrongHash });
    vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });

    await expect(authService.verifyMfa('valid-token', '000000')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid MFA code',
    });

    expect(repo.markMfaCodeUsed).toHaveBeenCalledWith('mfa-1');
  });

  it('marks the code as used even on mismatch (brute-force prevention)', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa' });
    const crypto = require('node:crypto');
    const correctHash = crypto.createHash('sha256').update('123456').digest('hex');
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: correctHash });
    const markSpy = vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });
    vi.spyOn(repo, 'findUserById').mockResolvedValue({ id: 'user-1', active: true, role: 'ADMIN' });

    await authService.verifyMfa('valid-token', '123456');

    expect(markSpy).toHaveBeenCalledWith('mfa-1');
  });

  it('returns accessToken on successful verification', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa' });
    const crypto = require('node:crypto');
    const correctHash = crypto.createHash('sha256').update('654321').digest('hex');
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: correctHash });
    vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });
    vi.spyOn(repo, 'findUserById').mockResolvedValue({ id: 'user-1', active: true, role: 'ADMIN' });

    const result = await authService.verifyMfa('valid-token', '654321');

    expect(typeof result.accessToken).toBe('string');
  });

  it('throws 403 when user is inactive after code verification', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa' });
    const crypto = require('node:crypto');
    const correctHash = crypto.createHash('sha256').update('111111').digest('hex');
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: correctHash });
    vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });
    vi.spyOn(repo, 'findUserById').mockResolvedValue({ id: 'user-1', active: false, role: 'ADMIN' });

    await expect(authService.verifyMfa('valid-token', '111111')).rejects.toMatchObject({
      status: 403,
      message: 'Account is inactive',
    });
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('authService.logout', () => {
  it('throws 400 when token is missing', async () => {
    await expect(authService.logout('')).rejects.toMatchObject({ status: 400 });
  });

  it('throws 401 for invalid or expired token', async () => {
    await expect(authService.logout('not-a-valid-jwt')).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when token scope is not access', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1', scope: 'mfa', exp: 9999999999 });

    await expect(authService.logout('mfa-token')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid token scope',
    });
  });

  it('revokes the token on successful logout', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({
      sub: 'user-1',
      scope: 'access',
      jti: 'token-jti-abc',
      exp: 9999999999,
    });
    const revokeSpy = vi.spyOn(repo, 'revokeToken').mockResolvedValue({ jti: 'token-jti-abc' });

    await authService.logout('valid-access-token');

    expect(revokeSpy).toHaveBeenCalledWith('token-jti-abc', expect.any(Date));
  });
});
