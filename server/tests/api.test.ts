import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import type { ScheduleWithContact } from '../../shared/types.js';
import { apiErrorHandler, createApiRouter } from '../routes.js';
import { JsonStore } from '../store.js';

let directory: string;
let store: JsonStore;
let server: Server;
let baseUrl: string;
const providerCalls: Array<{ to: string; body: string }> = [];

before(async () => {
  directory = mkdtempSync(join(tmpdir(), 'autowhatsapp-api-test-'));
  store = new JsonStore(join(directory, 'store.json'));
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter(store, async (to, body) => {
    providerCalls.push({ to, body });
    return { providerMessageId: 'provider_test', demo: true };
  }));
  app.use('/api', apiErrorHandler);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(directory, { recursive: true, force: true });
});

describe('API de planification et chatbot', () => {
  it('teste une règle sans envoyer de message', async () => {
    const response = await fetch(`${baseUrl}/chatbot/test`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Je veux suivre ma commande' }),
    });
    const result = await response.json() as { matched: boolean; rule: { id: string } };
    assert.equal(response.status, 200);
    assert.equal(result.matched, true);
    assert.equal(result.rule.id, 'rule_order');
    assert.equal(providerCalls.length, 0);
  });

  it('crée puis annule un message programmé', async () => {
    const contact = store.snapshot.contacts[0];
    const createResponse = await fetch(`${baseUrl}/schedules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: contact.id, message: 'Rappel de test', repeat: 'none',
        scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    });
    const schedule = await createResponse.json() as ScheduleWithContact;
    assert.equal(createResponse.status, 201);
    assert.equal(schedule.status, 'scheduled');
    assert.equal(schedule.contact?.id, contact.id);

    const cancelResponse = await fetch(`${baseUrl}/schedules/${schedule.id}`, { method: 'DELETE' });
    assert.equal(cancelResponse.status, 204);
    assert.equal(store.snapshot.schedules.find((item) => item.id === schedule.id)?.status, 'cancelled');
  });

  it('reçoit un message WhatsApp et déclenche la réponse automatique', async () => {
    const contact = store.snapshot.contacts[0];
    const previousTriggers = store.snapshot.rules.find((rule) => rule.id === 'rule_welcome')!.triggerCount;
    const response = await fetch(`${baseUrl}/webhooks/whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{ changes: [{ value: {
          contacts: [{ wa_id: contact.phone.replace(/\D/g, ''), profile: { name: contact.name } }],
          messages: [{ from: contact.phone.replace(/\D/g, ''), type: 'text', text: { body: 'Bonjour !' } }],
        } }] }],
      }),
    });
    assert.equal(response.status, 200);
    const relatedMessages = store.snapshot.messages.filter((message) => message.contactId === contact.id);
    assert.equal(relatedMessages.at(-2)?.direction, 'inbound');
    assert.equal(relatedMessages.at(-1)?.source, 'chatbot');
    assert.equal(store.snapshot.rules.find((rule) => rule.id === 'rule_welcome')?.triggerCount, previousTriggers + 1);
    assert.equal(providerCalls.length, 1);
    assert.equal(providerCalls[0].body, store.snapshot.rules.find((rule) => rule.id === 'rule_welcome')?.response);
  });
});
