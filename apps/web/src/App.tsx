import { useEffect, useState } from 'react';

import { StatusPanel } from './components/StatusPanel.js';
import { detectLocale, isLocale, isRtl, translate, type Locale } from './lib/i18n.js';

type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    if (stored && isLocale(stored)) return stored;
    return detectLocale(navigator.languages ?? [navigator.language]);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = (key: string) => translate(locale, key);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-brand-500">WhatsAuto AI</p>
          <h1 className="mt-1 text-3xl font-semibold">{t('app.title')}</h1>
          <p className="mt-1 text-sm text-neutral-400">{t('app.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="locale">
            Langue
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('theme.toggle')}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {theme === 'dark' ? '☀︎' : '☾'}
          </button>
        </div>
      </header>

      <main>
        <StatusPanel locale={locale} />
      </main>

      <footer className="mt-auto border-t border-neutral-800 pt-4 text-xs text-neutral-500">
        {t('footer.note')}
      </footer>
    </div>
  );
}
