// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Configuration ESLint (flat config).
 * Objectif : garantir les frontières de packages (ADR-001) et interdire les
 * chaînes affichables en dur (ADR-012, vérifié à partir de la Phase 14).
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Le domaine (packages/core) est pur : aucune dépendance d'infrastructure.
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*'], message: 'packages/core doit rester pur (aucune I/O).' },
            { group: ['hono', 'postgres', 'kysely', '@supabase/*'], message: 'packages/core doit rester pur.' },
            { group: ['../*', '../../*'], message: 'Utiliser des imports relatifs intra-package uniquement.' },
          ],
        },
      ],
    },
  },
  {
    // Les applications consomment les packages, jamais l'inverse.
    files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@whatsauto/api/*', '@whatsauto/web/*'],
              message: 'Les applications ne doivent pas être importées par des packages.',
            },
          ],
        },
      ],
    },
  },
  {
    // Journalisation structurée JSON : mécanisme d'observabilité du produit (ADR-014).
    files: ['apps/api/src/**/*.ts', 'apps/worker/src/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
);
