import { NODE_RADIUS } from '../../application';
import type { Point } from '../../application';

export interface LinkGeometry {
  /** Chemin SVG (attribut `d`) de la flèche, du bord de l'état source au bord de l'état cible. */
  readonly path: string;
  /** Position du libellé (symboles), au-dessus de la flèche. */
  readonly label: Point;
}

const CURVE_BEND = 36;
const LABEL_OFFSET = 14;

const fmt = (value: number): string => String(Math.round(value * 10) / 10);
const pt = (point: Point): string => `${fmt(point.x)} ${fmt(point.y)}`;

function towards(origin: Point, target: Point, radius: number): Point {
  const length = Math.hypot(target.x - origin.x, target.y - origin.y) || 1;
  return {
    x: origin.x + ((target.x - origin.x) / length) * radius,
    y: origin.y + ((target.y - origin.y) / length) * radius,
  };
}

/** Boucle au-dessus de l'état. */
export function loopGeometry(center: Point, radius: number = NODE_RADIUS): LinkGeometry {
  const rad = (degrees: number): number => (degrees * Math.PI) / 180;
  const start = { x: center.x + radius * Math.cos(rad(125)), y: center.y - radius * Math.sin(rad(125)) };
  const end = { x: center.x + radius * Math.cos(rad(55)), y: center.y - radius * Math.sin(rad(55)) };
  const top = center.y - radius - 60;
  return {
    path: `M ${pt(start)} C ${fmt(center.x - 48)} ${fmt(top)}, ${fmt(center.x + 48)} ${fmt(top)}, ${pt(end)}`,
    label: { x: center.x, y: center.y - radius - 68 },
  };
}

/**
 * Flèche entre deux états distincts. `curved` = vrai quand la flèche inverse existe aussi :
 * les deux courbent alors de part et d'autre pour ne pas se superposer.
 */
export function linkGeometry(
  from: Point,
  to: Point,
  curved: boolean,
  radius: number = NODE_RADIUS,
): LinkGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return loopGeometry(from, radius); // états superposés : cas dégénéré

  const ux = dx / length;
  const uy = dy / length;
  const nx = uy; // normale « vers le haut » quand on va vers la droite
  const ny = -ux;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  if (!curved) {
    const start = { x: from.x + ux * radius, y: from.y + uy * radius };
    const end = { x: to.x - ux * radius, y: to.y - uy * radius };
    return {
      path: `M ${pt(start)} L ${pt(end)}`,
      label: { x: mid.x + nx * LABEL_OFFSET, y: mid.y + ny * LABEL_OFFSET },
    };
  }

  const control = { x: mid.x + nx * 2 * CURVE_BEND, y: mid.y + ny * 2 * CURVE_BEND };
  return {
    path: `M ${pt(towards(from, control, radius))} Q ${pt(control)} ${pt(towards(to, control, radius))}`,
    label: { x: mid.x + nx * (CURVE_BEND + 12), y: mid.y + ny * (CURVE_BEND + 12) },
  };
}
