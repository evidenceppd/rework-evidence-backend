'use strict';

const app = require('../../src/app');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (!server) {
    return;
  }
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
});

describe('API smoke checks', () => {
  it('returns healthy status on health endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns application info on root endpoint', async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.name).toBe('rework-evidence');
  });

  it('rejects protected write without token', async () => {
    const response = await fetch(`${baseUrl}/api/home`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.status).toBe('error');
  });

  it('rejects untrusted origin with 403', async () => {
    const response = await fetch(`${baseUrl}/api/home`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://evil.local',
      },
      body: '{}',
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.status).toBe('error');
  });
});
