/**
 * `@whatsauto/core` — domaine pur.
 *
 * Aucune entrée/sortie, aucune dépendance d'infrastructure : ce package peut
 * être testé hors ligne et réutilisé par l'API, les jobs, la CLI et le frontend.
 */
export * from './errors.js';
export * from './phone.js';
export * from './money.js';
export * from './window.js';
export * from './quota.js';
