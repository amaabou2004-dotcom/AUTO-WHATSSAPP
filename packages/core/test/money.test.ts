import { describe, expect, it } from 'vitest';
import {
  addMoney,
  applyPercentDiscount,
  formatMoney,
  minorUnitExponent,
  money,
  multiplyMoney,
} from '../src/money.js';

describe('minorUnitExponent', () => {
  it('connaît les devises sans décimale', () => {
    expect(minorUnitExponent('XOF')).toBe(0);
    expect(minorUnitExponent('xaf')).toBe(0);
    expect(minorUnitExponent('JPY')).toBe(0);
  });

  it('connaît les devises à 2 et 3 décimales', () => {
    expect(minorUnitExponent('EUR')).toBe(2);
    expect(minorUnitExponent('USD')).toBe(2);
    expect(minorUnitExponent('KWD')).toBe(3);
  });
});

describe('money', () => {
  it('refuse un montant non entier', () => {
    expect(() => money(12.5, 'EUR')).toThrowError(/entier/);
  });

  it('refuse une devise mal formée', () => {
    expect(() => money(100, 'eur')).toThrowError(/Devise/);
  });

  it('refuse un montant hors plage sûre', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 2, 'EUR')).toThrowError();
  });
});

describe('arithmétique', () => {
  it('additionne deux montants de même devise', () => {
    expect(addMoney(money(1500, 'XOF'), money(2500, 'XOF')).amountMinor).toBe(4000);
  });

  it('refuse de mélanger deux devises', () => {
    expect(() => addMoney(money(100, 'EUR'), money(100, 'XOF'))).toThrowError(/Devises/);
  });

  it('multiplie par une quantité', () => {
    expect(multiplyMoney(money(1900, 'USD'), 3).amountMinor).toBe(5700);
  });
});

describe('applyPercentDiscount', () => {
  it('applique une remise entière', () => {
    expect(applyPercentDiscount(money(10000, 'XOF'), 20).amountMinor).toBe(8000);
  });

  it('arrondit au plus proche (demi vers le haut) sans produire de décimales', () => {
    const result = applyPercentDiscount(money(999, 'EUR'), 15);
    expect(Number.isInteger(result.amountMinor)).toBe(true);
    expect(result.amountMinor).toBe(849);
  });

  it('refuse un pourcentage hors bornes', () => {
    expect(() => applyPercentDiscount(money(100, 'EUR'), -1)).toThrowError();
    expect(() => applyPercentDiscount(money(100, 'EUR'), 101)).toThrowError();
  });

  it('conserve la devise', () => {
    expect(applyPercentDiscount(money(5000, 'XOF'), 10).currency).toBe('XOF');
  });
});

describe('formatMoney', () => {
  it('formate le franc CFA sans décimales', () => {
    const formatted = formatMoney(money(750000, 'XOF'), 'fr-NE');
    // Les séparateurs de milliers dépendent de la locale (espace insécable fine) :
    // on vérifie la valeur numérique et l'absence de partie décimale.
    expect(formatted.replace(/\D/g, '')).toBe('750000');
    expect(formatted).toMatch(/CFA|F\b/);
  });

  it("formate l'euro avec deux décimales", () => {
    const formatted = formatMoney(money(1900, 'EUR'), 'fr-FR');
    expect(formatted).toMatch(/19,00/);
  });
});
