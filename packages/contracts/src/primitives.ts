/**
 * Schémas Zod partagés front/back — source de vérité unique.
 *
 * Le frontend les utilise pour la validation de formulaire, l'API pour rejeter
 * les entrées invalides. Une divergence entre les deux devient impossible.
 */
import { z } from 'zod';

/** Numéro E.164 : "+" suivi de 7 à 15 chiffres, sans zéro initial. */
export const e164Schema = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{6,14}$/, 'Numéro international invalide (format E.164 attendu)');

export const uuidSchema = z.uuid();

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, 'Code devise ISO-4217 attendu (3 lettres majuscules)');

/** Montant en plus petite unité : entier, jamais un flottant. */
export const amountMinorSchema = z
  .number()
  .int('Le montant doit être un entier en plus petite unité')
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

export const moneySchema = z.object({
  amount_minor: amountMinorSchema,
  currency: currencySchema,
});

export const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Locale BCP-47 attendue (ex. fr, fr-FR)');

export const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}$/, 'Code pays ISO-3166 attendu');

export const timezoneSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Fuseau horaire inconnu');

/** Pagination par curseur : le serveur donne le curseur suivant, jamais un offset. */
export const paginationQuerySchema = z.object({
  cursor: z.string().max(256).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const idempotencyKeySchema = z.string().min(8).max(128);
