import { diagnose, DomainError } from '../../core';
import type { Automaton, Diagnostic, LanguageDefinition, StateId } from '../../core';
import { clampToBounds, distance, ellipseLayout, MIN_STATE_GAP, NODE_RADIUS } from './layout';
import type { Point } from './layout';

export interface LinkRef {
  readonly from: StateId;
  readonly to: StateId;
}

/** Une flèche entre deux états, portant zéro, un ou plusieurs symboles (= autant de transitions). */
export interface Link extends LinkRef {
  readonly symbols: readonly string[];
}

export interface PlacedState {
  readonly id: StateId;
  readonly position: Point;
  readonly isInitial: boolean;
  readonly isFinal: boolean;
}

const sameLink = (a: LinkRef, b: LinkRef): boolean => a.from === b.from && a.to === b.to;

/**
 * État IMMUABLE de l'écran « Construction » : l'automate (domaine) + ce qui relève du dessin
 * (positions des états, liaisons encore vides). Une liaison sans symbole n'est pas une transition :
 * elle n'existe que pour permettre d'y déposer des symboles.
 */
export class ConstructionState {
  private constructor(
    readonly automaton: Automaton,
    readonly positions: ReadonlyMap<StateId, Point>,
    private readonly pendingLinks: readonly LinkRef[],
  ) {}

  static start(definition: LanguageDefinition): ConstructionState {
    return new ConstructionState(definition.createAutomaton(), new Map(), []);
  }

  // ---------- Lecture ----------

  get unplacedStates(): readonly StateId[] {
    return this.automaton.states.map((state) => state.id).filter((id) => !this.positions.has(id));
  }

  get placedStates(): readonly PlacedState[] {
    return this.automaton.states.flatMap((state) => {
      const position = this.positions.get(state.id);
      return position ? [{ id: state.id, position, isInitial: state.isInitial, isFinal: state.isFinal }] : [];
    });
  }

  /** Liaisons (avec ou sans symbole). Symboles triés dans l'ordre de l'alphabet. */
  get links(): readonly Link[] {
    const order = this.automaton.alphabet.toArray();
    const refs = new Map<string, LinkRef>();
    const remember = (ref: LinkRef): void => {
      const key = JSON.stringify([ref.from, ref.to]);
      if (!refs.has(key)) refs.set(key, { from: ref.from, to: ref.to });
    };
    this.automaton.transitions.forEach(remember);
    this.pendingLinks.forEach(remember);
    return [...refs.values()].map((ref) => ({
      ...ref,
      symbols: this.automaton.transitions
        .filter((transition) => sameLink(transition, ref))
        .map((transition) => transition.symbol)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    }));
  }

  /** Vrai pour un AFD : aucun état n'a plusieurs transitions pour un même symbole. */
  get isDeterministic(): boolean {
    return this.automaton.isDeterministic();
  }

  hasLink(from: StateId, to: StateId): boolean {
    const ref = { from, to };
    return (
      this.pendingLinks.some((link) => sameLink(link, ref)) ||
      this.automaton.transitions.some((transition) => sameLink(transition, ref))
    );
  }

  diagnostics(): Diagnostic[] {
    return diagnose(this.automaton);
  }

  /** État dont le disque contient (à `tolerance` près) le point, le plus proche en cas de recouvrement. */
  stateAt(point: Point, tolerance = 6): StateId | null {
    let found: StateId | null = null;
    let best = NODE_RADIUS + tolerance;
    for (const [id, position] of this.positions) {
      const gap = distance(position, point);
      if (gap <= best) {
        found = id;
        best = gap;
      }
    }
    return found;
  }

  // ---------- Placement ----------

  placeState(id: StateId, point: Point): ConstructionState {
    this.requireState(id);
    const positions = new Map(this.positions);
    positions.set(id, clampToBounds(point));
    return new ConstructionState(this.automaton, positions, this.pendingLinks);
  }

  /** Redispose TOUS les états sur une ellipse (état initial à gauche). */
  autoLayout(): ConstructionState {
    const ids = this.orderedIds();
    const slots = ellipseLayout(ids.length);
    const positions = new Map<StateId, Point>();
    ids.forEach((id, index) => {
      const slot = slots[index];
      if (slot) positions.set(id, slot);
    });
    return new ConstructionState(this.automaton, positions, this.pendingLinks);
  }

  /** Place uniquement les états encore absents du canevas, sans recouvrir ceux déjà posés. */
  completeLayout(): ConstructionState {
    const missing = this.unplacedStates;
    if (missing.length === 0) return this;
    const ids = this.orderedIds();
    const slots = ellipseLayout(ids.length);
    const positions = new Map(this.positions);
    for (const id of missing) {
      const free = slots.find((slot) =>
        [...positions.values()].every((placed) => distance(placed, slot) >= MIN_STATE_GAP),
      );
      const chosen = free ?? slots[ids.indexOf(id)];
      if (chosen) positions.set(id, chosen);
    }
    return new ConstructionState(this.automaton, positions, this.pendingLinks);
  }

  // ---------- Liaisons et symboles ----------

  addLink(from: StateId, to: StateId): ConstructionState {
    this.requireState(from);
    this.requireState(to);
    if (this.hasLink(from, to)) return this;
    return new ConstructionState(this.automaton, this.positions, [...this.pendingLinks, { from, to }]);
  }

  removeLink(from: StateId, to: StateId): ConstructionState {
    if (!this.hasLink(from, to)) return this;
    const ref = { from, to };
    let automaton = this.automaton;
    for (const transition of this.automaton.transitions.filter((t) => sameLink(t, ref))) {
      automaton = automaton.withoutTransition(transition);
    }
    return new ConstructionState(
      automaton,
      this.positions,
      this.pendingLinks.filter((link) => !sameLink(link, ref)),
    );
  }

  /** Dépose un symbole sur la liaison (la crée si besoin) : ajoute la transition correspondante. */
  addSymbol(from: StateId, to: StateId, symbol: string): ConstructionState {
    const automaton = this.automaton.withTransition({ from, to, symbol });
    const ref = { from, to };
    return new ConstructionState(
      automaton,
      this.positions,
      this.pendingLinks.filter((link) => !sameLink(link, ref)),
    );
  }

  /** Retire un symbole ; la flèche reste, même vide, pour pouvoir y redéposer un symbole. */
  removeSymbol(from: StateId, to: StateId, symbol: string): ConstructionState {
    const automaton = this.automaton.withoutTransition({ from, to, symbol });
    const ref = { from, to };
    const keepsSymbols = automaton.transitions.some((transition) => sameLink(transition, ref));
    const alreadyPending = this.pendingLinks.some((link) => sameLink(link, ref));
    const pending = keepsSymbols || alreadyPending ? this.pendingLinks : [...this.pendingLinks, ref];
    return new ConstructionState(automaton, this.positions, pending);
  }

  toggleSymbol(from: StateId, to: StateId, symbol: string): ConstructionState {
    return this.automaton.next(from, symbol).includes(to)
      ? this.removeSymbol(from, to, symbol)
      : this.addSymbol(from, to, symbol);
  }

  // ---------- Interne ----------

  private orderedIds(): StateId[] {
    const initial = this.automaton.initialState;
    return [initial, ...this.automaton.states.map((state) => state.id).filter((id) => id !== initial)];
  }

  private requireState(id: StateId): void {
    if (!this.automaton.hasState(id)) {
      throw new DomainError('UNKNOWN_STATE', `L'état « ${id} » n'existe pas`);
    }
  }
}
