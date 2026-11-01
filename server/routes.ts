import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type {
  AppData,
  AutomationRule,
  Contact,
  DashboardData,
  MatchType,
  MessageWithContact,
  RepeatFrequency,
  ScheduleWithContact,
} from '../shared/types.js';
import { findMatchingRule } from './automation.js';
import { addActivity, createId, JsonStore } from './store.js';
import { getIntegrationSettings, sendWhatsAppMessage } from './whatsapp.js';

type Sender = typeof sendWhatsAppMessage;
type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const asyncRoute = (handler: AsyncRoute): RequestHandler => (req, res, next) => {
  handler(req, res, next).catch(next);
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const validPhone = (value: string) => /^\+?[0-9\s().-]{8,22}$/.test(value);
const phoneKey = (value: string) => value.replace(/\D/g, '');
const matchTypes: MatchType[] = ['contains', 'exact', 'starts_with'];
const repeatFrequencies: RepeatFrequency[] = ['none', 'daily', 'weekly'];

function withContact(data: AppData, contactId: string): Contact | null {
  return data.contacts.find((contact) => contact.id === contactId) ?? null;
}

function scheduleWithContact(data: AppData, scheduleId: string): ScheduleWithContact | null {
  const schedule = data.schedules.find((item) => item.id === scheduleId);
  return schedule ? { ...schedule, contact: withContact(data, schedule.contactId) } : null;
}

function dayKey(value: Date | string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getDashboard(data: AppData): DashboardData {
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = dayKey(date);
    return {
      date: date.toISOString(),
      label: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', ''),
      sent: data.messages.filter((message) => message.direction === 'outbound' && message.status !== 'failed' && dayKey(message.createdAt) === key).length,
      received: data.messages.filter((message) => message.direction === 'inbound' && dayKey(message.createdAt) === key).length,
    };
  });

  return {
    stats: {
      messagesSent: data.messages.filter((message) => message.direction === 'outbound' && message.status !== 'failed').length,
      automaticReplies: data.messages.filter((message) => message.source === 'chatbot' && message.status !== 'failed').length,
      activeSchedules: data.schedules.filter((schedule) => schedule.status === 'scheduled').length,
      activeRules: data.rules.filter((rule) => rule.active).length,
      totalContacts: data.contacts.length,
    },
    chart,
    upcoming: data.schedules
      .filter((schedule) => schedule.status === 'scheduled')
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
      .slice(0, 4)
      .map((schedule) => ({ ...schedule, contact: withContact(data, schedule.contactId) })),
    activities: [...data.activities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    rules: data.rules,
  };
}

function validateRulePayload(body: unknown): Pick<AutomationRule, 'name' | 'trigger' | 'matchType' | 'response'> {
  const input = body as Record<string, unknown>;
  const name = asText(input.name);
  const trigger = asText(input.trigger);
  const response = asText(input.response);
  const matchType = asText(input.matchType) as MatchType;
  if (!name || name.length > 80) throw new HttpError(400, 'Le nom de la règle est requis (80 caractères maximum).');
  if (!trigger || trigger.length > 120) throw new HttpError(400, 'Le mot-clé est requis (120 caractères maximum).');
  if (!response || response.length > 2_000) throw new HttpError(400, 'La réponse est requise (2 000 caractères maximum).');
  if (!matchTypes.includes(matchType)) throw new HttpError(400, 'Le type de correspondance est invalide.');
  return { name, trigger, response, matchType };
}

function hasValidWebhookSignature(req: Request): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  const signature = req.get('x-hub-signature-256');
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !rawBody) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

interface IncomingWhatsAppMessage {
  from: string;
  type: string;
  text?: { body?: string };
}

