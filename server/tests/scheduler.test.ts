import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { JsonStore } from '../store.js';
import { processDueSchedules } from '../scheduler.js';

let directory: string;
let store: JsonStore;

before(() => {
  directory = mkdtempSync(join(tmpdir(), 'autowhatsapp-test-'));
  store = new JsonStore(join(directory, 'store.json'));
});

after(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('planificateur', () => {
  it('envoie uniquement les messages arrivés à échéance', async () => {
    store.update((data) => {
      const contact = data.contacts[0];
      data.schedules = [{
        id: 'schedule_due', contactId: contact.id, message: 'Test d’envoi',
        scheduledFor: new Date(Date.now() - 1_000).toISOString(), repeat: 'none',
        status: 'scheduled', createdAt: new Date().toISOString(),
      }];
      data.messages = [];
    });
    let calls = 0;
    const processed = await processDueSchedules(store, async () => {
      calls += 1;
      return { providerMessageId: 'test', demo: true };
    });
    assert.equal(processed, 1);
    assert.equal(calls, 1);
    assert.equal(store.snapshot.schedules[0].status, 'sent');
    assert.equal(store.snapshot.messages.length, 1);
    assert.equal(store.snapshot.messages[0].source, 'schedule');
  });

  it('crée la prochaine occurrence d’un envoi récurrent', async () => {
    store.update((data) => {
      const contact = data.contacts[0];
      data.schedules = [{
        id: 'schedule_repeat', contactId: contact.id, message: 'Récurrent',
        scheduledFor: new Date(Date.now() - 1_000).toISOString(), repeat: 'weekly',
        status: 'scheduled', createdAt: new Date().toISOString(),
      }];
    });
    await processDueSchedules(store, async () => ({ providerMessageId: 'test', demo: true }));
    assert.equal(store.snapshot.schedules.length, 2);
    const next = store.snapshot.schedules.find((schedule) => schedule.status === 'scheduled');
    assert.ok(next);
    assert.ok(new Date(next.scheduledFor).getTime() > Date.now());
  });
});
