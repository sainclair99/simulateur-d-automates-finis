import { describe, expect, it } from 'vitest';
import { BOUNDS, clampToBounds, distance, ellipseLayout } from './layout';

describe('layout', () => {
  it('ramène un point dans les bornes', () => {
    expect(clampToBounds({ x: -10, y: 9999 })).toEqual({ x: BOUNDS.minX, y: BOUNDS.maxY });
    expect(clampToBounds({ x: 300, y: 300 })).toEqual({ x: 300, y: 300 });
  });

  it('calcule une distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('dispose 0, 1 et 2 éléments', () => {
    expect(ellipseLayout(0)).toEqual([]);
    expect(ellipseLayout(1)).toEqual([{ x: 450, y: 310 }]);
    expect(ellipseLayout(2)).toEqual([
      { x: 240, y: 310 },
      { x: 660, y: 310 },
    ]);
  });

  it('place toujours le premier élément à gauche et reste dans les bornes', () => {
    for (const count of [2, 3, 5, 8, 12]) {
      const slots = ellipseLayout(count);
      const [first, ...others] = slots;
      expect(slots).toHaveLength(count);
      for (const other of others) expect(first && first.x < other.x).toBe(true);
      for (const slot of slots) expect(clampToBounds(slot)).toEqual(slot);
    }
  });
});
