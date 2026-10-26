import type { Point } from '../../application';

/** Convertit des coordonnées écran en coordonnées du canevas (indépendant du zoom / de la taille de la fenêtre). */
export function toCanvasPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: clientX, y: clientY };
  const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}
