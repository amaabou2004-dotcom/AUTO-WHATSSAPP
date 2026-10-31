#!/usr/bin/env node
/**
 * Détection de secrets dans les fichiers suivis par Git.
 *
 * Complément minimal et hors ligne à gitleaks (à activer quand une licence
 * sera disponible). Échoue (code 1) si un motif ressemble à un secret réel.
 *
 * Usage : node scripts/scan-secrets.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const MAX_BYTES = 1_000_000;

/** Fichiers autorisés à contenir des NOMS de variables, jamais des valeurs. */
const ALLOWLIST = new Set(['.env.example', 'scripts/scan-secrets.mjs']);

const RULES = [
  {
    name: 'clé privée',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    name: 'clé Google API',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'jeton Meta / Facebook',
    pattern: /\bEAA[A-Za-z0-9]{60,}\b/,
  },
  {
    name: 'clé OpenAI',
    pattern: /\bsk-[A-Za-z0-9]{32,}\b/,
  },
  {
    name: 'jeton Stripe',
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: 'clé AWS',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'JWT de service (Supabase service_role)',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: 'affectation de valeur secrète',
    // NAME=uneValeurNonVide, hors placeholders évidents
    pattern:
      /^\s*[A-Z0-9_]*(?:SECRET|PASSWORD|PASSWD|API_KEY|ACCESS_TOKEN|PRIVATE_KEY|KEK)[A-Z0-9_]*\s*=\s*(?!$|\s*$|["']?\s*["']?\s*$|changeme|xxx+|\.\.\.|<)/m,
  },
];

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter((file) => file.length > 0);
}

function isTextFile(file) {
  try {
    if (statSync(file).size > MAX_BYTES) return false;
    const buffer = readFileSync(file);
    // Heuristique : présence d'un octet NUL => binaire
    return !buffer.includes(0);
  } catch {
    return false;
  }
}

const findings = [];
for (const file of trackedFiles()) {
  if (ALLOWLIST.has(file)) continue;
  if (!isTextFile(file)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [index, line] of lines.entries()) {
    // Les commentaires qui citent une variable sans valeur ne sont pas des secrets.
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.name });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('Aucun secret détecté dans les fichiers suivis.');
  process.exit(0);
}

console.error(`ALERTE : ${findings.length} motif(s) suspect(s) :`);
for (const finding of findings) {
  console.error(`  ${finding.file}:${finding.line} — ${finding.rule}`);
}
console.error('\nRetirer la valeur, la révoquer, puis nettoyer l’historique si nécessaire.');
process.exit(1);
