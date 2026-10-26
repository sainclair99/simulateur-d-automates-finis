import { describe, expect, it } from 'vitest';
import { NODE_RADIUS } from '../../application';
import { FINAL_RING_GAP, fitLabel } from './label';

describe('fitLabel', () => {
  it.each([
    // nom, état final ?, police, texte affiché, abrégé ?
    ['q0', false, 15, 'q0', false],
    ['q12', true, 15, 'q12', false],
    ['{q0}', true, 15, '{q0}', false],
    ['{q0,q1}', false, 13, '{q0,q1}', false],
    ['{q0,q1}', true, 10, '{q0,q1}', false],
    ['{q0,q12}', false, 12, '{q0,q12}', false],
    ['{q0,q12}', true, 9, '{q0,q12}', false],
    ['{q0,q1,q2}', false, 9, '{q0,q1,q2}', false],
    ['{q0,q1,q2}', true, 9, '{q0,q1,…', true],
  ] as const)('« %s » (final : %s) → police %i', (name, isFinal, fontSize, text, truncated) => {
    expect(fitLabel(name, isFinal)).toEqual({ text, fontSize, truncated });
  });

  it('abrège les noms trop longs en gardant le début, plus court dans un état final', () => {
    expect(fitLabel('un-nom-vraiment-long')).toEqual({ text: 'un-nom-vr…', fontSize: 9, truncated: true });
    expect(fitLabel('un-nom-vraiment-long', true)).toEqual({ text: 'un-nom-…', fontSize: 9, truncated: true });
  });

  it('compte les caractères Unicode, pas les unités UTF-16', () => {
    expect(fitLabel('😀'.repeat(12)).truncated).toBe(true);
    expect(fitLabel('😀😀').fontSize).toBe(15);
  });

  it('ne dépasse jamais le cercle utile (0,6 × la taille de police par caractère)', () => {
    for (const isFinal of [false, true]) {
      const usable = 2 * (isFinal ? NODE_RADIUS - FINAL_RING_GAP : NODE_RADIUS) - 6;
      for (const length of [1, 3, 5, 7, 8, 9, 10, 12, 40]) {
        const { text, fontSize } = fitLabel('x'.repeat(length), isFinal);
        expect(Array.from(text).length * fontSize * 0.6).toBeLessThanOrEqual(usable + 0.001);
      }
    }
  });
});
