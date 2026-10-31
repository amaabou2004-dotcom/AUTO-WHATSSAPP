/**
 * Arithmétique monétaire.
 *
 * Règle : les montants sont TOUJOURS des entiers en plus petite unité
 * (`amountMinor`). Aucun flottant ne représente jamais de l'argent.
 * `XOF` et `XAF` n'ont pas de sous-unité : 1 XOF = amountMinor 1.
 */

export interface Money {
  readonly amountMinor: number;
  /** Code ISO-4217 en majuscules. */
  readonly currency: string;
}

/** Devises sans décimale (ISO-4217, exposant 0). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'UYI',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/** Devises à 3 décimales (exposant 3). */
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

export function minorUnitExponent(currency: string): 0 | 2 | 3 {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`Montant non entier ou hors plage sûre : ${amountMinor}`);
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`Devise invalide : ${currency}`);
  }
  return { amountMinor, currency };
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Devises incompatibles : ${a.currency} / ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function multiplyMoney(a: Money, quantity: number): Money {
  if (!Number.isFinite(quantity)) throw new Error('Quantité invalide');
  return money(Math.round(a.amountMinor * quantity), a.currency);
}

/**
 * Applique une remise en pourcentage, arrondie au plus proche (demi vers le haut).
 * @param percent valeur entre 0 et 100
 */
export function applyPercentDiscount(a: Money, percent: number): Money {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error(`Pourcentage invalide : ${percent}`);
  }
  const discount = Math.round((a.amountMinor * percent) / 100);
  return money(a.amountMinor - discount, a.currency);
}

/** Formate un montant dans la locale demandée (Intl, aucune table en dur). */
export function formatMoney(value: Money, locale: string): string {
  const exponent = minorUnitExponent(value.currency);
  const major = value.amountMinor / 10 ** exponent;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(major);
}
