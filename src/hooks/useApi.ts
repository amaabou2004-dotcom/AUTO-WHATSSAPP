import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const hasData = useRef(false);

  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!hasData.current) setLoading(true);
    setError(null);
    api<T>(path)
      .then((result) => {
        if (active) {
          hasData.current = true;
          setData(result);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Erreur de chargement.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [path, version]);

  return { data, setData, loading, error, refresh };
}
