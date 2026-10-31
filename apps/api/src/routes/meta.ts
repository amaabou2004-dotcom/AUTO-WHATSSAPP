import { Hono } from 'hono';

import type { AppVariables } from '../middleware/request-context.js';

/**
 * Métadonnées publiques utilisées par le frontend.
 *
 * L'identité (nom, couleurs, logo) est configurable : elle vient de
 * l'environnement aujourd'hui, de la table `settings` en Phase 6 — sans
 * redéploiement du frontend. Aucune donnée sensible ici.
 */
export const metaRoutes = new Hono<{ Variables: AppVariables }>();

metaRoutes.get('/meta', (c) => {
  const { brand, version, enabledLocales, environment } = c.get('config');

  return c.json({
    brand,
    version,
    environment,
    locales: enabledLocales.map((code) => ({
      code,
      // La direction RTL est une propriété de la langue, pas du pays.
      direction: code.startsWith('ar') || code.startsWith('he') ? 'rtl' : 'ltr',
    })),
  });
});
