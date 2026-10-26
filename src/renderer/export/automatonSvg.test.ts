import { describe, expect, it } from 'vitest';
import { NODE_RADIUS } from '../../application';
import type { Link, PlacedState } from '../../application';
import { buildAutomatonSvg, escapeXml } from './automatonSvg';

const node = (id: string, x: number, y: number, isInitial = false, isFinal = false): PlacedState => ({
  id,
  position: { x, y },
  isInitial,
  isFinal,
});

const nodes = [node('q0', 200, 300, true), node('q1', 500, 300), node('q2', 800, 300, false, true)];
const links: Link[] = [
  { from: 'q0', to: 'q1', symbols: ['a'] },
  { from: 'q1', to: 'q2', symbols: ['a', 'b'] },
  { from: 'q2', to: 'q2', symbols: ['b'] },
];

const count = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;

describe('escapeXml', () => {
  it('échappe les cinq caractères sensibles', () => {
    expect(escapeXml(`a<b&c>"d'`)).toBe('a&lt;b&amp;c&gt;&quot;d&#39;');
    expect(escapeXml('q0')).toBe('q0');
  });
});

describe('buildAutomatonSvg', () => {
  const { svg, width, height } = buildAutomatonSvg({ nodes, links, title: '(a|b)*ab' });

  it('produit un document SVG autonome et dimensionné', () => {
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain(`width="${width}" height="${height}"`);
    expect(svg).toContain('<title>(a|b)*ab</title>');
    expect(svg).not.toContain('var(');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
  });

  it('dessine chaque état, le double cercle des finals et la flèche d’entrée de l’état initial', () => {
    expect(count(svg, /<g class="state">/g)).toBe(3);
    for (const id of ['q0', 'q1', 'q2']) expect(svg).toContain(`>${id}</text>`);
    expect(count(svg, /<circle /g)).toBe(3 + 1); // 3 états + 1 anneau final
    // segments droits horizontaux : flèche d'entrée de q0 + q0→q1 + q1→q2
    expect(count(svg, /<path d="M [-\d.]+ 300 L [-\d.]+ 300" fill="none"/g)).toBe(3);
  });

  it('écrit les symboles de chaque flèche, boucles comprises', () => {
    expect(svg).toContain('>a</text>');
    expect(svg).toContain('>a, b</text>');
    expect(svg).toContain('>b</text>');
    expect(count(svg, /<g class="link">/g)).toBe(3);
    expect(svg).toContain(' C '); // la boucle sur q2 est une courbe de Bézier
  });

  it('recadre sur le contenu avec une marge, et englobe tous les états et la flèche d’entrée', () => {
    const viewBox = /viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/.exec(svg);
    expect(viewBox).not.toBe(null);
    const [left, top, w, h] = (viewBox ?? []).slice(1).map(Number) as [number, number, number, number];
    expect(w).toBe(width);
    expect(h).toBe(height);
    expect(left).toBeLessThanOrEqual(200 - NODE_RADIUS - 44);
    expect(left + w).toBeGreaterThanOrEqual(800 + NODE_RADIUS);
    expect(top).toBeLessThan(300 - NODE_RADIUS - 60); // la boucle de q2 passe au-dessus
    expect(top + h).toBeGreaterThan(300 + NODE_RADIUS);
    expect(w).toBeLessThan(900); // et non la zone de travail entière
  });

  it('n’affiche pas les flèches encore vides', () => {
    const withPending = buildAutomatonSvg({ nodes, links: [...links, { from: 'q0', to: 'q2', symbols: [] }] });
    expect(count(withPending.svg, /<g class="link">/g)).toBe(3);
  });

  it('courbe les deux flèches quand elles vont dans les deux sens', () => {
    const both = buildAutomatonSvg({
      nodes,
      links: [
        { from: 'q0', to: 'q1', symbols: ['a'] },
        { from: 'q1', to: 'q0', symbols: ['b'] },
      ],
    });
    expect(count(both.svg, / Q /g)).toBe(2);
    expect(count(buildAutomatonSvg({ nodes, links: [links[0] as Link] }).svg, / Q /g)).toBe(0);
  });

  it('échappe les noms d’états, les symboles et le titre', () => {
    const tricky = buildAutomatonSvg({
      nodes: [node('a<b&"c"', 200, 300, true, true)],
      links: [{ from: 'a<b&"c"', to: 'a<b&"c"', symbols: ['<', '&'] }],
      title: '<script>',
    });
    expect(tricky.svg).toContain('>a&lt;b&amp;&quot;c&quot;</text>');
    expect(tricky.svg).toContain('>&lt;, &amp;</text>');
    expect(tricky.svg).toContain('<title>&lt;script&gt;</title>');
    expect(tricky.svg).not.toContain('<script>');
  });

  it('ignore une flèche dont une extrémité n’est pas placée', () => {
    const partial = buildAutomatonSvg({ nodes: [node('q0', 200, 300, true)], links: [{ from: 'q0', to: 'q1', symbols: ['a'] }] });
    expect(count(partial.svg, /<g class="link">/g)).toBe(0);
  });

  it('reste valide sans aucun état', () => {
    const empty = buildAutomatonSvg({ nodes: [], links: [] });
    expect(empty.width).toBeGreaterThan(0);
    expect(empty.svg).not.toContain('NaN');
  });

  it('est déterministe', () => {
    expect(buildAutomatonSvg({ nodes, links }).svg).toBe(buildAutomatonSvg({ nodes, links }).svg);
  });
});

describe('buildAutomatonSvg : noms d’états longs', () => {
  const long = (id: string) => buildAutomatonSvg({ nodes: [node(id, 200, 300, true, true)], links: [] }).svg;

  it('réduit la police pour qu’un nom comme « {q0,q1} » tienne dans l’anneau d’un état final', () => {
    expect(long('{q0,q1}')).toContain('font-size="10"'); // long() dessine un état final
    expect(long('q0')).toContain('font-size="15"');
    const plain = buildAutomatonSvg({ nodes: [node('{q0,q1}', 200, 300, true, false)], links: [] }).svg;
    expect(plain).toContain('font-size="13"');
  });

  it('abrège un nom trop long et garde le nom complet dans une infobulle', () => {
    const svg = long('{q0,q1,q2,q3}');
    expect(svg).toContain('>{q0,q1,…<title>{q0,q1,q2,q3}</title></text>');
  });
});
