'use strict';

const usersService = require('../../src/modules/users/users.service');
const repo = require('../../src/modules/users/users.repository');
const bcrypt = require('bcryptjs');
const mailer = require('../../src/config/mailer');

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── listUsers ────────────────────────────────────────────────────────────────

describe('usersService.listUsers', () => {
  it('returns all users for MASTER role', async () => {
    const users = [{ id: '1', email: 'a@test.com', role: 'ADMIN' }];
    vi.spyOn(repo, 'findAll').mockResolvedValue(users);

    const result = await usersService.listUsers('MASTER');

    expect(result).toBe(users);
    expect(repo.findAll).toHaveBeenCalledOnce();
  });

  it('returns all users for ADMIN role', async () => {
    vi.spyOn(repo, 'findAll').mockResolvedValue([]);

    await usersService.listUsers('ADMIN');

    expect(repo.findAll).toHaveBeenCalledOnce();
  });

  it('throws 403 for EDITOR role', async () => {
    await expect(usersService.listUsers('EDITOR')).rejects.toMatchObject({
      status: 403,
      message: 'Insufficient permissions',
    });
  });
});

// ─── getUser ──────────────────────────────────────────────────────────────────

describe('usersService.getUser', () => {
  it('returns user by id for MASTER', async () => {
    const user = { id: 'u-1', email: 'a@test.com', role: 'ADMIN' };
    vi.spyOn(repo, 'findById').mockResolvedValue(user);

    const result = await usersService.getUser('u-1', 'MASTER');

    expect(result).toBe(user);
  });

  it('throws 404 when user is not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(usersService.getUser('missing', 'MASTER')).rejects.toMatchObject({
      status: 404,
      message: 'User not found',
    });
  });

  it('throws 403 for EDITOR role', async () => {
    await expect(usersService.getUser('u-1', 'EDITOR')).rejects.toMatchObject({ status: 403 });
  });
});

// ─── createUser ───────────────────────────────────────────────────────────────

describe('usersService.createUser', () => {
  it('creates an EDITOR user when actor is MASTER', async () => {
    vi.spyOn(repo, 'findByEmail').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'new-1', email: 'new@test.com' });
    const createMfaCodeSpy = vi.spyOn(repo, 'createMfaCode').mockResolvedValue({ id: 'mfa-1' });
    const sendMfaCodeSpy = vi.spyOn(mailer, 'sendMfaCode').mockResolvedValue(undefined);

    await usersService.createUser(
      { email: 'new@test.com', nomeCompleto: 'New User', password: 'password123', role: 'EDITOR' },
      'MASTER',
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@test.com', role: 'EDITOR', passwordHash: 'hashed-password' }),
    );
    expect(createMfaCodeSpy).toHaveBeenCalledWith(
      'new-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(sendMfaCodeSpy).toHaveBeenCalledWith('new@test.com', expect.stringMatching(/^\d{6}$/));
  });

  it('creates an ADMIN user when actor is MASTER', async () => {
    vi.spyOn(repo, 'findByEmail').mockResolvedValue(null);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');
    const createSpy = vi.spyOn(repo, 'create').mockResolvedValue({ id: 'new-2', email: 'admin@test.com' });
    vi.spyOn(repo, 'createMfaCode').mockResolvedValue({ id: 'mfa-2' });
    vi.spyOn(mailer, 'sendMfaCode').mockResolvedValue(undefined);

    await usersService.createUser(
      { email: 'admin@test.com', nomeCompleto: 'Admin User', password: 'password123', role: 'ADMIN' },
      'MASTER',
    );

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN' }));
  });

  it('throws 403 when EDITOR tries to create a user', async () => {
    await expect(
      usersService.createUser(
        { email: 'x@test.com', nomeCompleto: 'X', password: 'password123', role: 'EDITOR' },
        'EDITOR',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('throws 403 when ADMIN tries to create an ADMIN user', async () => {
    await expect(
      usersService.createUser(
        { email: 'x@test.com', nomeCompleto: 'X', password: 'password123', role: 'ADMIN' },
        'ADMIN',
      ),
    ).rejects.toMatchObject({ status: 403, message: 'Admins can only assign editor role' });
  });

  it('throws 403 when trying to assign MASTER role via API', async () => {
    await expect(
      usersService.createUser(
        { email: 'x@test.com', nomeCompleto: 'X', password: 'password123', role: 'MASTER' },
        'MASTER',
      ),
    ).rejects.toMatchObject({ status: 403, message: 'Cannot assign master role via API' });
  });

  it('throws 400 when email is missing', async () => {
    await expect(
      usersService.createUser({ nomeCompleto: 'X', password: 'password123' }, 'MASTER'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when password is too short', async () => {
    await expect(
      usersService.createUser(
        { email: 'x@test.com', nomeCompleto: 'X', password: 'short' },
        'MASTER',
      ),
    ).rejects.toMatchObject({ status: 400, message: 'password must be at least 8 characters' });
  });

  it('throws 409 when email is already in use', async () => {
    vi.spyOn(repo, 'findByEmail').mockResolvedValue({ id: 'existing-1' });

    await expect(
      usersService.createUser(
        { email: 'taken@test.com', nomeCompleto: 'X', password: 'password123', role: 'EDITOR' },
        'MASTER',
      ),
    ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });
});

describe('usersService.sendEmailConfirmation', () => {
  it('sends a new confirmation code for an existing user', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', email: 'user@test.com', role: 'EDITOR' });
    const createMfaCodeSpy = vi.spyOn(repo, 'createMfaCode').mockResolvedValue({ id: 'mfa-1' });
    const sendMfaCodeSpy = vi.spyOn(mailer, 'sendMfaCode').mockResolvedValue(undefined);

    const result = await usersService.sendEmailConfirmation('u-1', 'MASTER');

    expect(result.emailMasked).toBe('use***@test.com');
    expect(createMfaCodeSpy).toHaveBeenCalledWith('u-1', expect.stringMatching(/^[a-f0-9]{64}$/), expect.any(Date));
    expect(sendMfaCodeSpy).toHaveBeenCalledWith('user@test.com', expect.stringMatching(/^\d{6}$/));
  });

  it('throws 404 when user is not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(usersService.sendEmailConfirmation('missing', 'MASTER')).rejects.toMatchObject({ status: 404 });
  });
});

describe('usersService.confirmEmail', () => {
  it('activates the user when confirmation code matches', async () => {
    const correctHash = require('node:crypto').createHash('sha256').update('123456').digest('hex');
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', email: 'user@test.com', role: 'EDITOR' });
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: correctHash });
    const markUsedSpy = vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'u-1', active: true });

    const result = await usersService.confirmEmail('u-1', '123456', 'MASTER');

    expect(markUsedSpy).toHaveBeenCalledWith('mfa-1');
    expect(updateSpy).toHaveBeenCalledWith('u-1', { active: true });
    expect(result.active).toBe(true);
  });

  it('throws 401 when confirmation code does not match', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', email: 'user@test.com', role: 'EDITOR' });
    vi.spyOn(repo, 'findActiveMfaCode').mockResolvedValue({ id: 'mfa-1', codeHash: 'wrong' });
    vi.spyOn(repo, 'markMfaCodeUsed').mockResolvedValue({ id: 'mfa-1' });

    await expect(usersService.confirmEmail('u-1', '123456', 'MASTER')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid confirmation code',
    });
  });
});

