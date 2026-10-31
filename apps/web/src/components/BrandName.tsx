import { useQuery } from '@tanstack/react-query';

import { fetchMeta } from '../lib/api.js';

/**
 * Nom de marque affiché.
 *
 * Il provient de l'API (`/meta`), donc **configurable sans reconstruire le
 * frontend** — exigence du cahier des charges : le nom, le domaine et
 * l'identité ne doivent pas être figés dans le code de l'interface.
 * Pendant le chargement (ou si l'API est injoignable) aucun nom inventé n'est
 * affiché : un libellé neutre.
 */
export function BrandName() {
  const { data } = useQuery({
    queryKey: ['meta'],
    queryFn: fetchMeta,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return <>{data?.brand.name ?? '—'}</>;
}
