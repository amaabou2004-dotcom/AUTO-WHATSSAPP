import { describe, expect, it } from 'vitest';
import { SERVICE_WINDOW_MS, resolveSendMode, serviceWindow } from '../src/window.js';

const inbound = new Date('2026-10-31T10:00:00.000Z');

describe('serviceWindow', () => {
  it('est fermée sans message entrant', () => {
    const result = serviceWindow(null, new Date('2026-10-31T10:00:00.000Z'));
    expect(result.open).toBe(false);
    expect(result.closesAt).toBeNull();
    expect(result.remainingMs).toBe(0);
  });

  it('est ouverte juste après un message entrant', () => {
    const result = serviceWindow(inbound, new Date('2026-10-31T10:00:01.000Z'));
    expect(result.open).toBe(true);
    expect(result.closesAt?.toISOString()).toBe(
      new Date(inbound.getTime() + SERVICE_WINDOW_MS).toISOString(),
    );
  });

  it('reste ouverte 1 ms avant la limite', () => {
    const now = new Date(inbound.getTime() + SERVICE_WINDOW_MS - 1);
    expect(serviceWindow(inbound, now).open).toBe(true);
    expect(serviceWindow(inbound, now).remainingMs).toBe(1);
  });

  it('est fermée exactement à 24 h', () => {
    const now = new Date(inbound.getTime() + SERVICE_WINDOW_MS);
    const result = serviceWindow(inbound, now);
    expect(result.open).toBe(false);
    expect(result.remainingMs).toBe(0);
  });

  it('est fermée après 24 h', () => {
    const now = new Date(inbound.getTime() + SERVICE_WINDOW_MS + 60_000);
    expect(serviceWindow(inbound, now).open).toBe(false);
  });

  it("se ferme si l'horodatage est dans le futur (horloge incohérente)", () => {
    const future = new Date('2026-10-31T11:00:00.000Z');
    const result = serviceWindow(future, new Date('2026-10-31T10:00:00.000Z'));
    expect(result.open).toBe(false);
  });

  it('rejette une date invalide', () => {
    expect(() => serviceWindow(new Date('invalid'), new Date())).toThrowError();
  });
});

describe('resolveSendMode', () => {
  it('autorise le message libre dans la fenêtre', () => {
    const win = serviceWindow(inbound, new Date('2026-10-31T11:00:00Z'));
    expect(resolveSendMode(win, { hasApprovedTemplate: false })).toBe('freeform');
  });

  it('impose un modèle hors fenêtre', () => {
    const win = serviceWindow(inbound, new Date('2026-11-02T11:00:00Z'));
    expect(resolveSendMode(win, { hasApprovedTemplate: true })).toBe('template');
  });

  it('bloque hors fenêtre sans modèle approuvé', () => {
    const win = serviceWindow(inbound, new Date('2026-11-02T11:00:00Z'));
    expect(resolveSendMode(win, { hasApprovedTemplate: false })).toBe('blocked');
  });
});
