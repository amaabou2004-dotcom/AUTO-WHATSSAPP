import { describe, expect, it } from 'vitest';

import { healthResponseSchema, errorEnvelopeSchema } from '@whatsauto/contracts';

import { createApp } from '../src/app.js';

const app = createApp({
  ENVIRONMENT: 'test',
  APP_VERSION: '1.2.3',
  API_ALLOWED_ORIGINS: 'https://app.example.com',
});

describe('GET /api/v1/health', () => {
  it('répond 200 avec un corps conforme au contrat', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    const parsed = healthResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('ok');
      expect(parsed.data.version).toBe('1.2.3');
    }
  });

  it('expose un identifiant de corrélation', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('réutilise un X-Request-Id valide fourni par le client', async () => {
    const res = await app.request('/api/v1/health', {
      headers: { 'x-request-id': 'client-req-1234' },
    });
    expect(res.headers.get('x-request-id')).toBe('client-req-1234');
  });

  it('remplace un X-Request-Id mal formé', async () => {
    const res = await app.request('/api/v1/health', { headers: { 'x-request-id': 'bad id!?' } });
    expect(res.headers.get('x-request-id')).not.toBe('bad id!?');
  });

  it('est aussi disponible sans préfixe (supervision)', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/meta', () => {
  it("renvoie l'identité configurable et les langues", async () => {
    const res = await app.request('/api/v1/meta');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body['brand']).toMatchObject({ name: 'Amsali' });
    expect(body['locales']).toEqual([
      { code: 'fr', direction: 'ltr' },
      { code: 'en', direction: 'ltr' },
    ]);
  });

  it("déclare une direction RTL pour l'arabe", async () => {
    const rtlApp = createApp({ ENABLED_LOCALES: 'fr,ar' });
    const res = await rtlApp.request('/api/v1/meta');
    const body = (await res.json()) as { locales: Array<{ code: string; direction: string }> };
    expect(body.locales.find((l) => l.code === 'ar')?.direction).toBe('rtl');
  });

  it('ne divulgue aucun secret', async () => {
    const res = await app.request('/api/v1/meta');
    const text = await res.text();
    expect(text).not.toMatch(/key|secret|token|password/i);
  });
});

describe('routes inconnues', () => {
  it("répond 404 avec l'enveloppe d'erreur standard", async () => {
    const res = await app.request('/api/v1/does-not-exist');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(errorEnvelopeSchema.safeParse(body).success).toBe(true);
  });
});

describe('CORS', () => {
  it('autorise une origine configurée', async () => {
    const res = await app.request('/api/v1/health', {
      headers: { Origin: 'https://app.example.com' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
  });

  it('refuse une origine non configurée', async () => {
    const res = await app.request('/api/v1/health', {
      headers: { Origin: 'https://evil.example.net' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('répond aux requêtes préliminaires', async () => {
    const res = await app.request('/api/v1/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization',
      },
    });
    expect(res.status).toBeLessThan(300);
  });
});

describe('en-têtes de sécurité', () => {
  it('ajoute les en-têtes de durcissement', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });
});
