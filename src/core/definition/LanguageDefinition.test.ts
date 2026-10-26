import { describe, expect, it } from 'vitest';
import { InvalidAlphabetError } from '../model/Alphabet';
import { DomainError } from '../model/errors';
import type { State } from '../model/State';
import { RegexSyntaxError } from '../regex/errors';
import { regexToString } from '../regex/RegexAst';
import { LanguageDefinition } from './LanguageDefinition';

const states = (): State[] => [
  { id: 'q0', isInitial: true, isFinal: false },
  { id: 'q1', isInitial: false, isFinal: true },
];
const valid = { regex: '(a|b)*ab', alphabet: ['a', 'b'] };

describe('LanguageDefinition.create', () => {
  it('construit une définition valide et conserve l’AST de la regex', () => {
    const definition = LanguageDefinition.create({ ...valid, states: states() });
    expect(definition.regexSource).toBe('(a|b)*ab');
    expect(regexToString(definition.regex)).toBe('(((a|b)*a)b)');
    expect(definition.alphabet.toArray()).toEqual(['a', 'b']);
  });

  it('lève InvalidAlphabetError pour un alphabet invalide', () => {
    expect(() => LanguageDefinition.create({ ...valid, alphabet: ['a', 'a'], states: states() })).toThrow(
      InvalidAlphabetError,
    );
  });

  it('lève RegexSyntaxError pour une regex invalide ou hors alphabet', () => {
    expect(() => LanguageDefinition.create({ ...valid, regex: '(a', states: states() })).toThrow(RegexSyntaxError);
    expect(() => LanguageDefinition.create({ ...valid, regex: 'ac', states: states() })).toThrow(RegexSyntaxError);
  });

  it('lève DomainError pour des états invalides', () => {
    const noInitial = states().map((state) => ({ ...state, isInitial: false }));
    expect(() => LanguageDefinition.create({ ...valid, states: noInitial })).toThrow(DomainError);
  });

  it('se protège contre la modification ultérieure des données d’entrée', () => {
    const input = states();
    const definition = LanguageDefinition.create({ ...valid, states: input });
    input.length = 0;
    expect(definition.states).toHaveLength(2);
  });
});

describe('LanguageDefinition.createAutomaton', () => {
  it('crée un automate avec les états définis et aucune transition', () => {
    const automaton = LanguageDefinition.create({ ...valid, states: states() }).createAutomaton();
    expect(automaton.initialState).toBe('q0');
    expect(automaton.finalStates).toEqual(['q1']);
    expect(automaton.transitions).toHaveLength(0);
  });
});
