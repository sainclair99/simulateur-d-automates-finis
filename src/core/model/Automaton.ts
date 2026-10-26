import type { Alphabet } from './Alphabet';
import { DomainError } from './errors';
import { validateStates } from './State';
import type { State, StateId } from './State';
import { sameTransition } from './Transition';
import type { Transition } from './Transition';

/**
 * Automate fini, IMMUABLE : toute modification renvoie une nouvelle instance.
 * Cela rend l'annulation/rétablissement triviale (pile d'instances) et évite les états incohérents.
 * Le non-déterminisme est autorisé (plusieurs cibles pour un même couple état/symbole) ;
 * il est signalé par `isDeterministic()` et par `diagnose()`.
 */
export class Automaton {
  readonly initialState: StateId;
  private readonly statesById: ReadonlyMap<StateId, State>;

  private constructor(
    readonly alphabet: Alphabet,
    readonly states: readonly State[],
    readonly transitions: readonly Transition[],
  ) {
    this.statesById = new Map(states.map((state): [StateId, State] => [state.id, state]));
    const initial = states.find((state) => state.isInitial);
    if (!initial) throw new Error("Invariant violé : l'automate n'a pas d'état initial");
    this.initialState = initial.id;
  }

  static create(
    alphabet: Alphabet,
    states: readonly State[],
    transitions: readonly Transition[] = [],
  ): Automaton {
    validateStates(states);
    let automaton = new Automaton(alphabet, states.map((state) => ({ ...state })), []);
    for (const transition of transitions) {
      automaton = automaton.withTransition(transition);
    }
    return automaton;
  }

  // ---------- Modifications (renvoient une nouvelle instance) ----------

  withTransition(transition: Transition): Automaton {
    for (const id of [transition.from, transition.to]) {
      if (!this.statesById.has(id)) {
        throw new DomainError('UNKNOWN_STATE', `L'état « ${id} » n'existe pas`);
      }
    }
    if (!this.alphabet.has(transition.symbol)) {
      throw new DomainError(
        'SYMBOL_NOT_IN_ALPHABET',
        `Le symbole « ${transition.symbol} » n'appartient pas à l'alphabet`,
      );
    }
    if (this.transitions.some((existing) => sameTransition(existing, transition))) {
      throw new DomainError('DUPLICATE_TRANSITION', `La transition ${describe(transition)} existe déjà`);
    }
    return new Automaton(this.alphabet, this.states, [...this.transitions, { ...transition }]);
  }

  withoutTransition(transition: Transition): Automaton {
    const remaining = this.transitions.filter((existing) => !sameTransition(existing, transition));
    if (remaining.length === this.transitions.length) {
      throw new DomainError('TRANSITION_NOT_FOUND', `La transition ${describe(transition)} n'existe pas`);
    }
    return new Automaton(this.alphabet, this.states, remaining);
  }

  // ---------- Requêtes ----------

  get finalStates(): readonly StateId[] {
    return this.states.filter((state) => state.isFinal).map((state) => state.id);
  }

  hasState(id: StateId): boolean {
    return this.statesById.has(id);
  }

  isFinal(id: StateId): boolean {
    return this.statesById.get(id)?.isFinal ?? false;
  }

  isInitial(id: StateId): boolean {
    return id === this.initialState;
  }

  transitionsFrom(id: StateId): readonly Transition[] {
    return this.transitions.filter((transition) => transition.from === id);
  }

  /** États atteints depuis `from` en lisant `symbol` (vide si aucune transition). */
  next(from: StateId, symbol: string): readonly StateId[] {
    return this.transitions
      .filter((transition) => transition.from === from && transition.symbol === symbol)
      .map((transition) => transition.to);
  }

  isDeterministic(): boolean {
    const seen = new Set<string>();
    for (const { from, symbol } of this.transitions) {
      const key = JSON.stringify([from, symbol]);
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  /** États accessibles depuis l'état initial (parcours en largeur). */
  reachableStates(): ReadonlySet<StateId> {
    const visited = new Set<StateId>([this.initialState]);
    const queue: StateId[] = [this.initialState];
    for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
      for (const transition of this.transitionsFrom(current)) {
        if (!visited.has(transition.to)) {
          visited.add(transition.to);
          queue.push(transition.to);
        }
      }
    }
    return visited;
  }
}

function describe(transition: Transition): string {
  return `« ${transition.from} —${transition.symbol}→ ${transition.to} »`;
}
