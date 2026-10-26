import { describe, expect, it } from 'vitest';
import { Alphabet } from '../model/Alphabet';
import { RegexSyntaxError } from './errors';
import { parseRegex } from './Parser';
import { regexToString } from './RegexAst';

const alphabet = Alphabet.of(['a', 'b']);
const parse = (source: string): string => regexToString(parseRegex(source, alphabet));

describe('parseRegex : structure', () => {
  it.each([
    ['a', 'a'],
    ['ε', 'ε'],
    ['(a)', 'a'],
    ['ab', '(ab)'],
    ['abb', '((ab)b)'],
    ['a|b', '(a|b)'],
    ['a|b|a', '((a|b)|a)'],
    ['a*', 'a*'],
    ['a**', 'a**'],
    ['a | b', '(a|b)'],
  ])('%s → %s', (source, expected) => {
    expect(parse(source)).toBe(expected);
  });

  it('respecte les priorités : étoile > concaténation > union', () => {
    expect(parse('ab|a')).toBe('((ab)|a)');
    expect(parse('a|ba')).toBe('(a|(ba))');
    expect(parse('ab*')).toBe('(ab*)');
    expect(parse('(a|b)*ab')).toBe('(((a|b)*a)b)');
  });

  it('développe le sucre syntaxique + et ?', () => {
    expect(parse('a+')).toBe('(aa*)');
    expect(parse('a?')).toBe('(a|ε)');
    expect(parse('(ab)+')).toBe('((ab)(ab)*)');
  });
});

describe('parseRegex : erreurs', () => {
  it.each([
    ['', 0],
    ['a|', 2],
    ['a||b', 2],
    ['*a', 0],
    ['(a', 2],
    ['a)', 1],
    ['()', 1],
    ['ac', 1],
  ])('« %s » lève une RegexSyntaxError à la position %i', (source, position) => {
    try {
      parseRegex(source, alphabet);
      expect.unreachable('une erreur de syntaxe était attendue');
    } catch (error) {
      expect(error).toBeInstanceOf(RegexSyntaxError);
      expect((error as RegexSyntaxError).position).toBe(position);
    }
  });

  it("signale un symbole hors de l'alphabet", () => {
    expect(() => parseRegex('ac', alphabet)).toThrow(/« c »/);
  });
});
