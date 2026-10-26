import type { SimulationPlayback } from '../SimulationPlayback';

export interface VerdictView {
  readonly accepted: boolean;
  readonly title: string;
  readonly detail: string;
}

const statesText = (ids: readonly string[]): string =>
  ids.length === 1 ? `l'état ${ids.join('')}` : `les états ${ids.join(', ')}`;

const positionText = (index: number | undefined): string => `position ${(index ?? 0) + 1}`;

/** Verdict en français ; null tant que la lecture n'est pas terminée (pas de couleur avant la fin). */
export function describeVerdict(playback: SimulationPlayback): VerdictView | null {
  if (!playback.isAtEnd) return null;
  const { result } = playback;
  const rejection = result.rejection;

  if (rejection === null) {
    const finals = result.acceptingStates;
    return {
      accepted: true,
      title: 'Mot accepté',
      detail: `Le mot est lu en entier et l'automate s'arrête sur ${
        finals.length === 1 ? "l'état final" : 'les états finaux'
      } ${finals.join(', ')}.`,
    };
  }

  const where = statesText(result.endStates);
  switch (rejection.reason) {
    case 'NOT_IN_FINAL_STATE':
      return {
        accepted: false,
        title: 'Mot rejeté',
        detail:
          result.symbols.length === 0
            ? `Le mot vide est rejeté : l'état initial ${result.endStates.join(', ')} n'est pas final.`
            : `Le mot est lu en entier mais l'automate s'arrête sur ${where}, ${
                result.endStates.length === 1 ? "qui n'est pas final" : "dont aucun n'est final"
              }.`,
      };
    case 'NO_TRANSITION':
      return {
        accepted: false,
        title: 'Mot rejeté',
        detail: `Lecture bloquée à la ${positionText(rejection.index)} : aucune transition depuis ${where} sur le symbole « ${rejection.symbol ?? ''} ».`,
      };
    case 'SYMBOL_NOT_IN_ALPHABET':
      return {
        accepted: false,
        title: 'Mot rejeté',
        detail: `Le symbole « ${rejection.symbol ?? ''} » (${positionText(rejection.index)}) n'appartient pas à l'alphabet.`,
      };
  }
}

/** Phrase décrivant le pas courant : symbole lu et transitions empruntées. */
export function describeStep(playback: SimulationPlayback): string {
  const { step, result } = playback;
  if (step.symbol === null) {
    return `Départ : l'automate est dans ${statesText(step.activeStates)}.`;
  }
  const moves = [...new Set(step.firedTransitions.map((transition) => `${transition.from} → ${transition.to}`))];
  return `Lit « ${step.symbol} » (${step.index} sur ${result.symbols.length}) : ${moves.join(', ')}.`;
}
