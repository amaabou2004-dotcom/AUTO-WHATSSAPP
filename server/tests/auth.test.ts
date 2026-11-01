import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { createAuthRouter, createRequireAuth, createSessionToken, verifySessionToken, type AuthConfig } from '../auth.js';

const config: AuthConfig = {
  email: 'admin@test.local',
  password: 'test-password-123',
  secret: 'test-secret-with-at-least-32-characters',
  sessionHours: 1,
  demo: false,
};

let server: Server;
let baseUrl: string;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(config));
  app.get('/api/private', createRequireAuth(config), (_req, res) => res.json({ private: true }));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function login(email: string, password: string) {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

describe('authentification', () => {
  it('crée une session signée et rejette une signature différente', () => {
    const token = createSessionToken(config);
    assert.equal(verifySessionToken(config, token), true);
    assert.equal(verifySessionToken({ ...config, secret: 'another-secret-with-32-characters' }, token), false);
  });

  it('refuse des identifiants incorrects', async () => {
    const response = await login(config.email, 'mot-de-passe-incorrect');
    assert.equal(response.status, 401);
  });

  it('protège les routes avec le token de session', async () => {
    const response = await login(config.email.toUpperCase(), config.password);
    assert.equal(response.status, 200);
    const payload = await response.json() as { token: string; user: { email: string } };
    assert.equal(payload.user.email, config.email);

    const withoutToken = await fetch(`${baseUrl}/private`);
    assert.equal(withoutToken.status, 401);
    const withToken = await fetch(`${baseUrl}/private`, { headers: { Authorization: `Bearer ${payload.token}` } });
    assert.equal(withToken.status, 200);
    const invalidToken = await fetch(`${baseUrl}/private`, { headers: { Authorization: 'Bearer token-invalide' } });
    assert.equal(invalidToken.status, 401);
  });

  it('limite les tentatives répétées de connexion', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(config.email, 'incorrect');
      assert.equal(response.status, 401);
    }
    const blocked = await login(config.email, config.password);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });
});
