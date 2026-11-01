import type { RepeatFrequency } from '../shared/types.js';
import { addActivity, createId, JsonStore } from './store.js';
import { sendWhatsAppMessage } from './whatsapp.js';

type Sender = typeof sendWhatsAppMessage;

function nextOccurrence(current: string, frequency: RepeatFrequency, now: Date): string {
  const next = new Date(current);
  do {
    if (frequency === 'daily') next.setDate(next.getDate() + 1);
    if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  } while (next.getTime() <= now.getTime());
  return next.toISOString();
}

export async function processDueSchedules(store: JsonStore, sender: Sender = sendWhatsAppMessage): Promise<number> {
  const now = new Date();
  const due = store.snapshot.schedules
    .filter((schedule) => schedule.status === 'scheduled' && new Date(schedule.scheduledFor) <= now)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  let processed = 0;
  for (const item of due) {
    const current = store.snapshot.schedules.find((schedule) => schedule.id === item.id);
    if (!current || current.status !== 'scheduled') continue;
    const contact = store.snapshot.contacts.find((candidate) => candidate.id === current.contactId);
    if (!contact) {
      store.update((data) => {
        const schedule = data.schedules.find((candidate) => candidate.id === current.id);
        if (schedule) {
          schedule.status = 'failed';
          schedule.lastError = 'Contact introuvable';
        }
      });
      continue;
    }

    try {
      await sender(contact.phone, current.message);
      store.update((data) => {
        const schedule = data.schedules.find((candidate) => candidate.id === current.id);
        if (!schedule || schedule.status !== 'scheduled') return;
        const sentAt = new Date().toISOString();
        schedule.status = 'sent';
        schedule.sentAt = sentAt;
        data.messages.push({
          id: createId('message'),
          contactId: contact.id,
          body: current.message,
          direction: 'outbound',
          source: 'schedule',
          status: 'sent',
          createdAt: sentAt,
        });
        const storedContact = data.contacts.find((candidate) => candidate.id === contact.id);
        if (storedContact) storedContact.lastInteraction = sentAt;
        addActivity(data, 'message_sent', 'Message programmé envoyé', `Votre message pour ${contact.name} a bien été envoyé.`);

        if (schedule.repeat !== 'none') {
          data.schedules.push({
            id: createId('schedule'),
            contactId: contact.id,
            message: schedule.message,
            scheduledFor: nextOccurrence(schedule.scheduledFor, schedule.repeat, new Date()),
            repeat: schedule.repeat,
            status: 'scheduled',
            createdAt: sentAt,
          });
        }
      });
    } catch (error) {
      store.update((data) => {
        const schedule = data.schedules.find((candidate) => candidate.id === current.id);
        if (schedule) {
          schedule.status = 'failed';
          schedule.lastError = error instanceof Error ? error.message : 'Erreur inconnue';
        }
        data.messages.push({
          id: createId('message'), contactId: contact.id, body: current.message,
          direction: 'outbound', source: 'schedule', status: 'failed', createdAt: new Date().toISOString(),
        });
      });
    }
    processed += 1;
  }
  return processed;
}

export function startScheduler(store: JsonStore): () => void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processDueSchedules(store);
    } catch (error) {
      console.error('[scheduler]', error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, 15_000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
