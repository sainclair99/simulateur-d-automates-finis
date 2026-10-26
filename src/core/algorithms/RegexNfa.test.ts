import { describe, expect, it } from 'vitest';
import { Alphabet } from '../model/Alphabet';
import { parseRegex } from '../regex/Parser';
import { allWords } from '../words.fixture';
import { RegexNfa } from './RegexNfa';

const alphabet = Alphabet.of(['a', 'b']);
const nfaOf = (source: string): RegexNfa => RegexNfa.fromRegex(parseRegex(source, alphabet));

describe('RegexNfa', () => {
  it.each(['a', 'ab', 'a|b', '(a|b)*ab', 'a*b+', '(ab)*', 'a?b', 'ε', '(a|ε)b', '(a*b*)*', 'a(b|a)*a|b', '((a|b)(a|b))*'])(
    'reconnaît exactement les mêmes mots que RegExp : %s',
    (source) => {
      const reference = new RegExp(`^(?:${source.replace(/ε/g, '(?:)')})$`);
      const nfa = nfaOf(source);
      for (const word of allWords(8)) {
        expect([word, nfa.accepts(word)]).toEqual([word, reference.test(word)]);
      }
    },
  );

  it('expose les ensembles d’états : départ, pas, acceptation', () => {
    const nfa = nfaOf('ab');
    const afterA = nfa.step(nfa.initial(), 'a');
    expect(nfa.isAccepting(nfa.initial())).toBe(false);
    expect(nfa.isAccepting(afterA)).toBe(false);
    expect(nfa.isAccepting(nfa.step(afterA, 'b'))).toBe(true);
    expect(nfa.step(nfa.initial(), 'b')).toEqual([]);
  });

  it('rejette un mot contenant un symbole inconnu', () => {
    expect(nfaOf('(a|b)*').accepts('abc')).toBe(false);
  });
});