// ─── updateUser ───────────────────────────────────────────────────────────────

describe('usersService.updateUser', () => {
  it('updates nomeCompleto when actor is MASTER', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', role: 'EDITOR' });
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'u-1' });

    await usersService.updateUser('u-1', { nomeCompleto: 'Updated Name' }, 'MASTER');

    expect(updateSpy).toHaveBeenCalledWith('u-1', expect.objectContaining({ nomeCompleto: 'Updated Name' }));
  });

  it('throws 403 when MASTER tries to edit another MASTER', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-master', role: 'MASTER' });

    await expect(usersService.updateUser('u-master', { nomeCompleto: 'X' }, 'MASTER')).rejects.toMatchObject({
      status: 403,
      message: 'Master users cannot be edited or deleted',
    });
  });

  it('throws 403 when ADMIN tries to edit an ADMIN user', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-admin', role: 'ADMIN' });

    await expect(usersService.updateUser('u-admin', { nomeCompleto: 'X' }, 'ADMIN')).rejects.toMatchObject({
      status: 403,
      message: 'Admins can only manage editor users',
    });
  });

  it('throws 404 when user not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(usersService.updateUser('missing', { nomeCompleto: 'X' }, 'MASTER')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws 400 when no valid fields are provided', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', role: 'EDITOR' });

    await expect(usersService.updateUser('u-1', {}, 'MASTER')).rejects.toMatchObject({ status: 400 });
  });

  it('hashes new password during update', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', role: 'EDITOR' });
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash');
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'u-1' });

    await usersService.updateUser('u-1', { password: 'newpassword' }, 'MASTER');

    expect(updateSpy).toHaveBeenCalledWith('u-1', expect.objectContaining({ passwordHash: 'new-hash' }));
  });

  it('throws 409 when updated email is already taken by another user', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', role: 'EDITOR' });
    vi.spyOn(repo, 'findByEmail').mockResolvedValue({ id: 'u-other', email: 'taken@test.com' });

    await expect(
      usersService.updateUser('u-1', { email: 'taken@test.com' }, 'MASTER'),
    ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });
});

describe('usersService.updateCurrentUser', () => {
  it('allows a user to update their own password', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'admin-1', role: 'EDITOR' });
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('self-password-hash');
    const updateSpy = vi.spyOn(repo, 'update').mockResolvedValue({ id: 'admin-1' });

    await usersService.updateCurrentUser('admin-1', { password: 'newpassword' });

    expect(updateSpy).toHaveBeenCalledWith('admin-1', expect.objectContaining({ passwordHash: 'self-password-hash' }));
  });

  it('ignores role and active changes when updating the current user', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'admin-1', role: 'EDITOR' });

    await expect(
      usersService.updateCurrentUser('admin-1', { role: 'MASTER', active: false }),
    ).rejects.toMatchObject({ status: 400, message: 'No valid fields to update' });
  });
});

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('usersService.deleteUser', () => {
  it('deletes a non-master user when actor is MASTER', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-1', role: 'EDITOR' });
    const removeSpy = vi.spyOn(repo, 'remove').mockResolvedValue(undefined);

    await usersService.deleteUser('u-1', 'MASTER');

    expect(removeSpy).toHaveBeenCalledWith('u-1');
  });

  it('throws 403 when actor is not MASTER', async () => {
    await expect(usersService.deleteUser('u-1', 'ADMIN')).rejects.toMatchObject({
      status: 403,
      message: 'Only master users can delete users',
    });
  });

  it('throws 403 when trying to delete a MASTER user', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue({ id: 'u-master', role: 'MASTER' });

    await expect(usersService.deleteUser('u-master', 'MASTER')).rejects.toMatchObject({
      status: 403,
      message: 'Master users cannot be deleted',
    });
  });

  it('throws 404 when user not found', async () => {
    vi.spyOn(repo, 'findById').mockResolvedValue(null);

    await expect(usersService.deleteUser('missing', 'MASTER')).rejects.toMatchObject({ status: 404 });
  });
});
