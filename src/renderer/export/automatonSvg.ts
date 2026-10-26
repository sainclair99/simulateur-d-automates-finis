import { NODE_RADIUS } from '../../application';
import type { Link, PlacedState, Point } from '../../application';
import { linkGeometry, loopGeometry } from '../canvas/geometry';
import type { LinkGeometry } from '../canvas/geometry';
import { fitLabel } from '../canvas/label';

export interface AutomatonDrawing {
  /** Document SVG complet et autonome (aucune feuille de style externe, couleurs en dur). */
  readonly svg: string;
  /** Taille en pixels : 1 unité du dessin = 1 pixel. */
  readonly width: number;
  readonly height: number;
}

interface Input {
  readonly nodes: readonly PlacedState[];
  readonly links: readonly Link[];
  readonly title?: string;
}

const MARGIN = 24;
const INK = '#1c2330';
const PAPER = '#ffffff';
const FONT = "ui-monospace, Menlo, Consolas, 'DejaVu Sans Mono', monospace";
const INITIAL_ARROW_LENGTH = 44;
const LABEL_FONT_SIZE = 15;
const GLYPH_WIDTH = 9;

const fmt = (value: number): string => String(Math.round(value * 10) / 10);

/** Échappement XML : les noms d'états et les symboles sont libres (ex. « a<b&c »). */
export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

class Bounds {
  minX = Number.POSITIVE_INFINITY;
  minY = Number.POSITIVE_INFINITY;
  maxX = Number.NEGATIVE_INFINITY;
  maxY = Number.NEGATIVE_INFINITY;

  include(x: number, y: number): void {
    this.minX = Math.min(this.minX, x);
    this.minY = Math.min(this.minY, y);
    this.maxX = Math.max(this.maxX, x);
    this.maxY = Math.max(this.maxY, y);
  }
}

/** Tous les couples de coordonnées d'un chemin SVG (points et points de contrôle) : suffit pour englober la courbe. */
function pathPoints(path: string): Point[] {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: Point[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 });
  }
  return points;
}

/**
 * Dessine l'automate comme sur l'écran de construction (états, doubles cercles pour les finals, flèche d'entrée,
 * boucles, flèches courbes quand la flèche inverse existe), recadré sur son contenu, fond blanc.
 * Les flèches encore vides (sans symbole) ne sont pas dessinées : elles n'ont pas de sens dans le langage.
 */
export function buildAutomatonSvg({ nodes, links, title }: Input): AutomatonDrawing {
  const positions = new Map<string, Point>(nodes.map((node): [string, Point] => [node.id, node.position]));
  const allKeys = new Set(links.map((link) => JSON.stringify([link.from, link.to])));
  const bounds = new Bounds();
  const parts: string[] = [];

  // --- Flèches ---
  for (const link of links) {
    const from = positions.get(link.from);
    const to = positions.get(link.to);
    if (!from || !to || link.symbols.length === 0) continue;
    const curved = link.from !== link.to && allKeys.has(JSON.stringify([link.to, link.from]));
    const geometry: LinkGeometry = link.from === link.to ? loopGeometry(from) : linkGeometry(from, to, curved);
    const label = link.symbols.join(', ');
    for (const point of pathPoints(geometry.path)) bounds.include(point.x, point.y);
    const halfLabel = (label.length * GLYPH_WIDTH) / 2 + 4;
    bounds.include(geometry.label.x - halfLabel, geometry.label.y - LABEL_FONT_SIZE);
    bounds.include(geometry.label.x + halfLabel, geometry.label.y + 6);
    parts.push(
      `<g class="link"><path d="${geometry.path}" fill="none" stroke="${INK}" stroke-width="2" marker-end="url(#arrow)"/>` +
        `<text x="${fmt(geometry.label.x)}" y="${fmt(geometry.label.y)}" text-anchor="middle" font-family="${FONT}" ` +
        `font-size="${LABEL_FONT_SIZE}" font-weight="600" fill="${INK}" stroke="${PAPER}" stroke-width="5" ` +
        `stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text></g>`,
    );
  }

  // --- États ---
  for (const node of nodes) {
    const { x, y } = node.position;
    bounds.include(x - NODE_RADIUS - 2, y - NODE_RADIUS - 2);
    bounds.include(x + NODE_RADIUS + 2, y + NODE_RADIUS + 2);
    let shape = '';
    if (node.isInitial) {
      bounds.include(x - NODE_RADIUS - INITIAL_ARROW_LENGTH - 2, y);
      shape += `<path d="M ${fmt(x - NODE_RADIUS - INITIAL_ARROW_LENGTH)} ${fmt(y)} L ${fmt(x - NODE_RADIUS)} ${fmt(y)}" fill="none" stroke="${INK}" stroke-width="2" marker-end="url(#arrow)"/>`;
    }
    shape += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${NODE_RADIUS}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;
    if (node.isFinal) {
      shape += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${NODE_RADIUS - 6}" fill="none" stroke="${INK}" stroke-width="2"/>`;
    }
    const label = fitLabel(node.id, node.isFinal);
    shape += `<text x="${fmt(x)}" y="${fmt(y)}" dy="0.35em" text-anchor="middle" font-family="${FONT}" font-size="${label.fontSize}" font-weight="600" fill="${INK}">${escapeXml(label.text)}${label.truncated ? `<title>${escapeXml(node.id)}</title>` : ''}</text>`;
    parts.push(`<g class="state">${shape}</g>`);
  }

  if (!Number.isFinite(bounds.minX)) bounds.include(0, 0); // aucun état : dessin vide mais valide

  const left = Math.floor(bounds.minX - MARGIN);
  const top = Math.floor(bounds.minY - MARGIN);
  const width = Math.ceil(bounds.maxX + MARGIN) - left;
  const height = Math.ceil(bounds.maxY + MARGIN) - top;

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}">\n` +
    (title === undefined ? '' : `<title>${escapeXml(title)}</title>\n`) +
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/></marker></defs>\n` +
    `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${PAPER}"/>\n` +
    `${parts.join('\n')}\n</svg>\n`;
  return { svg, width, height };
}
