import { DomainError } from '../../core';
import type { LanguageDefinition } from '../../core';
import { ConstructionState } from './ConstructionState';

const MAX_HISTORY = 100;

export interface EditResult {
  readonly history: ConstructionHistory;
  /** Message à afficher si la modification a été refusée par le domaine ; null sinon. */
  readonly error: string | null;
}

/** Historique IMMUABLE (annuler / rétablir) : une pile d'états de construction. */
export class ConstructionHistory {
  private constructor(
    readonly present: ConstructionState,
    private readonly past: readonly ConstructionState[],
    private readonly future: readonly ConstructionState[],
  ) {}

  static start(definition: LanguageDefinition): ConstructionHistory {
    return new ConstructionHistory(ConstructionState.start(definition), [], []);
  }

  /** Historique neuf dont l'état présent est un projet déjà construit (ex. fichier ouvert). */
  static from(state: ConstructionState): ConstructionHistory {
    return new ConstructionHistory(state, [], []);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Enregistre un nouvel état (sans effet s'il est identique) ; efface la possibilité de rétablir. */
  commit(next: ConstructionState): ConstructionHistory {
    if (next === this.present) return this;
    return new ConstructionHistory(next, [...this.past, this.present].slice(-MAX_HISTORY), []);
  }

  /** Applique une modification ; une règle du domaine violée devient un message, pas une exception. */
  edit(change: (state: ConstructionState) => ConstructionState): EditResult {
    try {
      return { history: this.commit(change(this.present)), error: null };
    } catch (error) {
      if (error instanceof DomainError) return { history: this, error: error.message };
      throw error;
    }
  }

  undo(): ConstructionHistory {
    const previous = this.past[this.past.length - 1];
    if (!previous) return this;
    return new ConstructionHistory(previous, this.past.slice(0, -1), [this.present, ...this.future]);
  }

  redo(): ConstructionHistory {
    const [next, ...rest] = this.future;
    if (!next) return this;
    return new ConstructionHistory(next, [...this.past, this.present], rest);
  }
}
