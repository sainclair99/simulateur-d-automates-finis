import { NODE_RADIUS } from '../../application';

const MAX_FONT = 15;
const MIN_FONT = 9;
/** Largeur moyenne d'un caractère de la police à chasse fixe, en fraction de la taille de police. */
const GLYPH_RATIO = 0.6;
/** Écart entre le cercle extérieur et l'anneau intérieur d'un état final. */
export const FINAL_RING_GAP = 6;
const PADDING = 6;

export interface FittedLabel {
  readonly text: string;
  readonly fontSize: number;
  /** Vrai si le nom complet ne tient pas : le texte est alors abrégé avec « … » (le nom complet va dans l'infobulle). */
  readonly truncated: boolean;
}

/**
 * Adapte le nom d'un état à son cercle (l'anneau intérieur pour un état final) : police réduite si besoin
 * (jusqu'à 9 px), puis abrègement. Indispensable pour les états d'un AFD issu d'un AFN, nommés « {q0,q1} ».
 */
export function fitLabel(name: string, isFinal = false): FittedLabel {
  const innerRadius = isFinal ? NODE_RADIUS - FINAL_RING_GAP : NODE_RADIUS;
  const usableWidth = 2 * innerRadius - PADDING;
  const chars = Array.from(name);
  const natural = Math.min(MAX_FONT, Math.floor(usableWidth / (GLYPH_RATIO * Math.max(chars.length, 1))));
  if (natural >= MIN_FONT) return { text: name, fontSize: natural, truncated: false };
  const maxChars = Math.floor(usableWidth / (GLYPH_RATIO * MIN_FONT));
  return { text: `${chars.slice(0, maxChars - 1).join('')}…`, fontSize: MIN_FONT, truncated: true };
}
