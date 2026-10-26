import { CANVAS, NODE_RADIUS } from '../../application';
import type { PlacedState, Point } from '../../application';

/** Zoom minimal : tout le canevas visible. On ne dézoome pas plus loin (il n'y a rien à voir au-delà). */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Pas des boutons + et −. */
export const ZOOM_STEP = 1.25;

/**
 * Zone visible du canevas : coin haut-gauche (x, y) en coordonnées du canevas ; sa taille est celle du canevas / zoom.
 * Le zoom et le déplacement passent par le `viewBox` du SVG : toutes les conversions de coordonnées de la souris
 * (déposer, déplacer, tirer une flèche) restent donc correctes sans rien changer d'autre.
 */
export interface Viewport {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export const FULL_VIEW: Viewport = { zoom: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function visibleSize(view: Viewport): { width: number; height: number } {
  return { width: CANVAS.width / view.zoom, height: CANVAS.height / view.zoom };
}

/** Garde le zoom dans ses bornes et la zone visible à l'intérieur du canevas. */
export function clampViewport(view: Viewport): Viewport {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const width = CANVAS.width / zoom;
  const height = CANVAS.height / zoom;
  return { zoom, x: clamp(view.x, 0, CANVAS.width - width), y: clamp(view.y, 0, CANVAS.height - height) };
}

/** Zoom multiplicatif centré sur `focus` : ce point reste exactement sous le curseur. */
export function zoomAt(view: Viewport, factor: number, focus: Point): Viewport {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = view.zoom / zoom;
  return clampViewport({
    zoom,
    x: focus.x - (focus.x - view.x) * ratio,
    y: focus.y - (focus.y - view.y) * ratio,
  });
}

export function panBy(view: Viewport, dx: number, dy: number): Viewport {
  return clampViewport({ ...view, x: view.x + dx, y: view.y + dy });
}

export function centerOf(view: Viewport): Point {
  const { width, height } = visibleSize(view);
  return { x: view.x + width / 2, y: view.y + height / 2 };
}

/** Valeur de l'attribut `viewBox` du SVG. */
export function viewBoxOf(view: Viewport): string {
  const { width, height } = visibleSize(view);
  const round = (value: number): number => Math.round(value * 100) / 100;
  return `${round(view.x)} ${round(view.y)} ${round(width)} ${round(height)}`;
}

/**
 * Zone qui contient les états avec leurs décorations : flèche d'entrée à gauche, boucles et libellés au-dessus,
 * poignée de liaison en dessous.
 */
export function contentBounds(nodes: readonly PlacedState[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (nodes.length === 0) return null;
  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);
  return {
    minX: Math.min(...xs) - NODE_RADIUS - 56,
    maxX: Math.max(...xs) + NODE_RADIUS + 24,
    minY: Math.min(...ys) - NODE_RADIUS - 90,
    maxY: Math.max(...ys) + NODE_RADIUS + 56,
  };
}

/** Zoom et position qui cadrent tout le contenu (jamais en dessous de 100 %, par pas de 5 %). */
export function fitViewport(nodes: readonly PlacedState[]): Viewport {
  const bounds = contentBounds(nodes);
  if (bounds === null) return FULL_VIEW;
  const fitZoom = Math.min(CANVAS.width / (bounds.maxX - bounds.minX), CANVAS.height / (bounds.maxY - bounds.minY));
  const zoom = clamp(Math.floor(fitZoom * 20) / 20, MIN_ZOOM, MAX_ZOOM);
  return clampViewport({
    zoom,
    x: (bounds.minX + bounds.maxX) / 2 - CANVAS.width / zoom / 2,
    y: (bounds.minY + bounds.maxY) / 2 - CANVAS.height / zoom / 2,
  });
}
