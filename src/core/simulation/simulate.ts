import type { Automaton } from '../model/Automaton';
import type { Rejection, SimulationResult, SimulationStep } from './SimulationResult';

/**
 * Lit `word` dans `automaton` et renvoie la trace complète ainsi que le verdict.
 * Fonction pure, valable pour les automates déterministes ou non (ensemble d'états courants).
 *
 * Le mot est ACCEPTÉ si et seulement s'il est lu en entier et qu'au moins un état courant est final.
 * Sinon il est REJETÉ : symbole hors alphabet, lecture bloquée, ou arrêt sur un état non final.
 * La trace s'arrête au dernier pas réussi : ses états courants sont ceux à colorer (vert / rouge).
 */
export function simulate(automaton: Automaton, word: string): SimulationResult {
  const symbols = Array.from(word);
  const stateOrder = automaton.states.map((state) => state.id);

  let current: SimulationStep = {
    index: 0,
    symbol: null,
    activeStates: [automaton.initialState],
    firedTransitions: [],
  };
  const steps: SimulationStep[] = [current];
  let rejection: Rejection | null = null;

  for (const [position, symbol] of symbols.entries()) {
    if (!automaton.alphabet.has(symbol)) {
      rejection = { reason: 'SYMBOL_NOT_IN_ALPHABET', index: position, symbol };
      break;
    }
    const firedTransitions = current.activeStates.flatMap((id) =>
      automaton.transitionsFrom(id).filter((transition) => transition.symbol === symbol),
    );
    if (firedTransitions.length === 0) {
      rejection = { reason: 'NO_TRANSITION', index: position, symbol };
      break;
    }
    const reached = new Set(firedTransitions.map((transition) => transition.to));
    current = {
      index: position + 1,
      symbol,
      activeStates: stateOrder.filter((id) => reached.has(id)),
      firedTransitions,
    };
    steps.push(current);
  }

  const endStates = current.activeStates;
  const accepting = endStates.filter((id) => automaton.isFinal(id));
  if (rejection === null && accepting.length === 0) {
    rejection = { reason: 'NOT_IN_FINAL_STATE' };
  }

  return {
    word,
    symbols,
    steps,
    endStates,
    verdict: rejection === null ? 'accepted' : 'rejected',
    acceptingStates: rejection === null ? accepting : [],
    rejection,
  };
}
