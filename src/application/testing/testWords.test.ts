import { describe, expect, it } from 'vitest';
import { Automaton } from '../../core';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton, endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { generateTestWords, runTestWords } from './testWords';

const definition = endsWithAbDefinition();
const words = generateTestWords(definition);

describe('generateTestWords', () => {
  it('tire les plus courts mots acceptés et rejetés de la regex de la définition', () => {
    expect(words.accepted).toEqual(['ab', 'aab', 'bab', 'aaab', 'abab', 'baab', 'bbab', 'aaaab']);
    expect(words.rejected).toEqual(['', 'a', 'b', 'aa', 'ba', 'bb', 'aaa', 'aba']);
  });

  it('accepte des options (nombre de mots)', () => {
    const few = generateTestWords(definition, { count: 2 });
    expect(few.accepted).toEqual(['ab', 'aab']);
    expect(few.rejected).toEqual(['', 'a']);
  });
});

describe('runTestWords', () => {
  it('déclare conforme un automate (AFD ou AFN) équivalent à la regex', () => {
    for (const automaton of [buildEndsWithAbAutomaton(), buildNfaEndsWithAbAutomaton()]) {
      const report = runTestWords(automaton, words);
      expect(report.total).toBe(16);
      expect(report.failures).toEqual([]);
      expect(report.summary).toBe("Les 16 mots de test donnent le même verdict avec l'automate et avec la regex.");
      expect(report.results.slice(0, 8).every((r) => r.expected && r.actual)).toBe(true);
      expect(report.results.slice(8).every((r) => !r.expected && !r.actual)).toBe(true);
    }
  });

  it('relève les mots que l’automate rejette à tort, avec une explication', () => {
    const broken = buildEndsWithAbAutomaton().withoutTransition({ from: 'q2', to: 'q0', symbol: 'b' });
    const report = runTestWords(broken, generateTestWords(definition, { count: 12 }));
    expect(report.failures.length).toBeGreaterThan(0);
    const failure = report.failures[0];
    expect(failure?.expected).toBe(true);
    expect(failure?.actual).toBe(false);
    expect(failure?.description).toBe(
      `Le mot « ${failure?.word} » appartient au langage de la regex, mais l'automate le rejette.`,
    );
    expect(report.summary).toMatch(/^\d+ écarts? sur 24 mots de test\.$/);
  });

  it('relève les mots que l’automate accepte à tort', () => {
    const tooMuch = buildEndsWithAbAutomaton().withTransition({ from: 'q0', to: 'q2', symbol: 'a' });
    const report = runTestWords(tooMuch, words);
    const failure = report.failures.find((f) => f.word === 'a');
    expect(failure?.description).toBe("Le mot « a » est accepté par l'automate, mais n'appartient pas au langage de la regex.");
    expect(report.failures.every((f) => f.expected !== f.actual)).toBe(true);
  });

  it('nomme le mot vide', () => {
    const base = buildEndsWithAbAutomaton();
    const initialFinal = Automaton.create(
      base.alphabet,
      base.states.map((s) => (s.id === 'q0' ? { ...s, isFinal: true } : s)),
      base.transitions,
    );
    const failure = runTestWords(initialFinal, words).failures.find((f) => f.word === '');
    expect(failure?.description).toBe("Le mot vide (ε) est accepté par l'automate, mais n'appartient pas au langage de la regex.");
  });

  it('s’accorde au singulier et gère l’absence de mots', () => {
    const one = { accepted: [], rejected: ['a'], exhausted: false };
    const tooMuch = buildEndsWithAbAutomaton().withTransition({ from: 'q0', to: 'q2', symbol: 'a' });
    expect(runTestWords(tooMuch, one).summary).toBe('1 écart sur 1 mots de test.');
    expect(runTestWords(tooMuch, { accepted: [], rejected: [], exhausted: true }).summary).toBe('Aucun mot de test à vérifier.');
  });

  it('ne prouve pas l’équivalence : un automate faux peut passer tous les mots de test', () => {
    // il manque q2 -b-> q0 : « abbab » est rejeté à tort, mais c'est plus long que les 8 plus courts mots acceptés
    const broken = buildEndsWithAbAutomaton().withoutTransition({ from: 'q2', to: 'q0', symbol: 'b' });
    expect(runTestWords(broken, words).failures).toEqual([]);
    expect(runTestWords(broken, generateTestWords(definition, { count: 12 })).failures.length).toBeGreaterThan(0);
  });

  it('est cohérent avec la simulation et la comparaison exacte à la regex', () => {
    // Si la comparaison exacte dit « conforme », aucun mot de test ne peut échouer.
    expect(runTestWords(buildEndsWithAbAutomaton(), generateTestWords(definition, { count: 30 })).failures).toEqual([]);
  });
});
