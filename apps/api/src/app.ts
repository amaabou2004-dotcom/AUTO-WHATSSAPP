import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { statusForError, toErrorEnvelope } from '@whatsauto/core';

import { loadConfig, type Env } from './config.js';
import { requestContext, type AppVariables } from './middleware/request-context.js';
import { healthRoutes } from './routes/health.js';
import { metaRoutes } from './routes/meta.js';

export type AppEnv = { Bindings: Env; Variables: AppVariables };

export function createApp(env: Env = {}) {
  const config = loadConfig(env);
  const app = new Hono<AppEnv>();

  app.use('*', requestContext(config));
  app.use('*', secureHeaders());
  app.use(
    '/api/*',
    cors({
      origin: (origin) => (config.allowedOrigins.includes(origin) ? origin : null),
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
      allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
      credentials: false,
    }),
  );

  // Routes système (sans préfixe /api pour la supervision)
  app.route('/', healthRoutes);

  // API versionnée
  const api = new Hono<AppEnv>();
  api.route('/', healthRoutes);
  api.route('/', metaRoutes);
  app.route('/api/v1', api);

  app.notFound((c) => {
    const requestId = c.get('requestId') ?? crypto.randomUUID();
    return c.json(
      { error: { code: 'not_found', message: 'Ressource introuvable.', request_id: requestId } },
      404,
    );
  });

  app.onError((error, c) => {
    const requestId = c.get('requestId') ?? crypto.randomUUID();
    const envelope = toErrorEnvelope(error, requestId);

    // Le détail réel est journalisé côté serveur, jamais renvoyé au client.
    console.error(
      JSON.stringify({
        level: 'error',
        type: 'unhandled_error',
        request_id: requestId,
        code: envelope.error.code,
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    return c.json(envelope, statusForError(error) as 400);
  });

  return app;
}
