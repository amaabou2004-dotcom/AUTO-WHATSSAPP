import type { AutomationRule } from '../shared/types.js';

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
    .replace(/\s+/g, ' ');
}

export function ruleMatches(rule: AutomationRule, incomingMessage: string): boolean {
  const message = normalizeText(incomingMessage);
  const trigger = normalizeText(rule.trigger);

  if (!message || !trigger) return false;

  switch (rule.matchType) {
    case 'exact':
      return message === trigger;
    case 'starts_with':
      return message.startsWith(trigger);
    case 'contains':
      return message.includes(trigger);
  }
}

export function findMatchingRule(
  rules: AutomationRule[],
  incomingMessage: string,
): AutomationRule | null {
  return rules.find((rule) => rule.active && ruleMatches(rule, incomingMessage)) ?? null;
}
