import type { StateId } from './State';

export interface Transition {
  readonly from: StateId;
  readonly to: StateId;
  readonly symbol: string;
}

export function sameTransition(a: Transition, b: Transition): boolean {
  return a.from === b.from && a.to === b.to && a.symbol === b.symbol;
}
