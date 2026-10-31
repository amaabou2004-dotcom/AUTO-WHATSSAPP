/**
 * Normalisation des numéros de téléphone (E.164).
 *
 * Volontairement SANS dépendance externe à ce stade : la normalisation
 * complète (plans de numérotation, portabilité) sera assurée en Phase 10 par
 * une bibliothèque éprouvée (`libphonenumber-js`). Ces fonctions couvrent le
 * strict nécessaire : détection d'un préfixe international, suppression des
 * séparateurs, validation de la forme E.164 et masquage pour les journaux.
 *
 * Limite assumée et documentée : le préfixe national (`0`) n'est retiré que si
 * l'indicatif pays par défaut est fourni explicitement.
 */

export type E164 = string & { readonly __brand: 'E164' };

const E164_PATTERN = /^\+[1-9][0-9]{6,14}$/;

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value);
}

export function asE164(value: string): E164 {
  if (!isE164(value)) {
    throw new Error(`Numéro non conforme E.164 : ${maskPhone(value)}`);
  }
  return value as E164;
}

/**
 * Normalise une saisie utilisateur vers E.164.
 *
 * @param raw Chaîne saisie (ex. "+227 90 12 34 56", "0022790123456", "90123456").
 * @param defaultDialCode Indicatif pays par défaut, avec le "+" (ex. "+227").
 * @returns le numéro E.164 ou `null` si la normalisation échoue.
 */
export function normalizeToE164(raw: string, defaultDialCode?: string): E164 | null {
  if (typeof raw !== 'string') return null;

  // Conserve un éventuel "+" initial, supprime tout le reste du bruit.
  const trimmed = raw.trim();
  const hadPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length === 0) return null;

  let candidate: string;
  if (hadPlus) {
    candidate = `+${digits}`;
  } else if (digits.startsWith('00')) {
    candidate = `+${digits.slice(2)}`;
  } else if (defaultDialCode && defaultDialCode.startsWith('+')) {
    const dial = defaultDialCode.slice(1).replace(/[^\d]/g, '');
    if (dial.length === 0) return null;
    // Numéro national : un "0" initial est un préfixe, jamais un chiffre d'abonné.
    const national = digits.startsWith('0') ? digits.slice(1) : digits;
    candidate = `+${dial}${national}`;
  } else {
    return null;
  }

  digits = candidate.slice(1);
  return isE164(candidate) ? (candidate as E164) : null;
}

/**
 * Masque un numéro pour les journaux et l'affichage non authentifié.
 * Ex. "+22790123456" -> "+22790****56".
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.length <= 6) return '***';
  const prefix = digits.slice(0, 5);
  const suffix = digits.slice(-2);
  return `${prefix}****${suffix}`;
}

/** Extrait l'indicatif pays d'un E.164 à partir d'une liste de préfixes connus. */
export function countryDialCodeOf(e164: string, knownDialCodes: readonly string[]): string | null {
  const sorted = [...knownDialCodes].sort((a, b) => b.length - a.length);
  for (const code of sorted) {
    if (e164.startsWith(code)) return code;
  }
  return null;
}
