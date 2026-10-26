import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton, endsWithAbDefinition } from '../endsWithAb.fixture';
import { Automaton } from '../model/Automaton';
import { parseRegex } from '../regex/Parser';
import { simulate } from '../simulation/simulate';
import { allWords } from '../words.fixture';
import { compareWithRegex } from './compareWithRegex';
import { RegexNfa } from './RegexNfa';

const definition = endsWithAbDefinition();
const regex = definition.regex;
const oracle = RegexNfa.fromRegex(regex);

/** Référence indépendante : essaie tous les mots par ordre croissant (simulateur + NFA de la regex). */
function bruteForce(automaton: Automaton): { word: string; regexAccepts: boolean } | null {
  for (const word of allWords(9)) {
    const automatonAccepts = simulate(automaton, word).verdict === 'accepted';
    const regexAccepts = oracle.accepts(word);
    if (automatonAccepts !== regexAccepts) return { word, regexAccepts };
  }
  return null;
}

describe('compareWithRegex', () => {
  it('reconnaît un AFD et un AFN équivalents à la regex', () => {
    expect(compareWithRegex(buildEndsWithAbAutomaton(), regex).kind).toBe('equivalent');
    expect(compareWithRegex(buildNfaEndsWithAbAutomaton(), regex).kind).toBe('equivalent');
  });

  it('trouve le plus court contre-exemple quand une transition manque', () => {
    const broken = buildEndsWithAbAutomaton().withoutTransition({ from: 'q2', to: 'q0', symbol: 'b' });
    expect(compareWithRegex(broken, regex)).toEqual({ kind: 'different', word: 'abbab', regexAccepts: true });
  });

  it('signale un mot accepté à tort par l’automate', () => {
    const tooMuch = buildEndsWithAbAutomaton().withTransition({ from: 'q0', to: 'q2', symbol: 'a' });
    expect(compareWithRegex(tooMuch, regex)).toEqual({ kind: 'different', word: 'a', regexAccepts: false });
  });

  it('signale le mot vide quand l’état initial est final à tort', () => {
    expect(compareWithRegex(withInitialStateFinal(), regex)).toEqual({ kind: 'different', word: '', regexAccepts: false });
  });

  it('compare des langages différents', () => {
    const other = parseRegex('(a|b)*ba', definition.alphabet);
    expect(compareWithRegex(buildEndsWithAbAutomaton(), other)).toEqual({
      kind: 'different',
      word: 'ab',
      regexAccepts: false,
    });
  });

  it('renonce proprement quand la limite d’exploration est atteinte', () => {
    expect(compareWithRegex(buildEndsWithAbAutomaton(), regex, 1).kind).toBe('inconclusive');
  });

  it('donne toujours le même résultat que la recherche exhaustive, sur toutes les variantes de l’automate', () => {
    const base = buildEndsWithAbAutomaton();
    const variants: Automaton[] = [base, buildNfaEndsWithAbAutomaton()];
    for (const transition of base.transitions) variants.push(base.withoutTransition(transition));
    for (const from of ['q0', 'q1', 'q2']) {
      for (const to of ['q0', 'q1', 'q2']) {
        for (const symbol of ['a', 'b']) {
          const candidate = { from, to, symbol };
          if (!base.transitions.some((t) => t.from === from && t.to === to && t.symbol === symbol)) {
            variants.push(base.withTransition(candidate));
          }
        }
      }
    }
    expect(variants.length).toBeGreaterThan(15);
    for (const variant of variants) {
      const expected = bruteForce(variant);
      const actual = compareWithRegex(variant, regex);
      if (expected === null) {
        expect(actual.kind).toBe('equivalent');
      } else {
        expect(actual).toEqual({ kind: 'different', ...expected });
      }
    }
  });
});

/** Même automate, mais q0 devient aussi final : le mot vide est alors accepté à tort. */
function withInitialStateFinal(): Automaton {
  const base = buildEndsWithAbAutomaton();
  const states = base.states.map((state) => (state.id === 'q0' ? { ...state, isFinal: true } : state));
  return Automaton.create(base.alphabet, states, base.transitions);
}
