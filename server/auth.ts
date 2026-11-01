import { createHash, timingSafeEqual } from 'node:crypto';
import { Router, type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

const TOKEN_ISSUER = 'autowhatsapp';
const TOKEN_AUDIENCE = 'autowhatsapp-workspace';
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export interface AuthConfig {
  email: string;
  password: string;
  secret: string;
  sessionHours: number;
  demo: boolean;
}

export function getAuthConfig(): AuthConfig {
  const demo = process.env.NODE_ENV !== 'production';
  const email = (process.env.ADMIN_EMAIL || (demo ? 'admin@demo.local' : '')).trim().toLocaleLowerCase();
  const password = process.env.ADMIN_PASSWORD || (demo ? 'demo1234' : '');
  const secret = process.env.AUTH_SECRET || (demo ? 'demo-secret-local-autowhatsapp-not-for-production' : '');
  const requestedHours = Number(process.env.AUTH_SESSION_HOURS || 12);
  const sessionHours = Number.isFinite(requestedHours) ? Math.min(Math.max(requestedHours, 1), 168) : 12;

  if (!email.includes('@') || !password || !secret) {
    throw new Error('Authentification incomplète : ADMIN_EMAIL, ADMIN_PASSWORD et AUTH_SECRET sont requis en production.');
  }
  if (!demo && password.length < 12) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères en production.');
  }
  if (!demo && secret.length < 32) {
    throw new Error('AUTH_SECRET doit contenir au moins 32 caractères en production.');
  }
  return { email, password, secret, sessionHours, demo };
}

function secureCompare(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function createSessionToken(config: AuthConfig): string {
  return jwt.sign({ email: config.email }, config.secret, {
    subject: 'workspace-admin',
    expiresIn: config.sessionHours * 3_600,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

export function verifySessionToken(config: AuthConfig, token: string): boolean {
  try {
    const payload = jwt.verify(token, config.secret, { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE });
    return typeof payload === 'object' && payload.sub === 'workspace-admin' && payload.email === config.email;
  } catch {
    return false;
  }
}

export function createRequireAuth(config: AuthConfig): RequestHandler {
  return (req, res, next) => {
    const authorization = req.get('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token || !verifySessionToken(config, token)) {
      res.status(401).json({ error: 'Votre session est invalide ou a expiré. Reconnectez-vous.' });
      return;
    }
    next();
  };
}

export function createAuthRouter(config: AuthConfig): Router {
  const router = Router();
  const attempts = new Map<string, { count: number; resetAt: number }>();

  router.get('/status', (_req, res) => {
    res.json({ required: true, demo: config.demo });
  });

  router.post('/login', (req, res) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const current = attempts.get(key);
    if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({ error: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.' });
      return;
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLocaleLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const emailValid = secureCompare(email, config.email);
    const passwordValid = secureCompare(password, config.password);
    if (!emailValid || !passwordValid) {
      const previous = current && current.resetAt > now ? current : { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
      attempts.set(key, { count: previous.count + 1, resetAt: previous.resetAt });
      res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
      return;
    }

    attempts.delete(key);
    res.json({
      token: createSessionToken(config),
      user: { email: config.email },
      expiresIn: config.sessionHours * 3_600,
    });
  });

  router.get('/me', createRequireAuth(config), (_req, res) => {
    res.json({ user: { email: config.email } });
  });

  return router;
}
