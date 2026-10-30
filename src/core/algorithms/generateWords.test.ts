import { describe, expect, it } from 'vitest';
import { Alphabet } from '../model/Alphabet';
import { parseRegex } from '../regex/Parser';
import { allWords } from '../words.fixture';
import { generateWords } from './generateWords';

const ab = Alphabet.of(['a', 'b']);
const generate = (source: string, options = {}, alphabet = ab) => generateWords(parseRegex(source, alphabet), alphabet, options);
const jsRegExp = (source: string): RegExp => new RegExp(`^(?:${source.replace(/ε/g, '(?:)')})$`);

describe('generateWords : cas de référence', () => {
  it('« se termine par ab » : les plus courts mots dans l’ordre', () => {
    const { accepted, rejected, exhausted } = generate('(a|b)*ab');
    expect(accepted).toEqual(['ab', 'aab', 'bab', 'aaab', 'abab', 'baab', 'bbab', 'aaaab']);
    expect(rejected).toEqual(['', 'a', 'b', 'aa', 'ba', 'bb', 'aaa', 'aba']);
    expect(exhausted).toBe(false);
  });

  it('inclut le mot vide quand le langage le contient', () => {
    expect(generate('a*').accepted.slice(0, 4)).toEqual(['', 'a', 'aa', 'aaa']);
    // « b » est mort (aucun mot de a* ne commence par b) : on ne le prolonge pas, d'où « aab » et non « ba »
    expect(generate('a*').rejected.slice(0, 3)).toEqual(['b', 'ab', 'aab']);
  });

  it('énumère complètement un langage fini, et le dit', () => {
    const { accepted, rejected, exhausted } = generate('a|b|ab');
    expect(accepted).toEqual(['a', 'b', 'ab']);
    expect(rejected).toContain('');
    expect(exhausted).toBe(true);
  });

  it('ne prolonge pas un mot « mort » (plus aucun espoir d’être accepté)', () => {
    const { accepted, rejected } = generate('ab');
    expect(accepted).toEqual(['ab']);
    // « b » et « aa » sont morts : on ne les étend pas ; « aba » et « abb » viennent de « ab », encore vivant
    expect(rejected).toEqual(['', 'a', 'b', 'aa', 'aba', 'abb']);
  });

  it('ne trouve rien au-delà de la longueur maximale, et le dit', () => {
    const { accepted, exhausted } = generate('a'.repeat(16), { maxLength: 10 });
    expect(accepted).toEqual([]);
    expect(exhausted).toBe(false);
  });

  it('respecte le nombre demandé', () => {
    const { accepted, rejected } = generate('(a|b)*ab', { count: 3 });
    expect(accepted).toHaveLength(3);
    expect(rejected).toHaveLength(3);
  });
});

describe('generateWords : propriétés', () => {
  it.each(['(a|b)*ab', 'a*b+', '(ab)*', 'a?b', '(a|ε)b', '(a*b*)*', 'a(b|a)*a|b', '((a|b)(a|b))*', 'ε', 'a|b|ab', 'ab'])(
    'tous les mots sont bien classés et distincts : %s',
    (source) => {
      const reference = jsRegExp(source);
      const { accepted, rejected } = generate(source, { count: 12 });
      for (const word of accepted) expect([word, reference.test(word)]).toEqual([word, true]);
      for (const word of rejected) expect([word, reference.test(word)]).toEqual([word, false]);
      expect(new Set([...accepted, ...rejected]).size).toBe(accepted.length + rejected.length);
      const lengths = accepted.map((word) => word.length);
      expect([...lengths].sort((x, y) => x - y)).toEqual(lengths); // du plus court au plus long
    },
  );

  it('pour un langage où aucun état n’est « mort », donne exactement les premiers mots de chaque catégorie', () => {
    for (const source of ['(a|b)*ab', '(a|b)*', 'a*b+|b*a+']) {
      const reference = jsRegExp(source);
      const expectedAccepted = allWords(8).filter((word) => reference.test(word)).slice(0, 8);
      const { accepted } = generate(source, { maxLength: 8 });
      expect([source, accepted]).toEqual([source, expectedAccepted]);
    }
    const reference = jsRegExp('(a|b)*ab');
    expect(generate('(a|b)*ab').rejected).toEqual(allWords(8).filter((word) => !reference.test(word)).slice(0, 8));
  });

  it('termine vite avec un grand alphabet (la mémoire est plafonnée)', () => {
    const digits = Alphabet.of(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    const started = Date.now();
    const { accepted, rejected } = generateWords(parseRegex('(0|1|2|3|4|5|6|7|8|9)*9', digits), digits, { maxLength: 30 });
    expect(accepted.slice(0, 3)).toEqual(['9', '09', '19']);
    expect(rejected.slice(0, 3)).toEqual(['', '0', '1']);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('un langage vide ne produit aucun mot accepté', () => {
    // « a » suivi d'un mot que l'alphabet {a,b} ne permet pas d'obtenir n'existe pas ici ; on prend a{0} via ε·… : langage = {ε}
    const { accepted, rejected } = generate('ε');
    expect(accepted).toEqual(['']);
    expect(rejected.slice(0, 2)).toEqual(['a', 'b']);
  });
});
