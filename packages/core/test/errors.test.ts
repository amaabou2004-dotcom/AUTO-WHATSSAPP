import { describe, expect, it } from 'vitest';
import { AppError, statusForError, toErrorEnvelope } from '../src/errors.js';

describe('AppError', () => {
  it('associe un statut HTTP à chaque code', () => {
    expect(new AppError('window_closed').status).toBe(409);
    expect(new AppError('quota_exceeded').status).toBe(402);
    expect(new AppError('forbidden').status).toBe(403);
    expect(new AppError('internal_error').status).toBe(500);
  });

  it('transmet les détails publics', () => {
    const envelope = toErrorEnvelope(
      new AppError('validation_failed', 'Champ invalide', { field: 'phone_e164' }),
      'req-1',
    );
    expect(envelope.error).toEqual({
      code: 'validation_failed',
      message: 'Champ invalide',
      details: { field: 'phone_e164' },
      request_id: 'req-1',
    });
  });
});

describe('toErrorEnvelope', () => {
  it("ne divulgue jamais le détail d'une erreur inconnue", () => {
    const envelope = toErrorEnvelope(new Error('password=hunter2 at db.js:42'), 'req-2');
    expect(envelope.error.code).toBe('internal_error');
    expect(JSON.stringify(envelope)).not.toContain('hunter2');
    expect(JSON.stringify(envelope)).not.toContain('db.js');
  });

  it('convertit une valeur non-Error', () => {
    expect(toErrorEnvelope('boom', 'req-3').error.code).toBe('internal_error');
  });
});

describe('statusForError', () => {
  it('retourne 500 pour une erreur inconnue', () => {
    expect(statusForError(new Error('x'))).toBe(500);
  });

  it('retourne le statut du code applicatif', () => {
    expect(statusForError(new AppError('rate_limited'))).toBe(429);
  });
});
