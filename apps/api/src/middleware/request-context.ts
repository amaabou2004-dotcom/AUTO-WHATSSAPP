import type { MiddlewareHandler } from 'hono';

import type { AppConfig } from '../config.js';

export interface AppVariables {
  requestId: string;
  config: AppConfig;
}

/** Identifiant de corrélation + configuration, attachés à chaque requête. */
export function requestContext(config: AppConfig): MiddlewareHandler<{ Variables: AppVariables }> {
  return async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const requestId =
      incoming && /^[A-Za-z0-9_-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();

    c.set('requestId', requestId);
    c.set('config', config);
    c.header('x-request-id', requestId);

    const startedAt = Date.now();
    await next();

    // Journal structuré : aucune donnée personnelle, aucun jeton, aucune IP en clair.
    const entry = {
      level: c.res.status >= 500 ? 'error' : 'info',
      type: 'http_request',
      request_id: requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      duration_ms: Date.now() - startedAt,
    };
    console.log(JSON.stringify(entry));
  };
}
