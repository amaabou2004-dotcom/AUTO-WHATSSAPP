/**
 * Fenêtre de service WhatsApp.
 *
 * Meta autorise les messages libres uniquement pendant les 24 h qui suivent le
 * dernier message ENTRANT du client. Hors fenêtre, seul un modèle approuvé peut
 * être envoyé. Cette règle est appliquée côté serveur (jamais uniquement dans
 * l'interface).
 */

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ServiceWindow {
  readonly open: boolean;
  /** Date de fermeture si la fenêtre est ouverte. */
  readonly closesAt: Date | null;
  readonly remainingMs: number;
}

/**
 * @param lastInboundAt date du dernier message entrant, ou `null` si aucun.
 * @param now instant de référence.
 */
export function serviceWindow(lastInboundAt: Date | null, now: Date): ServiceWindow {
  if (lastInboundAt === null) {
    return { open: false, closesAt: null, remainingMs: 0 };
  }

  const inbound = lastInboundAt.getTime();
  if (Number.isNaN(inbound)) {
    throw new Error("Date d'entrée invalide");
  }

  // Horloge serveur en retard sur un horodatage stocké : on considère la fenêtre
  // comme fermée plutôt que de l'ouvrir indéfiniment (comportement sûr).
  if (inbound > now.getTime()) {
    return { open: false, closesAt: null, remainingMs: 0 };
  }

  const closesAtMs = inbound + SERVICE_WINDOW_MS;
  const remainingMs = closesAtMs - now.getTime();
  const open = remainingMs > 0;

  return {
    open,
    closesAt: open ? new Date(closesAtMs) : null,
    remainingMs: open ? remainingMs : 0,
  };
}

/**
 * Décide du mode d'envoi autorisé.
 * `freeform` : message libre. `template` : modèle approuvé obligatoire. `blocked` : rien.
 */
export function resolveSendMode(
  window: ServiceWindow,
  options: { hasApprovedTemplate: boolean },
): 'freeform' | 'template' | 'blocked' {
  if (window.open) return 'freeform';
  return options.hasApprovedTemplate ? 'template' : 'blocked';
}
