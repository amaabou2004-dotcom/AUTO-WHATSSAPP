import { describe, expect, it } from 'vitest';
import { asE164, countryDialCodeOf, isE164, maskPhone, normalizeToE164 } from '../src/phone.js';

describe('normalizeToE164', () => {
  it('conserve un numéro déjà au format international', () => {
    expect(normalizeToE164('+22790123456')).toBe('+22790123456');
  });

  it("supprime les séparateurs d'une saisie lisible", () => {
    expect(normalizeToE164('+227 90 12 34 56')).toBe('+22790123456');
    expect(normalizeToE164('+33 (0)6 12 34 56 78')).toBe('+330612345678');
  });

  it('convertit le préfixe international 00', () => {
    expect(normalizeToE164('0022790123456')).toBe('+22790123456');
  });

  it("applique l'indicatif par défaut et retire le 0 national", () => {
    expect(normalizeToE164('90123456', '+227')).toBe('+22790123456');
    expect(normalizeToE164('06 12 34 56 78', '+33')).toBe('+33612345678');
  });

  it('refuse une saisie sans indicatif exploitable', () => {
    expect(normalizeToE164('90123456')).toBeNull();
    expect(normalizeToE164('')).toBeNull();
    expect(normalizeToE164('   ')).toBeNull();
  });

  it('refuse les numéros trop courts ou trop longs', () => {
    expect(normalizeToE164('+123456')).toBeNull();
    expect(normalizeToE164('+1234567890123456')).toBeNull();
  });

  it("refuse un indicatif commençant par zéro (E.164 l'interdit)", () => {
    expect(normalizeToE164('+0123456789')).toBeNull();
  });
});

describe('isE164 / asE164', () => {
  it('valide la forme', () => {
    expect(isE164('+22790123456')).toBe(true);
    expect(isE164('22790123456')).toBe(false);
  });

  it('lève une erreur sans divulguer le numéro complet', () => {
    expect(() => asE164('abc')).toThrowError(/E\.164/);
    expect(() => asE164('abc')).not.toThrowError(/abc/);
  });
});

describe('maskPhone', () => {
  it('masque le centre du numéro', () => {
    expect(maskPhone('+22790123456')).toBe('+2279****56');
  });

  it('masque totalement une valeur trop courte', () => {
    expect(maskPhone('+1234')).toBe('***');
  });
});

describe('countryDialCodeOf', () => {
  it('choisit le préfixe le plus long', () => {
    expect(countryDialCodeOf('+22790123456', ['+2', '+22', '+227'])).toBe('+227');
  });

  it('retourne null si aucun préfixe ne correspond', () => {
    expect(countryDialCodeOf('+22790123456', ['+33'])).toBeNull();
  });
});
