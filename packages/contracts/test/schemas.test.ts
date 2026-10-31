import { describe, expect, it } from 'vitest';
import {
  amountMinorSchema,
  countryCodeSchema,
  currencySchema,
  e164Schema,
  errorEnvelopeSchema,
  healthResponseSchema,
  localeSchema,
  paginationQuerySchema,
  publicErrorCodes,
  timezoneSchema,
} from '../src/index.js';

describe('e164Schema', () => {
  it('accepte un numéro international valide', () => {
    expect(e164Schema.parse(' +22790123456 ')).toBe('+22790123456');
  });

  it('refuse un numéro national sans indicatif', () => {
    expect(e164Schema.safeParse('90123456').success).toBe(false);
  });

  it('refuse un indicatif commençant par 0', () => {
    expect(e164Schema.safeParse('+0123456789').success).toBe(false);
  });
});

describe('montants et devises', () => {
  it('refuse un montant décimal', () => {
    expect(amountMinorSchema.safeParse(12.5).success).toBe(false);
  });

  it('refuse une devise minuscule', () => {
    expect(currencySchema.safeParse('eur').success).toBe(false);
  });

  it('accepte le franc CFA', () => {
    expect(currencySchema.parse('XOF')).toBe('XOF');
  });
});

describe('valeurs régionales', () => {
  it('accepte un code pays ISO-3166', () => {
    expect(countryCodeSchema.parse('NE')).toBe('NE');
  });

  it('refuse un code pays trop long', () => {
    expect(countryCodeSchema.safeParse('NER').success).toBe(false);
  });

  it('accepte les locales courtes et avec région', () => {
    expect(localeSchema.safeParse('fr').success).toBe(true);
    expect(localeSchema.safeParse('zh-CN').success).toBe(true);
    expect(localeSchema.safeParse('fr_FR').success).toBe(false);
  });

  it('valide les fuseaux via Intl', () => {
    expect(timezoneSchema.safeParse('Africa/Niamey').success).toBe(true);
    expect(timezoneSchema.safeParse('Europe/Paris').success).toBe(true);
    expect(timezoneSchema.safeParse('Mars/Olympus').success).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('applique la limite par défaut', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 25 });
  });

  it('convertit une limite textuelle', () => {
    expect(paginationQuerySchema.parse({ limit: '50' }).limit).toBe(50);
  });

  it('refuse une limite excessive', () => {
    expect(paginationQuerySchema.safeParse({ limit: '5000' }).success).toBe(false);
  });
});

describe('errorEnvelopeSchema', () => {
  it('accepte une enveloppe conforme', () => {
    const envelope = {
      error: { code: 'not_found', message: 'Introuvable', request_id: 'req-1' },
    };
    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it('refuse un code inconnu', () => {
    const envelope = { error: { code: 'boom', message: 'x', request_id: 'req-2' } };
    expect(errorEnvelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it('expose 18 codes publics', () => {
    expect(publicErrorCodes).toHaveLength(18);
  });
});

describe('healthResponseSchema', () => {
  it('accepte un état dégradé avec détails', () => {
    const payload = {
      status: 'degraded',
      version: '0.0.0',
      checks: { database: { status: 'down' }, runtime: { status: 'ok', latency_ms: 1 } },
    };
    expect(healthResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('refuse un statut non prévu', () => {
    expect(
      healthResponseSchema.safeParse({ status: 'meh', version: '1', checks: {} }).success,
    ).toBe(false);
  });
});
