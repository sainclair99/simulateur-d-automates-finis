import type { RegexNode } from '../regex/RegexAst';

interface Fragment {
  readonly start: number;
  readonly accept: number;
}

/** Construction de Thompson : chaque opérateur ajoute quelques états et des transitions ε. */
class Builder {
  readonly epsilon: number[][] = [];
  readonly moves: Map<string, number[]>[] = [];

  state(): number {
    this.epsilon.push([]);
    this.moves.push(new Map());
    return this.epsilon.length - 1;
  }

  link(from: number, to: number): void {
    this.epsilon[from]?.push(to);
  }

  read(from: number, symbol: string, to: number): void {
    const moves = this.moves[from];
    if (moves) moves.set(symbol, [...(moves.get(symbol) ?? []), to]);
  }

  build(node: RegexNode): Fragment {
    switch (node.kind) {
      case 'epsilon': {
        const start = this.state();
        const accept = this.state();
        this.link(start, accept);
        return { start, accept };
      }
      case 'symbol': {
        const start = this.state();
        const accept = this.state();
        this.read(start, node.symbol, accept);
        return { start, accept };
      }
      case 'concat': {
        const left = this.build(node.left);
        const right = this.build(node.right);
        this.link(left.accept, right.start);
        return { start: left.start, accept: right.accept };
      }
      case 'union': {
        const start = this.state();
        const left = this.build(node.left);
        const right = this.build(node.right);
        const accept = this.state();
        this.link(start, left.start);
        this.link(start, right.start);
        this.link(left.accept, accept);
        this.link(right.accept, accept);
        return { start, accept };
      }
      case 'star': {
        const start = this.state();
        const inner = this.build(node.child);
        const accept = this.state();
        this.link(start, inner.start);
        this.link(start, accept);
        this.link(inner.accept, inner.start);
        this.link(inner.accept, accept);
        return { start, accept };
      }
    }
  }
}

/**
 * Automate non déterministe à transitions ε équivalent à une expression régulière.
 * Un « ensemble d'états » est toujours une liste triée d'entiers (clé stable pour les comparaisons).
 */
export class RegexNfa {
  private constructor(
    private readonly start: number,
    private readonly accept: number,
    private readonly epsilon: readonly (readonly number[])[],
    private readonly moves: readonly ReadonlyMap<string, readonly number[]>[],
  ) {}

  static fromRegex(node: RegexNode): RegexNfa {
    const builder = new Builder();
    const { start, accept } = builder.build(node);
    return new RegexNfa(start, accept, builder.epsilon, builder.moves);
  }

  /** Ensemble d'états de départ (fermeture ε de l'état initial). */
  initial(): readonly number[] {
    return this.closure([this.start]);
  }

  /** États atteints en lisant `symbol` depuis `states` (fermeture ε incluse) ; vide si impossible. */
  step(states: readonly number[], symbol: string): readonly number[] {
    const reached: number[] = [];
    for (const state of states) reached.push(...(this.moves[state]?.get(symbol) ?? []));
    return this.closure(reached);
  }

  isAccepting(states: readonly number[]): boolean {
    return states.includes(this.accept);
  }

  accepts(word: string): boolean {
    let current = this.initial();
    for (const symbol of Array.from(word)) {
      current = this.step(current, symbol);
      if (current.length === 0) return false;
    }
    return this.isAccepting(current);
  }

  private closure(seed: readonly number[]): number[] {
    const seen = new Set<number>();
    const stack = [...seed];
    for (let state = stack.pop(); state !== undefined; state = stack.pop()) {
      if (seen.has(state)) continue;
      seen.add(state);
      stack.push(...(this.epsilon[state] ?? []));
    }
    return [...seen].sort((a, b) => a - b);
  }
}
