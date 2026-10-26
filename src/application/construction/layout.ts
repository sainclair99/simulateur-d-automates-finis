export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Rayon (en unités du canevas) d'un état dessiné. */
export const NODE_RADIUS = 32;

/** Dimensions logiques du canevas (le SVG est mis à l'échelle par viewBox). */
export const CANVAS = { width: 900, height: 560 } as const;

/** Zone où le centre d'un état peut se trouver (marge haute pour les boucles). */
export const BOUNDS = { minX: 60, maxX: 840, minY: 100, maxY: 520 } as const;

/** Distance minimale centre à centre souhaitée pour la disposition automatique. */
export const MIN_STATE_GAP = 80;

export function clampToBounds(point: Point): Point {
  return {
    x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, point.x)),
    y: Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, point.y)),
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Dispose `count` éléments sur une ellipse : le premier à gauche, puis dans le sens horaire. */
export function ellipseLayout(count: number): Point[] {
  if (count <= 0) return [];
  const center = { x: (BOUNDS.minX + BOUNDS.maxX) / 2, y: (BOUNDS.minY + BOUNDS.maxY) / 2 };
  if (count === 1) return [center];
  const radiusX = Math.min(360, 90 + 60 * count);
  const radiusY = Math.min(190, 60 + 35 * count);
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI + (2 * Math.PI * index) / count;
    return {
      x: Math.round(center.x + radiusX * Math.cos(angle)),
      y: Math.round(center.y + radiusY * Math.sin(angle)),
    };
  });
}
