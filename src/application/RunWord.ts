import { simulate } from '../core';
import type { Automaton } from '../core';
import { SimulationPlayback } from './SimulationPlayback';

/** Cas d'usage « tester un mot » : simule la lecture et rend un curseur prêt pour l'animation. */
export function runWord(automaton: Automaton, word: string): SimulationPlayback {
  return SimulationPlayback.of(simulate(automaton, word));
}
