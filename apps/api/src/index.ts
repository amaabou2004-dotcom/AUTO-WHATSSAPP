import { createApp } from './app.js';
import type { Env } from './config.js';

/**
 * Point d'entrée Cloudflare Workers.
 * `fetch` délègue à l'application Hono ; les handlers `queue`/`scheduled`
 * vivent dans `apps/worker` (séparation des responsabilités, ADR-001).
 */
const app = createApp();

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
