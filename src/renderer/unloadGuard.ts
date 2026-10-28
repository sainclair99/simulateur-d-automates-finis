/**
 * Demande confirmation avant de fermer ou recharger la page. Le navigateur affiche sa propre invite ;
 * dans Electron, le processus principal reçoit « will-prevent-unload » et affiche une boîte de dialogue native.
 * À n'installer que tant qu'il y a des modifications non enregistrées ; renvoie la fonction qui le retire.
 */
export function installUnloadGuard(target: EventTarget): () => void {
  const guard = (event: Event): void => {
    event.preventDefault();
    try {
      (event as BeforeUnloadEvent).returnValue = ''; // forme historique, requise par certains moteurs
    } catch {
      // environnement sans cet accesseur : preventDefault suffit
    }
  };
  target.addEventListener('beforeunload', guard);
  return () => target.removeEventListener('beforeunload', guard);
}
