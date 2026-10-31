import { describe, expect, it, vi } from 'vitest';

import worker from '../src/index.js';
import { dispatchJob } from '../src/dispatch.js';
import type { Job, MessageBatch } from '../src/types.js';

function makeMessage(body: unknown, id = 'msg-1') {
  return {
    id,
    timestamp: new Date(),
    body,
    ack: vi.fn(),
    retry: vi.fn(),
  };
}

describe('dispatchJob', () => {
  it('route un travail vers son handler', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const job: Job = { type: 'ai.reply', idempotency_key: 'k-1', payload: {} };

    const result = await dispatchJob(job, { 'ai.reply': handler });
    expect(result.status).toBe('handled');
    expect(handler).toHaveBeenCalledOnce();
  });

  it("signale un type inconnu sans lever d'erreur", async () => {
    const result = await dispatchJob({ type: 'nope', idempotency_key: 'k', payload: null }, {});
    expect(result).toEqual({ status: 'unknown_type', reason: 'nope' });
  });

  it("rejette un travail sans clé d'idempotence", async () => {
    const result = await dispatchJob({ type: 'ai.reply', payload: {} }, {});
    expect(result.status).toBe('invalid');
  });

  it('rejette une valeur non-objet', async () => {
    expect((await dispatchJob(null, {})).status).toBe('invalid');
    expect((await dispatchJob('job', {})).status).toBe('invalid');
  });

  it("propage l'erreur du handler pour déclencher un retry", async () => {
    const handler = vi.fn().mockRejectedValue(new Error('downstream 503'));
    await expect(
      dispatchJob({ type: 'ai.reply', idempotency_key: 'k', payload: {} }, { 'ai.reply': handler }),
    ).rejects.toThrowError('downstream 503');
  });
});

describe('handler queue', () => {
  it('acquitte un message valide', async () => {
    const message = makeMessage({ type: 'unknown.job', idempotency_key: 'k', payload: {} });
    const batch: MessageBatch = { queue: 'whatsauto-jobs', messages: [message] };

    await worker.queue(batch, { ENVIRONMENT: 'test' });

    expect(message.ack).toHaveBeenCalledOnce();
    expect(message.retry).not.toHaveBeenCalled();
  });

  it('acquitte un message invalide au lieu de boucler', async () => {
    const message = makeMessage({ nonsense: true });
    await worker.queue({ queue: 'q', messages: [message] }, {});
    expect(message.ack).toHaveBeenCalledOnce();
  });

  it("planifie un retry en cas d'exception de transport", async () => {
    const message = makeMessage({ type: 'x', idempotency_key: 'k', payload: {} });
    Object.defineProperty(message, 'body', {
      get() {
        throw new Error('payload illisible');
      },
    });

    await worker.queue({ queue: 'q', messages: [message] }, {});
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    expect(message.ack).not.toHaveBeenCalled();
  });

  it('traite chaque message du lot indépendamment', async () => {
    const ok = makeMessage({ type: 'unknown.job', idempotency_key: 'a', payload: {} }, 'm1');
    const bad = makeMessage({ type: 'unknown.job' }, 'm2');

    await worker.queue({ queue: 'q', messages: [ok, bad] }, {});
    expect(ok.ack).toHaveBeenCalledOnce();
    expect(bad.ack).toHaveBeenCalledOnce();
  });
});

describe('handler scheduled', () => {
  it("ne fait rien de destructif tant qu'aucun handler n'est enregistré", async () => {
    await expect(worker.scheduled({ cron: '*/5 * * * *' }, {})).resolves.toBeUndefined();
  });
});
