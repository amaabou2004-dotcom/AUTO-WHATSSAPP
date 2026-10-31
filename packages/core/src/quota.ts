/**
 * Évaluation des quotas (extrait de la logique de plan de la Phase 12).
 * Aucune limite n'est codée en dur : elle est toujours fournie par l'appelant,
 * qui la lit depuis `plan_limits` / `quota_overrides`.
 */

export type OveragePolicy = 'block' | 'warn' | 'bill';

export interface QuotaInput {
  /** Consommation de la période. */
  readonly used: number;
  /** Limite de la période ; `null` = illimité. */
  readonly limit: number | null;
  readonly policy: OveragePolicy;
  /** Quantité demandée par l'opération en cours (par défaut 1). */
  readonly requested?: number;
  /** Seuil d'alerte anticipée, en fraction de la limite (par défaut 0.8). */
  readonly warnRatio?: number;
}

export type QuotaStatus = 'ok' | 'warning' | 'exceeded';

export interface QuotaDecision {
  readonly status: QuotaStatus;
  readonly allowed: boolean;
  /** `true` si l'opération est autorisée mais doit être facturée en dépassement. */
  readonly billable: boolean;
  readonly remaining: number | null;
}

export function evaluateQuota(input: QuotaInput): QuotaDecision {
  const { used, limit, policy } = input;
  const requested = input.requested ?? 1;
  const warnRatio = input.warnRatio ?? 0.8;

  if (!Number.isFinite(used) || used < 0) throw new Error(`Consommation invalide : ${used}`);
  if (!Number.isInteger(requested) || requested < 1)
    throw new Error(`Quantité invalide : ${requested}`);
  if (warnRatio <= 0 || warnRatio > 1) throw new Error(`Seuil d'alerte invalide : ${warnRatio}`);
  if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
    throw new Error(`Limite invalide : ${limit}`);
  }

  if (limit === null) {
    return { status: 'ok', allowed: true, billable: false, remaining: null };
  }

  const hypothetical = used + requested;

  if (hypothetical > limit) {
    if (policy === 'bill') {
      return { status: 'exceeded', allowed: true, billable: true, remaining: 0 };
    }
    if (policy === 'warn') {
      return { status: 'exceeded', allowed: true, billable: false, remaining: 0 };
    }
    return { status: 'exceeded', allowed: false, billable: false, remaining: 0 };
  }

  const remaining = limit - hypothetical;
  const ratio = hypothetical / limit;
  return {
    status: ratio >= warnRatio ? 'warning' : 'ok',
    allowed: true,
    billable: false,
    remaining,
  };
}
