import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from '../lib/api.js';
import { translate, type Locale } from '../lib/i18n.js';

export function StatusPanel({ locale }: { locale: Locale }) {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const t = (key: string) => translate(locale, key);

  return (
    <section
      aria-labelledby="status-heading"
      className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="status-heading" className="text-lg font-semibold">
          {t('status.title')}
        </h2>
        <StatusBadge
          state={
            query.isPending ? 'loading' : query.isError ? 'down' : (query.data?.status ?? 'down')
          }
          label={(state) => t(`status.${state}`)}
        />
      </div>

      {query.isPending ? (
        <p className="mt-4 text-sm text-neutral-400">{t('status.loading')}</p>
      ) : null}

      {query.isError ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-red-400">{t('status.error')}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {t('status.retry')}
          </button>
        </div>
      ) : null}

      {query.data ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-400">{t('status.version')}</dt>
            <dd className="font-mono">{query.data.version}</dd>
          </div>
          <div>
            <dt className="text-neutral-400">{t('status.checks')}</dt>
            <dd className="font-mono">
              {Object.entries(query.data.checks)
                .map(([name, check]) => `${name}: ${check.status}`)
                .join(' · ') || '—'}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

type StatusState = 'loading' | 'ok' | 'degraded' | 'down';

const STATE_STYLES: Record<StatusState, string> = {
  loading: 'bg-neutral-800 text-neutral-300',
  ok: 'bg-emerald-500/15 text-emerald-300',
  degraded: 'bg-amber-500/15 text-amber-300',
  down: 'bg-red-500/15 text-red-300',
};

function StatusBadge({
  state,
  label,
}: {
  state: StatusState;
  label: (state: StatusState) => string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${STATE_STYLES[state]}`}
      role="status"
      aria-live="polite"
    >
      {label(state)}
    </span>
  );
}
