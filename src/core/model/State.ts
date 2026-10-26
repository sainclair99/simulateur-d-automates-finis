import { DomainError } from './errors';

export type StateId = string;

/**
 * Un état est « intermédiaire » s'il n'est ni initial ni final.
 * Un même état peut être à la fois initial et final.
 */
export interface State {
  readonly id: StateId;
  readonly isInitial: boolean;
  readonly isFinal: boolean;
}

/** Invariants d'un ensemble d'états : noms uniques, un seul état initial, au moins un état final. */
export function validateStates(states: readonly State[]): void {
  if (states.length === 0) {
    throw new DomainError('EMPTY_STATE_SET', "L'automate doit avoir au moins un état");
  }
  const ids = new Set<StateId>();
  for (const state of states) {
    if (state.id.trim() === '') {
      throw new DomainError('EMPTY_STATE_NAME', "Le nom d'un état ne peut pas être vide");
    }
    if (ids.has(state.id)) {
      throw new DomainError('DUPLICATE_STATE', `L'état « ${state.id} » est défini plusieurs fois`);
    }
    ids.add(state.id);
  }
  const initialCount = states.filter((state) => state.isInitial).length;
  if (initialCount === 0) {
    throw new DomainError('NO_INITIAL_STATE', "Il faut définir un état initial");
  }
  if (initialCount > 1) {
    throw new DomainError('MULTIPLE_INITIAL_STATES', "Il ne peut y avoir qu'un seul état initial");
  }
  if (!states.some((state) => state.isFinal)) {
    throw new DomainError('NO_FINAL_STATE', 'Il faut définir au moins un état final');
  }
}
