import { describe, expect, it } from 'vitest';
import { NODE_RADIUS } from '../../application';
import { linkGeometry, loopGeometry } from './geometry';

describe('linkGeometry', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 200, y: 0 };

  it('trace une flèche droite de bord à bord, libellé au-dessus', () => {
    const geometry = linkGeometry(a, b, false);
    expect(geometry.path).toBe(`M ${NODE_RADIUS} 0 L ${200 - NODE_RADIUS} 0`);
    expect(geometry.label).toEqual({ x: 100, y: -14 });
  });

  it('courbe la flèche quand la flèche inverse existe, de part et d’autre', () => {
    const forward = linkGeometry(a, b, true);
    const backward = linkGeometry(b, a, true);
    expect(forward.path).toContain('Q 100 -72');
    expect(backward.path).toContain('Q 100 72');
    expect(forward.label).toEqual({ x: 100, y: -48 });
    expect(backward.label).toEqual({ x: 100, y: 48 });
  });

  it('commence et finit sur le bord des disques, jamais à l’intérieur', () => {
    const geometry = linkGeometry(a, { x: 300, y: 400 }, false);
    const numbers = geometry.path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [sx = 0, sy = 0, ex = 0, ey = 0] = numbers;
    expect(Math.hypot(sx, sy)).toBeCloseTo(NODE_RADIUS, 0);
    expect(Math.hypot(ex - 300, ey - 400)).toBeCloseTo(NODE_RADIUS, 0);
  });

  it('se replie sur une boucle quand les deux états sont superposés', () => {
    expect(linkGeometry(a, a, false)).toEqual(loopGeometry(a));
  });
});

describe('loopGeometry', () => {
  it('dessine une courbe de Bézier au-dessus de l’état', () => {
    const center = { x: 100, y: 200 };
    const geometry = loopGeometry(center);
    expect(geometry.path.startsWith('M ')).toBe(true);
    expect(geometry.path).toContain(' C ');
    expect(geometry.label.x).toBe(100);
    expect(geometry.label.y).toBeLessThan(center.y - NODE_RADIUS);
  });
});
