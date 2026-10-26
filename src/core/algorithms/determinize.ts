import { Automaton } from '../model/Automaton';
import type { State, StateId } from '../model/State';
import type { Transition } from '../model/Transition';

export interface DeterminizeOptions {
  /** Ajoute un état puits « ∅ » pour que chaque état ait une transition pour chaque symbole (AFD complet). */
  readonly complete?: boolean;
  /** Nombre maximal d'états de l'AFD (au-delà : abandon, l'automate serait trop grand pour être dessiné). */
  readonly limit?: number;
}

export type Determinization =
  | {
      readonly kind: 'converted';
      readonly automaton: Automaton;
      /** Pour chaque état de l'AFD, l'ensemble des états de l'AFN qu'il représente. */
      readonly subsets: ReadonlyMap<StateId, readonly StateId[]>;
      /** Nom de l'état puits ajouté, ou null. */
      readonly sinkState: StateId | null;
    }
  | { readonly kind: 'too-large'; readonly limit: number }
  /** Aucun état final n'est accessible : l'AFD n'aurait aucun état final (langage vide), ce qui n'est pas un automate valide ici. */
  | { readonly kind: 'no-final-state' };

export const DEFAULT_STATE_LIMIT = 256;
const SINK_NAME = '∅';

/**
 * Construction par sous-ensembles : chaque état de l'AFD est l'ensemble des états de l'AFN où l'on peut se trouver
 * après avoir lu un même préfixe. Seuls les ensembles accessibles depuis {état initial} sont créés (parcours en
 * largeur, dans l'ordre de l'alphabet : résultat déterministe). Un ensemble est final s'il contient un état final.
 * Fonctionne aussi sur un automate déjà déterministe (il est alors simplement renommé).
 */
export function determinize(automaton: Automaton, options: DeterminizeOptions = {}): Determinization {
  const limit = options.limit ?? DEFAULT_STATE_LIMIT;
  const order = automaton.states.map((state) => state.id);
  const symbols = automaton.alphabet.toArray();

  const names = new Map<string, StateId>(); // clé de l'ensemble -> nom de l'état de l'AFD
  const usedNames = new Set<StateId>();
  const subsets = new Map<StateId, readonly StateId[]>();
  const queue: Array<{ readonly members: readonly StateId[]; readonly name: StateId }> = [];
  const transitions: Transition[] = [];
  let sinkState: StateId | null = null;

  const keyOf = (members: readonly StateId[]): string => JSON.stringify(members);
  const uniqueName = (base: string): StateId => {
    let name = base;
    while (usedNames.has(name)) name += "'"; // des noms d'états libres (« a,b ») peuvent produire le même texte
    usedNames.add(name);
    return name;
  };
  const register = (members: readonly StateId[]): StateId => {
    const name = uniqueName(members.length === 0 ? SINK_NAME : `{${members.join(',')}}`);
    names.set(keyOf(members), name);
    subsets.set(name, members);
    queue.push({ members, name });
    if (members.length === 0) sinkState = name;
    return name;
  };

  const initialName = register([automaton.initialState]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) break;
    for (const symbol of symbols) {
      const reached = new Set<StateId>();
      for (const member of current.members) {
        for (const target of automaton.next(member, symbol)) reached.add(target);
      }
      if (reached.size === 0 && !options.complete) continue; // transition absente : pas d'état puits
      const members = order.filter((id) => reached.has(id));
      let target = names.get(keyOf(members));
      if (target === undefined) {
        if (names.size >= limit) return { kind: 'too-large', limit };
        target = register(members);
      }
      transitions.push({ from: current.name, to: target, symbol });
    }
  }

  const states: State[] = [...subsets].map(([name, members]) => ({
    id: name,
    isInitial: name === initialName,
    isFinal: members.some((member) => automaton.isFinal(member)),
  }));
  if (!states.some((state) => state.isFinal)) return { kind: 'no-final-state' };

  return {
    kind: 'converted',
    automaton: Automaton.create(automaton.alphabet, states, transitions),
    subsets,
    sinkState,
  };
}
