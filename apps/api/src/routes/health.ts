import { Hono } from 'hono';

import type { HealthResponse } from '@whatsauto/contracts';

import type { AppVariables } from '../middleware/request-context.js';

/**
 * Santé de l'API.
 *
 * Ne prétend pas vérifier des dépendances qui n'existent pas encore :
 * chaque vérification est ajoutée ici au moment où le composant est branché
 * (base en Phase 6, files et Meta en Phase 7/8, IA en Phase 9).
 */
export const healthRoutes = new Hono<{ Variables: AppVariables }>();

healthRoutes.get('/health', (c) => {
  const config = c.get('config');

  const checks: HealthResponse['checks'] = {
    runtime: { status: 'ok' },
  };

  const response: HealthResponse = {
    status: 'ok',
    version: config.version,
    checks,
  };

  return c.json(response, 200);
});
