import 'dotenv/config';
import express, { type Request } from 'express';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiErrorHandler, createApiRouter } from './routes.js';
import { createAuthRouter, createRequireAuth, getAuthConfig } from './auth.js';
import { startScheduler } from './scheduler.js';
import { JsonStore } from './store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const app = express();
const store = new JsonStore(process.env.DATA_FILE);
const authConfig = getAuthConfig();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// En local, le frontend et l’API partagent la même origine. En production,
// FRONTEND_URL autorise explicitement le domaine Netlify à appeler cette API.
const frontendOrigins = new Set(
  (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
);
app.use('/api', (req, res, next) => {
  const origin = req.get('origin')?.replace(/\/+$/, '');
  const originAllowed = Boolean(origin && frontendOrigins.has(origin));
  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    if (origin && frontendOrigins.size > 0 && !originAllowed) {
      res.sendStatus(403);
      return;
    }
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buffer;
  },
}));

app.use('/api/auth', createAuthRouter(authConfig));
const requireAuth = createRequireAuth(authConfig);
app.use('/api', (req, res, next) => {
  // Le health check et le webhook Meta ont leurs propres mécanismes de vérification.
  if (req.path === '/health' || req.path.startsWith('/webhooks/whatsapp')) {
    next();
    return;
  }
  requireAuth(req, res, next);
});
app.use('/api', createApiRouter(store));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route API introuvable.' }));
app.use('/api', apiErrorHandler);

const stopScheduler = startScheduler(store);

if (isProduction) {
  app.use(express.static(resolve(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(resolve(root, 'dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      const template = await readFile(resolve(root, 'index.html'), 'utf8');
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`\n  AutoWhatsApp est prêt sur http://0.0.0.0:${port}`);
  console.log(`  Mode WhatsApp : ${process.env.WHATSAPP_ACCESS_TOKEN ? 'Cloud API' : 'démonstration'}\n`);
});

function shutdown(): void {
  stopScheduler();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
