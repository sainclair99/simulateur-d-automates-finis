import type { SimulationResult, SimulationStep, StateId, Verdict } from '../core';

/** Aspect d'un état à l'écran. Vert = accepted, rouge = rejected, uniquement à la fin de la lecture. */
export type StateVisual = 'idle' | 'active' | 'accepted' | 'rejected';

/**
 * Case du ruban : lue, prochaine à lire (`current`), pas encore lue (`pending`),
 * ou symbole qui a provoqué le rejet (`failed`, uniquement à la fin).
 */
export type TapeCellStatus = 'read' | 'current' | 'pending' | 'failed';

export interface TapeCell {
  readonly symbol: string;
  readonly status: TapeCellStatus;
}

/**
 * Curseur de lecture IMMUABLE sur une trace de simulation (pas suivant / précédent, début, fin).
 * L'animation temporelle (lecture auto, vitesse) relève de l'UI : elle ne fait qu'appeler `next()`.
 */
export class SimulationPlayback {
  private constructor(
    readonly result: SimulationResult,
    readonly cursor: number,
  ) {}

  static of(result: SimulationResult): SimulationPlayback {
    return new SimulationPlayback(result, 0);
  }

  get step(): SimulationStep {
    const step = this.result.steps[this.cursor];
    if (!step) throw new Error('Invariant violé : curseur hors de la trace');
    return step;
  }

  get isAtStart(): boolean {
    return this.cursor === 0;
  }

  get isAtEnd(): boolean {
    return this.cursor === this.result.steps.length - 1;
  }

  /** Nombre de pas de lecture de la trace (la configuration initiale n'en fait pas partie). */
  get lastIndex(): number {
    return this.result.steps.length - 1;
  }

  /** null tant que la lecture n'est pas terminée : aucune couleur de verdict avant la fin. */
  get verdict(): Verdict | null {
    return this.isAtEnd ? this.result.verdict : null;
  }

  get readSymbols(): readonly string[] {
    return this.result.symbols.slice(0, this.step.index);
  }

  get remainingSymbols(): readonly string[] {
    return this.result.symbols.slice(this.step.index);
  }

  /** Le mot sous forme de ruban, avec l'état de chaque case à cet instant de la lecture. */
  get tape(): readonly TapeCell[] {
    const read = this.step.index;
    const failedIndex = this.isAtEnd ? (this.result.rejection?.index ?? null) : null;
    return this.result.symbols.map((symbol, index): TapeCell => {
      if (index < read) return { symbol, status: 'read' };
      if (index === failedIndex) return { symbol, status: 'failed' };
      if (index === read && !this.isAtEnd) return { symbol, status: 'current' };
      return { symbol, status: 'pending' };
    });
  }

  next(): SimulationPlayback {
    return this.moveTo(this.cursor + 1);
  }

  previous(): SimulationPlayback {
    return this.moveTo(this.cursor - 1);
  }

  toStart(): SimulationPlayback {
    return this.moveTo(0);
  }

  toEnd(): SimulationPlayback {
    return this.moveTo(this.result.steps.length - 1);
  }

  /** Se place sur le pas `index` (ramené dans la trace). */
  goTo(index: number): SimulationPlayback {
    return this.moveTo(index);
  }

  visualOf(id: StateId): StateVisual {
    if (!this.step.activeStates.includes(id)) return 'idle';
    if (!this.isAtEnd) return 'active';
    if (this.result.verdict === 'rejected') return 'rejected';
    return this.result.acceptingStates.includes(id) ? 'accepted' : 'idle';
  }

  private moveTo(target: number): SimulationPlayback {
    const clamped = Math.max(0, Math.min(target, this.result.steps.length - 1));
    return clamped === this.cursor ? this : new SimulationPlayback(this.result, clamped);
  }
}
