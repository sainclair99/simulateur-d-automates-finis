import type { StateId } from '../model/State';
import type { Transition } from '../model/Transition';

export interface SimulationStep {
  /** Nombre de symboles lus à ce stade (0 = configuration initiale). */
  readonly index: number;
  /** Symbole qui vient d'être lu (null pour la configuration initiale). */
  readonly symbol: string | null;
  /** États courants de l'automate (plusieurs si l'automate est non déterministe). Jamais vide. */
  readonly activeStates: readonly StateId[];
  /** Transitions empruntées pour atteindre cette configuration. */
  readonly firedTransitions: readonly Transition[];
}

export type Verdict = 'accepted' | 'rejected';

export type RejectionReason =
  /** Mot entièrement lu, mais aucun état courant n'est final. */
  | 'NOT_IN_FINAL_STATE'
  /** Lecture bloquée : aucune transition pour ce symbole depuis les états courants. */
  | 'NO_TRANSITION'
  /** Le mot contient un symbole qui n'appartient pas à l'alphabet. */
  | 'SYMBOL_NOT_IN_ALPHABET';

export interface Rejection {
  readonly reason: RejectionReason;
  /** Position (dans le mot) du symbole fautif ; absent pour NOT_IN_FINAL_STATE. */
  readonly index?: number;
  readonly symbol?: string;
}

export interface SimulationResult {
  readonly word: string;
  /** Mot découpé en symboles (caractères Unicode). */
  readonly symbols: readonly string[];
  /** Trace complète : steps[0] est la configuration initiale. */
  readonly steps: readonly SimulationStep[];
  readonly verdict: Verdict;
  /** États où la lecture s'est arrêtée (dernière configuration de la trace). */
  readonly endStates: readonly StateId[];
  /** Sous-ensemble final de endStates si le mot est accepté, vide sinon. */
  readonly acceptingStates: readonly StateId[];
  /** null si et seulement si le mot est accepté. */
  readonly rejection: Rejection | null;
}
