import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AutomationRule } from '../../shared/types.js';
import { findMatchingRule, normalizeText, ruleMatches } from '../automation.js';

const baseRule: AutomationRule = {
  id: 'rule_test',
  name: 'Test',
  trigger: 'bonjour',
  matchType: 'contains',
  response: 'Bonjour !',
  active: true,
  triggerCount: 0,
  createdAt: new Date().toISOString(),
};

describe('moteur du chatbot', () => {
  it('normalise la casse, les accents et les espaces', () => {
    assert.equal(normalizeText('  HÉLÈNE   Très  '), 'helene tres');
  });

  it('reconnaît un mot-clé dans une phrase', () => {
    assert.equal(ruleMatches(baseRule, 'Bonjour, vous êtes ouverts ?'), true);
  });

  it('respecte la correspondance exacte', () => {
    const rule = { ...baseRule, matchType: 'exact' as const };
    assert.equal(ruleMatches(rule, 'bonjour'), true);
    assert.equal(ruleMatches(rule, 'bonjour à tous'), false);
  });

  it('respecte le début du message', () => {
    const rule = { ...baseRule, trigger: 'commande', matchType: 'starts_with' as const };
    assert.equal(ruleMatches(rule, 'Commande 1042, svp'), true);
    assert.equal(ruleMatches(rule, 'Ma commande 1042'), false);
  });

  it('ignore les règles désactivées et utilise la première règle active', () => {
    const disabled = { ...baseRule, id: 'disabled', active: false };
    const enabled = { ...baseRule, id: 'enabled' };
    assert.equal(findMatchingRule([disabled, enabled], 'bonjour')?.id, 'enabled');
    assert.equal(findMatchingRule([disabled], 'bonjour'), null);
  });

  it('ne répond pas à un message vide', () => {
    assert.equal(ruleMatches(baseRule, '   '), false);
  });
});
