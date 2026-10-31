import { describe, expect, it } from 'vitest';
import { evaluateQuota } from '../src/quota.js';

describe('evaluateQuota', () => {
  it('autorise quand la limite est illimitée', () => {
    const result = evaluateQuota({ used: 10_000, limit: null, policy: 'block' });
    expect(result).toEqual({ status: 'ok', allowed: true, billable: false, remaining: null });
  });

  it('autorise sous le seuil', () => {
    const result = evaluateQuota({ used: 100, limit: 1000, policy: 'block' });
    expect(result.status).toBe('ok');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(899);
  });

  it('avertit au-delà du seuil sans bloquer', () => {
    const result = evaluateQuota({ used: 850, limit: 1000, policy: 'block' });
    expect(result.status).toBe('warning');
    expect(result.allowed).toBe(true);
  });

  it('bloque au-delà de la limite avec la politique block', () => {
    const result = evaluateQuota({ used: 1000, limit: 1000, policy: 'block', requested: 1 });
    expect(result).toMatchObject({
      status: 'exceeded',
      allowed: false,
      billable: false,
      remaining: 0,
    });
  });

  it('laisse passer et facture avec la politique bill', () => {
    const result = evaluateQuota({ used: 1000, limit: 1000, policy: 'bill', requested: 5 });
    expect(result).toMatchObject({ status: 'exceeded', allowed: true, billable: true });
  });

  it('laisse passer sans facturer avec la politique warn', () => {
    const result = evaluateQuota({ used: 1200, limit: 1000, policy: 'warn' });
    expect(result).toMatchObject({ status: 'exceeded', allowed: true, billable: false });
  });

  it('tient compte de la quantité demandée', () => {
    const result = evaluateQuota({ used: 995, limit: 1000, policy: 'block', requested: 10 });
    expect(result.allowed).toBe(false);
  });

  it("respecte un seuil d'alerte personnalisé", () => {
    const result = evaluateQuota({ used: 500, limit: 1000, policy: 'block', warnRatio: 0.5 });
    expect(result.status).toBe('warning');
  });

  it('rejette des entrées incohérentes', () => {
    expect(() => evaluateQuota({ used: -1, limit: 10, policy: 'block' })).toThrowError();
    expect(() => evaluateQuota({ used: 0, limit: -5, policy: 'block' })).toThrowError();
    expect(() =>
      evaluateQuota({ used: 0, limit: 10, policy: 'block', requested: 0 }),
    ).toThrowError();
    expect(() =>
      evaluateQuota({ used: 0, limit: 10, policy: 'block', warnRatio: 0 }),
    ).toThrowError();
  });
});
