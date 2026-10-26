import type { Automaton } from '../model/Automaton';
import type { StateId } from '../model/State';
import type { RegexNode } from '../regex/RegexAst';
import { RegexNfa } from './RegexNfa';

export type Comparison =
  /** L'automate et la regex reconnaissent exactement les mêmes mots. */
  | { readonly kind: 'equivalent'; readonly exploredPairs: number }
  /** `word` est le PLUS COURT mot sur lequel ils ne sont pas d'accord (le premier dans l'ordre de l'alphabet). */
  | { readonly kind: 'different'; readonly word: string; readonly regexAccepts: boolean }
  /** Exploration abandonnée : trop de configurations à comparer. */
  | { readonly kind: 'inconclusive'; readonly exploredPairs: number };

export const DEFAULT_EXPLORATION_LIMIT = 50_000;

interface Visit {
  readonly regex: readonly number[];
  readonly automaton: readonly StateId[];
  readonly parent: Visit | null;
  readonly symbol: string | null;
}

/**
 * Compare le langage de l'automate à celui de la regex par parcours en largeur de leur « produit » :
 * chaque configuration est (ensemble d'états de la regex, ensemble d'états de l'automate).
 * Le premier mot qui mène à une configuration où l'un accepte et pas l'autre est le plus court contre-exemple.
 * Aucun automate n'a besoin d'être déterministe ni complet : un ensemble vide joue le rôle d'état « puits ».
 */
export function compareWithRegex(
  automaton: Automaton,
  regex: RegexNode,
  limit: number = DEFAULT_EXPLORATION_LIMIT,
): Comparison {
  const nfa = RegexNfa.fromRegex(regex);
  const symbols = automaton.alphabet.toArray();
  const order = automaton.states.map((state) => state.id);
  const keyOf = (r: readonly number[], a: readonly StateId[]): string => `${r.join(',')}|${a.join(',')}`;

  const start: Visit = { regex: nfa.initial(), automaton: [automaton.initialState], parent: null, symbol: null };
  const seen = new Set<string>([keyOf(start.regex, start.automaton)]);
  const queue: Visit[] = [start];

  for (let index = 0; index < queue.length; index += 1) {
    const visit = queue[index];
    if (!visit) break;

    const regexAccepts = nfa.isAccepting(visit.regex);
    const automatonAccepts = visit.automaton.some((id) => automaton.isFinal(id));
    if (regexAccepts !== automatonAccepts) {
      return { kind: 'different', word: wordOf(visit), regexAccepts };
    }

    for (const symbol of symbols) {
      const nextRegex = nfa.step(visit.regex, symbol);
      const nextAutomaton = stepAutomaton(automaton, order, visit.automaton, symbol);
      const key = keyOf(nextRegex, nextAutomaton);
      if (seen.has(key)) continue;
      if (seen.size >= limit) return { kind: 'inconclusive', exploredPairs: seen.size };
      seen.add(key);
      queue.push({ regex: nextRegex, automaton: nextAutomaton, parent: visit, symbol });
    }
  }
  return { kind: 'equivalent', exploredPairs: seen.size };
}

function stepAutomaton(
  automaton: Automaton,
  order: readonly StateId[],
  states: readonly StateId[],
  symbol: string,
): StateId[] {
  const reached = new Set<StateId>();
  for (const id of states) {
    for (const target of automaton.next(id, symbol)) reached.add(target);
  }
  return order.filter((id) => reached.has(id));
}

function wordOf(visit: Visit): string {
  const symbols: string[] = [];
  for (let current: Visit | null = visit; current !== null && current.symbol !== null; current = current.parent) {
    symbols.push(current.symbol);
  }
  return symbols.reverse().join('');
}
