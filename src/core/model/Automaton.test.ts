import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton } from '../endsWithAb.fixture';
import { expectDomainError } from '../test-helpers.fixture';
import { Alphabet } from './Alphabet';
import { Automaton } from './Automaton';
import type { DomainErrorCode } from './errors';
import type { State } from './State';

const alphabet = Alphabet.of(['a', 'b']);
const q0: State = { id: 'q0', isInitial: true, isFinal: false };
const q1: State = { id: 'q1', isInitial: false, isFinal: false };
const q2: State = { id: 'q2', isInitial: false, isFinal: true };
const empty = (): Automaton => Automaton.create(alphabet, [q0, q1, q2]);

describe('Automaton.create : états', () => {
  it('accepte un état à la fois initial et final', () => {
    const automaton = Automaton.create(alphabet, [{ id: 'q0', isInitial: true, isFinal: true }]);
    expect(automaton.initialState).toBe('q0');
    expect(automaton.finalStates).toEqual(['q0']);
  });

  const invalid: Array<[string, State[], DomainErrorCode]> = [
    ['aucun état', [], 'EMPTY_STATE_SET'],
    ['nom vide', [{ id: '  ', isInitial: true, isFinal: true }], 'EMPTY_STATE_NAME'],
    ['état en double', [q0, q2, { ...q2 }], 'DUPLICATE_STATE'],
    ['aucun état initial', [{ ...q0, isInitial: false }, q2], 'NO_INITIAL_STATE'],
    ['deux états initiaux', [q0, { ...q2, isInitial: true }], 'MULTIPLE_INITIAL_STATES'],
    ['aucun état final', [q0, q1], 'NO_FINAL_STATE'],
  ];
  it.each(invalid)('refuse : %s', (_label, states, code) => {
    expectDomainError(() => Automaton.create(alphabet, states), code);
  });
});

describe('Automaton.withTransition', () => {
  it('ajoute une transition sans modifier l’instance d’origine', () => {
    const before = empty();
    const after = before.withTransition({ from: 'q0', to: 'q1', symbol: 'a' });
    expect(before.transitions).toHaveLength(0);
    expect(after.transitions).toEqual([{ from: 'q0', to: 'q1', symbol: 'a' }]);
  });

  it('autorise plusieurs symboles entre les mêmes états', () => {
    const automaton = empty()
      .withTransition({ from: 'q0', to: 'q1', symbol: 'a' })
      .withTransition({ from: 'q0', to: 'q1', symbol: 'b' });
    expect(automaton.transitions).toHaveLength(2);
  });

  it('refuse un état source ou cible inconnu', () => {
    expectDomainError(() => empty().withTransition({ from: 'qX', to: 'q1', symbol: 'a' }), 'UNKNOWN_STATE');
    expectDomainError(() => empty().withTransition({ from: 'q0', to: 'qX', symbol: 'a' }), 'UNKNOWN_STATE');
  });

  it('refuse un symbole hors alphabet', () => {
    expectDomainError(() => empty().withTransition({ from: 'q0', to: 'q1', symbol: 'c' }), 'SYMBOL_NOT_IN_ALPHABET');
  });

  it('refuse une transition en double', () => {
    const automaton = empty().withTransition({ from: 'q0', to: 'q1', symbol: 'a' });
    expectDomainError(() => automaton.withTransition({ from: 'q0', to: 'q1', symbol: 'a' }), 'DUPLICATE_TRANSITION');
  });
});

describe('Automaton.withoutTransition', () => {
  it('retire une transition existante', () => {
    const transition = { from: 'q0', to: 'q1', symbol: 'a' };
    const automaton = empty().withTransition(transition).withoutTransition(transition);
    expect(automaton.transitions).toHaveLength(0);
  });

  it('refuse de retirer une transition absente', () => {
    expectDomainError(
      () => empty().withoutTransition({ from: 'q0', to: 'q1', symbol: 'a' }),
      'TRANSITION_NOT_FOUND',
    );
  });
});

describe('Automaton : requêtes', () => {
  it('lit les transitions de l’automate « se termine par ab »', () => {
    const automaton = buildEndsWithAbAutomaton();
    expect(automaton.next('q0', 'a')).toEqual(['q1']);
    expect(automaton.next('q1', 'b')).toEqual(['q2']);
    expect(automaton.next('q2', 'b')).toEqual(['q0']);
    expect(automaton.isDeterministic()).toBe(true);
    expect(automaton.isFinal('q2')).toBe(true);
    expect(automaton.isFinal('q0')).toBe(false);
    expect(automaton.isInitial('q0')).toBe(true);
    expect(automaton.finalStates).toEqual(['q2']);
  });

  it('renvoie un résultat vide quand aucune transition ne correspond', () => {
    expect(empty().next('q0', 'a')).toEqual([]);
  });

  it('détecte le non-déterminisme', () => {
    const automaton = empty()
      .withTransition({ from: 'q0', to: 'q0', symbol: 'a' })
      .withTransition({ from: 'q0', to: 'q1', symbol: 'a' });
    expect(automaton.next('q0', 'a')).toEqual(['q0', 'q1']);
    expect(automaton.isDeterministic()).toBe(false);
  });

  it('calcule les états accessibles', () => {
    const automaton = empty().withTransition({ from: 'q0', to: 'q1', symbol: 'a' });
    expect([...automaton.reachableStates()].sort()).toEqual(['q0', 'q1']);
  });
});
