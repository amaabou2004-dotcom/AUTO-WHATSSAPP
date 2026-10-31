import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, LOCALES, detectLocale, isLocale, translate } from '../src/lib/i18n.js';

describe('i18n', () => {
  it('expose deux locales en Phase 3', () => {
    expect(LOCALES).toEqual(['fr', 'en']);
  });

  it('traduit dans la locale demandée', () => {
    expect(translate('fr', 'status.ok')).toBe('API opérationnelle');
    expect(translate('en', 'status.ok')).toBe('API healthy');
  });

  it('retombe sur le français pour une clé absente de la locale', () => {
    expect(translate('en', 'cle.inconnue')).toBe('cle.inconnue');
    expect(DEFAULT_LOCALE).toBe('fr');
  });

  it('détecte la langue du navigateur', () => {
    expect(detectLocale(['en-GB', 'fr-FR'])).toBe('en');
    expect(detectLocale(['es-ES', 'ar'])).toBe('fr');
    expect(detectLocale(['ar-EG'])).toBe('fr');
    expect(detectLocale([])).toBe('fr');
  });

  it('valide les codes de locale', () => {
    expect(isLocale('fr')).toBe(true);
    expect(isLocale('fr-FR')).toBe(false);
    expect(isLocale('xx')).toBe(false);
  });
});
