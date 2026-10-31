/**
 * Internationalisation minimale (Phase 3).
 *
 * Le catalogue complet (8 langues, chargement à la demande, types générés)
 * arrive en Phase 14. Ce module pose la bonne structure dès maintenant :
 * aucune chaîne affichable ne doit être écrite directement dans un composant.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

const CATALOGS: Record<Locale, Record<string, string>> = {
  fr: {
    'app.title': 'Console',
    'app.subtitle': 'Fondations du monorepo — phase 3',
    'status.title': "État de l'API",
    'status.loading': 'Vérification en cours…',
    'status.ok': 'API opérationnelle',
    'status.degraded': 'API dégradée',
    'status.down': 'API injoignable',
    'status.error': "Impossible de contacter l'API",
    'status.version': 'Version',
    'status.checks': 'Vérifications',
    'status.retry': 'Réessayer',
    'theme.toggle': 'Changer de thème',
    'footer.note': 'Aucune donnée de démonstration : cet écran n’affiche que des résultats réels.',
  },
  en: {
    'app.title': 'Console',
    'app.subtitle': 'Monorepo foundations — phase 3',
    'status.title': 'API status',
    'status.loading': 'Checking…',
    'status.ok': 'API healthy',
    'status.degraded': 'API degraded',
    'status.down': 'API unreachable',
    'status.error': 'Could not reach the API',
    'status.version': 'Version',
    'status.checks': 'Checks',
    'status.retry': 'Retry',
    'theme.toggle': 'Toggle theme',
    'footer.note': 'No demo data: this screen only shows real results.',
  },
};

const RTL_LANGUAGES = new Set(['ar', 'arc', 'fa', 'he', 'ur']);

/** La direction est une propriété de la langue, jamais du pays. */
export function isRtl(locale: string): boolean {
  return RTL_LANGUAGES.has(locale.split('-')[0] ?? '');
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function translate(locale: Locale, key: string): string {
  const catalog = CATALOGS[locale];
  return catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
}

export function detectLocale(languages: readonly string[] = []): Locale {
  for (const language of languages) {
    const base = language.split('-')[0]?.toLowerCase() ?? '';
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
