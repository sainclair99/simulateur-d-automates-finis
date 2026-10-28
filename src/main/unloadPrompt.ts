export const STAY = 0;
export const LEAVE = 1;

/** Sous-ensemble de `dialog` (déjà lié à la fenêtre) : la boîte est modale et SYNCHRONE, comme l'exige Electron ici. */
export interface MessageBoxes {
  showMessageBoxSync(options: {
    type: 'warning';
    title: string;
    message: string;
    detail: string;
    buttons: string[];
    defaultId: number;
    cancelId: number;
    noLink: boolean;
  }): number;
}

/**
 * Appelé quand la page tente d'empêcher sa fermeture (modifications non enregistrées).
 * Renvoie vrai si l'utilisateur choisit d'abandonner les modifications. Par défaut (Entrée, Échap, fermeture de la
 * boîte), on RESTE : perdre son travail doit toujours être un choix explicite.
 */
export function confirmAbandonChanges(boxes: MessageBoxes): boolean {
  const choice = boxes.showMessageBoxSync({
    type: 'warning',
    title: 'Modifications non enregistrées',
    message: 'Le projet contient des modifications non enregistrées.',
    detail: 'Si vous continuez, ces modifications seront perdues.',
    buttons: ['Rester', 'Abandonner les modifications'],
    defaultId: STAY,
    cancelId: STAY,
    noLink: true,
  });
  return choice === LEAVE;
}
