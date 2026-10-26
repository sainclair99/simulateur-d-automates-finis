import { describe, expect, it } from 'vitest';
import { Alphabet, InvalidAlphabetError } from './Alphabet';

describe('Alphabet', () => {
  it('accepte des symboles valides', () => {
    const alphabet = Alphabet.of(['a', 'b', '0']);
    expect(alphabet.has('a')).toBe(true);
    expect(alphabet.has('c')).toBe(false);
    expect(alphabet.toArray()).toEqual(['a', 'b', '0']);
  });

  it.each([
    ['vide', []],
    ['symbole multi-caractères', ['ab']],
    ['symbole vide', ['']],
    ['espace', [' ']],
    ['symbole réservé', ['*']],
    ['epsilon réservé', ['ε']],
    ['doublon', ['a', 'a']],
  ])('refuse un alphabet invalide : %s', (_label, symbols) => {
    expect(() => Alphabet.of(symbols)).toThrow(InvalidAlphabetError);
  });
});
