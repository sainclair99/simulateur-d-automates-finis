import { describe, expect, it } from 'vitest';
import { CANVAS, NODE_RADIUS } from '../../application';
import type { PlacedState, Point } from '../../application';
import {
  centerOf,
  clampViewport,
  contentBounds,
  fitViewport,
  FULL_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  panBy,
  viewBoxOf,
  visibleSize,
  zoomAt,
} from './viewport';
import type { Viewport } from './viewport';

const node = (id: string, x: number, y: number): PlacedState => ({ id, position: { x, y }, isInitial: false, isFinal: false });

/** Position à l'écran (0 à 1, de gauche à droite et de haut en bas) d'un point du canevas. */
function screenFraction(view: Viewport, point: Point): Point {
  const { width, height } = visibleSize(view);
  return { x: (point.x - view.x) / width, y: (point.y - view.y) / height };
}

describe('viewBoxOf / visibleSize', () => {
  it('montre tout le canevas à 100 %', () => {
    expect(viewBoxOf(FULL_VIEW)).toBe(`0 0 ${CANVAS.width} ${CANVAS.height}`);
  });

  it('montre une zone plus petite quand on zoome', () => {
    expect(visibleSize({ zoom: 2, x: 0, y: 0 })).toEqual({ width: CANVAS.width / 2, height: CANVAS.height / 2 });
    expect(viewBoxOf({ zoom: 2, x: 100, y: 50 })).toBe(`100 50 ${CANVAS.width / 2} ${CANVAS.height / 2}`);
  });
});

describe('clampViewport', () => {
  it('borne le zoom et garde la zone visible dans le canevas', () => {
    expect(clampViewport({ zoom: 0.2, x: 500, y: 500 })).toEqual(FULL_VIEW);
    expect(clampViewport({ zoom: 99, x: -50, y: -50 })).toEqual({ zoom: MAX_ZOOM, x: 0, y: 0 });
    const far = clampViewport({ zoom: 2, x: 9999, y: 9999 });
    expect(far).toEqual({ zoom: 2, x: CANVAS.width / 2, y: CANVAS.height / 2 });
  });
});

describe('zoomAt', () => {
  it('garde le point visé exactement sous le curseur', () => {
    const focus = { x: 300, y: 200 };
    for (const view of [FULL_VIEW, { zoom: 2, x: 120, y: 60 }, { zoom: 3, x: 400, y: 300 }]) {
      const zoomed = zoomAt(view, 1.25, focus);
      expect(zoomed.zoom).toBeGreaterThan(view.zoom);
      const before = screenFraction(view, focus);
      const after = screenFraction(zoomed, focus);
      expect(Math.abs(before.x - after.x)).toBeLessThan(1e-9);
      expect(Math.abs(before.y - after.y)).toBeLessThan(1e-9);
    }
  });

  it('ne dépasse jamais les bornes de zoom, quoi qu’on fasse', () => {
    let view = FULL_VIEW;
    for (let i = 0; i < 40; i += 1) view = zoomAt(view, 1.25, { x: 450, y: 280 });
    expect(view.zoom).toBe(MAX_ZOOM);
    for (let i = 0; i < 40; i += 1) view = zoomAt(view, 0.8, { x: 450, y: 280 });
    expect(view).toEqual(FULL_VIEW);
  });

  it('à 100 %, un zoom arrière ne change rien', () => {
    expect(zoomAt(FULL_VIEW, 0.5, { x: 10, y: 10 })).toEqual(FULL_VIEW);
  });

  it('près d’un bord, le point reste sous le curseur et on ne sort jamais du canevas', () => {
    // le point (5, 5) est à 5/900 de la gauche : après zoom ×4, la zone visible commence à 5 − 5/4 = 3,75
    expect(zoomAt(FULL_VIEW, 4, { x: 5, y: 5 })).toEqual({ zoom: 4, x: 3.75, y: 3.75 });
    expect(zoomAt(FULL_VIEW, 4, { x: 0, y: 0 })).toEqual({ zoom: 4, x: 0, y: 0 });
    const corner = zoomAt(FULL_VIEW, 4, { x: CANVAS.width, y: CANVAS.height });
    expect(corner.x + CANVAS.width / 4).toBeCloseTo(CANVAS.width, 6);
    expect(corner.y + CANVAS.height / 4).toBeCloseTo(CANVAS.height, 6);
  });
});

describe('panBy', () => {
  it('déplace la zone visible, bornée au canevas', () => {
    const view = { zoom: 2, x: 100, y: 100 };
    expect(panBy(view, 50, -20)).toEqual({ zoom: 2, x: 150, y: 80 });
    expect(panBy(view, -9999, -9999)).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(panBy(view, 9999, 9999)).toEqual({ zoom: 2, x: CANVAS.width / 2, y: CANVAS.height / 2 });
  });

  it('ne fait rien à 100 % : tout est déjà visible', () => {
    expect(panBy(FULL_VIEW, 80, 80)).toEqual(FULL_VIEW);
  });
});

describe('centerOf', () => {
  it('donne le centre de la zone visible', () => {
    expect(centerOf(FULL_VIEW)).toEqual({ x: CANVAS.width / 2, y: CANVAS.height / 2 });
    expect(centerOf({ zoom: 2, x: 0, y: 0 })).toEqual({ x: CANVAS.width / 4, y: CANVAS.height / 4 });
  });
});

describe('fitViewport', () => {
  it('ne change rien sans état', () => {
    expect(contentBounds([])).toBe(null);
    expect(fitViewport([])).toEqual(FULL_VIEW);
  });

  it('agrandit un petit automate et le centre, sans en couper aucune partie', () => {
    const nodes = [node('q0', 300, 300), node('q1', 450, 300), node('q2', 600, 300)];
    const view = fitViewport(nodes);
    expect(view.zoom).toBeGreaterThan(1.5);
    const { width, height } = visibleSize(view);
    for (const { position } of nodes) {
      expect(position.x - NODE_RADIUS).toBeGreaterThanOrEqual(view.x);
      expect(position.x + NODE_RADIUS).toBeLessThanOrEqual(view.x + width);
      expect(position.y - NODE_RADIUS).toBeGreaterThanOrEqual(view.y);
      expect(position.y + NODE_RADIUS).toBeLessThanOrEqual(view.y + height);
    }
  });

  it('garde de la place pour la flèche d’entrée, les boucles et la poignée', () => {
    const view = fitViewport([node('q0', 200, 300), node('q1', 700, 450)]);
    const { width, height } = visibleSize(view);
    expect(200 - NODE_RADIUS - 44).toBeGreaterThanOrEqual(view.x); // flèche d'entrée
    expect(300 - NODE_RADIUS - 76).toBeGreaterThanOrEqual(view.y); // boucle + libellé au-dessus
    expect(450 + NODE_RADIUS + 21).toBeLessThanOrEqual(view.y + height); // poignée en dessous
    expect(700 + NODE_RADIUS).toBeLessThanOrEqual(view.x + width);
  });

  it('reste à 100 % quand les états occupent déjà tout le canevas', () => {
    expect(fitViewport([node('a', 60, 100), node('b', 840, 520)])).toEqual(FULL_VIEW);
  });

  it('plafonne le zoom pour un état seul, et donne un pourcentage « rond » (pas de 5 %)', () => {
    const single = fitViewport([node('q0', 450, 300)]);
    expect(single.zoom).toBeLessThanOrEqual(MAX_ZOOM);
    expect(single.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    const percent = single.zoom * 100;
    expect(Math.abs(percent / 5 - Math.round(percent / 5))).toBeLessThan(1e-9);
  });
});
