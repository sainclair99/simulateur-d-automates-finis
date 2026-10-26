import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton } from '../endsWithAb.fixture';
import { LanguageDefinition } from '../definition/LanguageDefinition';
import { simulate } from './simulate';

const dfa = buildEndsWithAbAutomaton();
const nfa = buildNfaEndsWithAbAutomaton();
const states = (word: string, automaton = dfa): string[] =>
  simulate(automaton, word).steps.map((step) => step.activeStates.join(','));

function allWords(maxLength: number): string[] {
  let level = [''];
  const all = [''];
  for (let length = 1; length <= maxLength; length += 1) {
    level = level.flatMap((word) => [`${word}a`, `${word}b`]);
    all.push(...level);
  }
  return all;
}

describe('simulate : automate déterministe', () => {
  it('accepte « ab » et décrit chaque pas', () => {
    const result = simulate(dfa, 'ab');
    expect(result.verdict).toBe('accepted');
    expect(result.rejection).toBe(null);
    expect(states('ab')).toEqual(['q0', 'q1', 'q2']);
    expect(result.steps.map((step) => step.symbol)).toEqual([null, 'a', 'b']);
    expect(result.steps[1]?.firedTransitions).toEqual([{ from: 'q0', to: 'q1', symbol: 'a' }]);
    expect(result.endStates).toEqual(['q2']);
    expect(result.acceptingStates).toEqual(['q2']);
  });

  it.each(['ab', 'aab', 'bab', 'abab', 'bbab'])('accepte « %s »', (word) => {
    expect(simulate(dfa, word).verdict).toBe('accepted');
  });

  it.each(['', 'a', 'abb', 'ba', 'bbb'])('rejette « %s » : lu en entier mais état non final', (word) => {
    const result = simulate(dfa, word);
    expect(result.verdict).toBe('rejected');
    expect(result.rejection).toEqual({ reason: 'NOT_IN_FINAL_STATE' });
    expect(result.acceptingStates).toEqual([]);
    expect(result.steps).toHaveLength(Array.from(word).length + 1);
  });

  it('reconnaît exactement le langage de la regex (tous les mots jusqu’à 8 symboles)', () => {
    for (const word of allWords(8)) {
      const expected = /^(?:a|b)*ab$/.test(word);
      expect([word, simulate(dfa, word).verdict === 'accepted']).toEqual([word, expected]);
    }
  });
});

describe('simulate : rejets particuliers', () => {
  it('rejette un symbole hors alphabet et s’arrête juste avant', () => {
    const result = simulate(dfa, 'abc');
    expect(result.verdict).toBe('rejected');
    expect(result.rejection).toEqual({ reason: 'SYMBOL_NOT_IN_ALPHABET', index: 2, symbol: 'c' });
    expect(result.steps).toHaveLength(3);
    expect(result.endStates).toEqual(['q2']);
    expect(result.acceptingStates).toEqual([]);
  });

  it('traite un espace comme un symbole hors alphabet', () => {
    expect(simulate(dfa, 'a b').rejection).toEqual({ reason: 'SYMBOL_NOT_IN_ALPHABET', index: 1, symbol: ' ' });
  });

  it('rejette quand la lecture est bloquée (aucune transition)', () => {
    const blocked = dfa.withoutTransition({ from: 'q1', to: 'q2', symbol: 'b' });
    const result = simulate(blocked, 'ab');
    expect(result.verdict).toBe('rejected');
    expect(result.rejection).toEqual({ reason: 'NO_TRANSITION', index: 1, symbol: 'b' });
    expect(result.endStates).toEqual(['q1']);
    expect(result.steps).toHaveLength(2);
  });
});

describe('simulate : mot vide', () => {
  it('est accepté quand l’état initial est final', () => {
    const automaton = LanguageDefinition.create({
      regex: 'a*',
      alphabet: ['a'],
      states: [{ id: 'q0', isInitial: true, isFinal: true }],
    })
      .createAutomaton()
      .withTransition({ from: 'q0', to: 'q0', symbol: 'a' });
    expect(simulate(automaton, '').verdict).toBe('accepted');
    expect(simulate(automaton, '').steps).toHaveLength(1);
    expect(simulate(automaton, 'aaa').verdict).toBe('accepted');
  });
});

describe('simulate : automate non déterministe', () => {
  it('suit tous les chemins en parallèle', () => {
    const result = simulate(nfa, 'aab');
    expect(states('aab', nfa)).toEqual(['q0', 'q0,q1', 'q0,q1', 'q0,q2']);
    expect(result.steps[1]?.firedTransitions).toHaveLength(2);
    expect(result.verdict).toBe('accepted');
    expect(result.endStates).toEqual(['q0', 'q2']);
    expect(result.acceptingStates).toEqual(['q2']);
  });

  it('rejette si aucun chemin ne finit en état final', () => {
    expect(simulate(nfa, 'aba').rejection).toEqual({ reason: 'NOT_IN_FINAL_STATE' });
  });

  it('reconnaît le même langage que l’AFD (tous les mots jusqu’à 7 symboles)', () => {
    for (const word of allWords(7)) {
      expect([word, simulate(nfa, word).verdict]).toEqual([word, simulate(dfa, word).verdict]);
    }
  });
});
