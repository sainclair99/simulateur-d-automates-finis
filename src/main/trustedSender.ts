export interface TrustedPages {
  /** URL du serveur de développement (mode dev) ; undefined en version construite. */
  readonly devServerUrl: string | undefined;
  /** URL file:// de la page de l'interface (version construite). */
  readonly indexFileUrl: string;
}

/** Seules NOS pages peuvent appeler les canaux IPC sensibles (recommandation de sécurité d'Electron). */
export function isTrustedUrl(url: string, pages: TrustedPages): boolean {
  if (pages.devServerUrl !== undefined) {
    try {
      return new URL(url).origin === new URL(pages.devServerUrl).origin;
    } catch {
      return false;
    }
  }
  return url === pages.indexFileUrl || url.startsWith(`${pages.indexFileUrl}#`) || url.startsWith(`${pages.indexFileUrl}?`);
}