export function createApiRouter(store: JsonStore, sender: Sender = sendWhatsAppMessage): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', mode: getIntegrationSettings().mode, timestamp: new Date().toISOString() });
  });

  router.get('/dashboard', (_req, res) => {
    res.json(getDashboard(store.snapshot));
  });

  router.get('/contacts', (_req, res) => {
    const contacts = [...store.snapshot.contacts].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    res.json(contacts);
  });

  router.post('/contacts', (req, res) => {
    const name = asText(req.body.name);
    const phone = asText(req.body.phone);
    const tags = Array.isArray(req.body.tags) ? req.body.tags.map(asText).filter(Boolean).slice(0, 5) : [];
    if (!name || name.length > 80) throw new HttpError(400, 'Le nom est requis (80 caractères maximum).');
    if (!validPhone(phone)) throw new HttpError(400, 'Saisissez un numéro international valide, par exemple +227 90 00 00 00.');
    if (store.snapshot.contacts.some((contact) => phoneKey(contact.phone) === phoneKey(phone))) {
      throw new HttpError(409, 'Ce numéro existe déjà dans vos contacts.');
    }
    const contact = store.update((data) => {
      const now = new Date().toISOString();
      const created: Contact = {
        id: createId('contact'), name, phone, tags, optedIn: req.body.optedIn !== false,
        lastInteraction: now, createdAt: now,
      };
      data.contacts.push(created);
      addActivity(data, 'contact_created', 'Nouveau contact ajouté', `${name} a rejoint vos contacts.`);
      return created;
    });
    res.status(201).json(contact);
  });

  router.patch('/contacts/:id', (req, res) => {
    const existing = store.snapshot.contacts.find((contact) => contact.id === req.params.id);
    if (!existing) throw new HttpError(404, 'Contact introuvable.');
    const name = req.body.name === undefined ? existing.name : asText(req.body.name);
    const phone = req.body.phone === undefined ? existing.phone : asText(req.body.phone);
    if (!name || !validPhone(phone)) throw new HttpError(400, 'Le nom ou le numéro est invalide.');
    if (store.snapshot.contacts.some((contact) => contact.id !== existing.id && phoneKey(contact.phone) === phoneKey(phone))) {
      throw new HttpError(409, 'Ce numéro existe déjà dans vos contacts.');
    }
    const updated = store.update((data) => {
      const contact = data.contacts.find((item) => item.id === existing.id)!;
      contact.name = name;
      contact.phone = phone;
      if (Array.isArray(req.body.tags)) contact.tags = req.body.tags.map(asText).filter(Boolean).slice(0, 5);
      if (typeof req.body.optedIn === 'boolean') contact.optedIn = req.body.optedIn;
      return contact;
    });
    res.json(updated);
  });

  router.get('/schedules', (_req, res) => {
    const schedules = [...store.snapshot.schedules]
      .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
      .map((schedule) => ({ ...schedule, contact: withContact(store.snapshot, schedule.contactId) }));
    res.json(schedules);
  });

  router.post('/schedules', (req, res) => {
    const contactId = asText(req.body.contactId);
    const message = asText(req.body.message);
    const scheduledFor = asText(req.body.scheduledFor);
    const repeat = asText(req.body.repeat || 'none') as RepeatFrequency;
    const contact = store.snapshot.contacts.find((item) => item.id === contactId);
    if (!contact) throw new HttpError(400, 'Sélectionnez un contact valide.');
    if (!contact.optedIn) throw new HttpError(409, 'Ce contact n’a pas accepté de recevoir vos messages.');
    if (!message || message.length > 2_000) throw new HttpError(400, 'Le message est requis (2 000 caractères maximum).');
    if (!scheduledFor || Number.isNaN(new Date(scheduledFor).getTime()) || new Date(scheduledFor).getTime() <= Date.now()) {
      throw new HttpError(400, 'Choisissez une date et une heure dans le futur.');
    }
    if (!repeatFrequencies.includes(repeat)) throw new HttpError(400, 'La fréquence de répétition est invalide.');

    const schedule = store.update((data) => {
      const created = {
        id: createId('schedule'), contactId, message, scheduledFor: new Date(scheduledFor).toISOString(),
        repeat, status: 'scheduled' as const, createdAt: new Date().toISOString(),
      };
      data.schedules.push(created);
      addActivity(data, 'schedule_created', 'Message programmé', `Un message pour ${contact.name} a été ajouté au calendrier.`);
      return created;
    });
    res.status(201).json({ ...schedule, contact });
  });

  router.delete('/schedules/:id', (req, res) => {
    const existing = store.snapshot.schedules.find((schedule) => schedule.id === req.params.id);
    if (!existing) throw new HttpError(404, 'Message programmé introuvable.');
    if (existing.status !== 'scheduled') throw new HttpError(409, 'Seul un message en attente peut être annulé.');
    store.update((data) => {
      const schedule = data.schedules.find((item) => item.id === existing.id)!;
      schedule.status = 'cancelled';
    });
    res.status(204).end();
  });

  router.get('/messages', (_req, res) => {
    const messages: MessageWithContact[] = [...store.snapshot.messages]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 150)
      .map((message) => ({ ...message, contact: withContact(store.snapshot, message.contactId) }));
    res.json(messages);
  });

  router.post('/messages', asyncRoute(async (req, res) => {
    const contactId = asText(req.body.contactId);
    const body = asText(req.body.body);
    const contact = store.snapshot.contacts.find((item) => item.id === contactId);
    if (!contact) throw new HttpError(400, 'Sélectionnez un contact valide.');
    if (!contact.optedIn) throw new HttpError(409, 'Ce contact n’a pas accepté de recevoir vos messages.');
    if (!body || body.length > 2_000) throw new HttpError(400, 'Le message est requis (2 000 caractères maximum).');
    try {
      await sender(contact.phone, body);
    } catch {
      store.update((data) => {
        data.messages.push({ id: createId('message'), contactId, body, direction: 'outbound', source: 'manual', status: 'failed', createdAt: new Date().toISOString() });
      });
      throw new HttpError(502, 'L’envoi a échoué. Vérifiez la configuration WhatsApp puis réessayez.');
    }
    const message = store.update((data) => {
      const now = new Date().toISOString();
      const created = { id: createId('message'), contactId, body, direction: 'outbound' as const, source: 'manual' as const, status: 'sent' as const, createdAt: now };
      data.messages.push(created);
      const storedContact = data.contacts.find((item) => item.id === contactId);
      if (storedContact) storedContact.lastInteraction = now;
      addActivity(data, 'message_sent', 'Message envoyé', `Votre message pour ${contact.name} a bien été envoyé.`);
      return created;
    });
    res.status(201).json({ ...message, contact });
  }));

  router.get('/rules', (_req, res) => {
    res.json(store.snapshot.rules);
  });

  router.post('/rules', (req, res) => {
    const payload = validateRulePayload(req.body);
    const rule = store.update((data) => {
      const created: AutomationRule = {
        id: createId('rule'), ...payload, active: req.body.active !== false,
        triggerCount: 0, createdAt: new Date().toISOString(),
      };
      data.rules.push(created);
      addActivity(data, 'rule_updated', 'Nouvelle automatisation', `La règle « ${created.name} » est prête.`);
      return created;
    });
    res.status(201).json(rule);
  });

  router.patch('/rules/:id', (req, res) => {
    const existing = store.snapshot.rules.find((rule) => rule.id === req.params.id);
    if (!existing) throw new HttpError(404, 'Règle introuvable.');
    const updates = req.body.name !== undefined || req.body.trigger !== undefined || req.body.response !== undefined || req.body.matchType !== undefined
      ? validateRulePayload({ ...existing, ...req.body })
      : {};
    const rule = store.update((data) => {
      const stored = data.rules.find((item) => item.id === existing.id)!;
      Object.assign(stored, updates);
      if (typeof req.body.active === 'boolean') stored.active = req.body.active;
      return stored;
    });
    res.json(rule);
  });

  router.delete('/rules/:id', (req, res) => {
    const existing = store.snapshot.rules.find((rule) => rule.id === req.params.id);
    if (!existing) throw new HttpError(404, 'Règle introuvable.');
    store.update((data) => {
      data.rules = data.rules.filter((rule) => rule.id !== existing.id);
    });
    res.status(204).end();
  });

  router.post('/chatbot/test', (req, res) => {
    const message = asText(req.body.message);
    if (!message) throw new HttpError(400, 'Saisissez un message à tester.');
    const rule = findMatchingRule(store.snapshot.rules, message);
    res.json({ matched: Boolean(rule), response: rule?.response ?? null, rule });
  });

  router.get('/settings', (_req, res) => {
    res.json(getIntegrationSettings());
  });

  router.get('/webhooks/whatsapp', (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) throw new HttpError(503, 'WHATSAPP_VERIFY_TOKEN n’est pas configuré.');
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
      res.type('text/plain').send(asText(req.query['hub.challenge']));
      return;
    }
    res.sendStatus(403);
  });

  router.post('/webhooks/whatsapp', asyncRoute(async (req, res) => {
    if (!hasValidWebhookSignature(req)) {
      res.sendStatus(401);
      return;
    }
    const payload = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: IncomingWhatsAppMessage[];
            contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
          };
        }>;
      }>;
    };

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        for (const incoming of value?.messages ?? []) {
          const body = incoming.text?.body?.trim();
          if (incoming.type !== 'text' || !body) continue;
          const phone = `+${incoming.from.replace(/\D/g, '')}`;
          const profileName = value?.contacts?.find((contact) => contact.wa_id === incoming.from)?.profile?.name;
          const contact = store.update((data) => {
            let stored = data.contacts.find((item) => phoneKey(item.phone) === phoneKey(phone));
            const now = new Date().toISOString();
            if (!stored) {
              stored = {
                id: createId('contact'), name: profileName || `Contact ${phone.slice(-4)}`, phone,
                tags: ['WhatsApp'], optedIn: true, lastInteraction: now, createdAt: now,
              };
              data.contacts.push(stored);
            }
            stored.lastInteraction = now;
            data.messages.push({
              id: createId('message'), contactId: stored.id, body, direction: 'inbound',
              source: 'incoming', status: 'received', createdAt: now,
            });
            addActivity(data, 'message_received', `Nouveau message de ${stored.name}`, body.slice(0, 100));
            return stored;
          });

          const rule = findMatchingRule(store.snapshot.rules, body);
          if (!rule) continue;
          await sender(contact.phone, rule.response);
          store.update((data) => {
            const now = new Date().toISOString();
            data.messages.push({
              id: createId('message'), contactId: contact.id, body: rule.response,
              direction: 'outbound', source: 'chatbot', status: 'sent', createdAt: now,
            });
            const storedRule = data.rules.find((item) => item.id === rule.id);
            if (storedRule) {
              storedRule.triggerCount += 1;
              storedRule.lastTriggeredAt = now;
            }
            addActivity(data, 'rule_triggered', 'Réponse automatique envoyée', `Règle « ${rule.name} » déclenchée pour ${contact.name}.`);
          });
        }
      }
    }
    res.sendStatus(200);
  }));

  return router;
}

export function apiErrorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error('[api]', error);
  res.status(500).json({ error: 'Une erreur inattendue est survenue. Réessayez dans un instant.' });
}
