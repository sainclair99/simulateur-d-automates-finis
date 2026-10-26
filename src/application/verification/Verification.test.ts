import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import { endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { ConstructionState } from '../construction/ConstructionState';
import { Verification } from './Verification';

const definition = endsWithAbDefinition();
const TRANSITIONS: ReadonlyArray<readonly [string, string, string]> = [
  ['q0', 'q1', 'a'],
  ['q0', 'q0', 'b'],
  ['q1', 'q1', 'a'],
  ['q1', 'q2', 'b'],
  ['q2', 'q1', 'a'],
  ['q2', 'q0', 'b'],
];
const complete = (): ConstructionState =>
  TRANSITIONS.reduce((state, [from, to, symbol]) => state.addSymbol(from, to, symbol), ConstructionState.start(definition));

describe('Verification', () => {
  it('déclare conforme un automate équivalent à la regex', () => {
    const { view } = Verification.run(definition, complete());
    expect(view.status).toBe('equivalent');
    expect(view.title).toBe('Automate conforme');
    expect(view.detail).toContain('(a|b)*ab');
    expect(view.counterexample).toBe(null);
  });

  it('explique le contre-exemple quand la regex accepte et pas l’automate', () => {
    const broken = complete().removeSymbol('q2', 'q0', 'b');
    const { view } = Verification.run(definition, broken);
    expect(view.status).toBe('different');
    expect(view.counterexample).toBe('abbab');
    expect(view.detail).toBe("Le mot « abbab » appartient au langage de la regex, mais l'automate le rejette.");
  });

  it('explique le contre-exemple quand l’automate accepte à tort', () => {
    const tooMuch = complete().addSymbol('q0', 'q2', 'a');
    const { view } = Verification.run(definition, tooMuch);
    expect(view.counterexample).toBe('a');
    expect(view.detail).toBe("Le mot « a » est accepté par l'automate, mais n'appartient pas au langage de la regex.");
  });

  it('trouve un contre-exemple dès le départ sur un automate encore vide', () => {
    const { view } = Verification.run(definition, ConstructionState.start(definition));
    expect(view.status).toBe('different');
    expect(view.counterexample).toBe('ab');
  });

  it('nomme le mot vide quand l’automate l’accepte à tort', () => {
    // Regex « ab », mais l'état initial est aussi final : le mot vide est accepté à tort.
    const lenient = LanguageDefinition.create({
      regex: 'ab',
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', isInitial: true, isFinal: true },
        { id: 'q1', isInitial: false, isFinal: false },
        { id: 'q2', isInitial: false, isFinal: true },
      ],
    });
    const state = ConstructionState.start(lenient).addSymbol('q0', 'q1', 'a').addSymbol('q1', 'q2', 'b');
    const { view } = Verification.run(lenient, state);
    expect(view.counterexample).toBe('');
    expect(view.detail).toBe("Le mot vide (ε) est accepté par l'automate, mais n'appartient pas au langage de la regex.");
  });

  it('abandonne proprement quand la limite est atteinte', () => {
    const { view } = Verification.run(definition, complete(), 1);
    expect(view.status).toBe('inconclusive');
    expect(view.counterexample).toBe(null);
  });

  it('reste valable tant que l’automate n’est pas modifié (déplacer un état ne compte pas)', () => {
    const state = complete();
    const verification = Verification.run(definition, state);
    expect(verification.appliesTo(state)).toBe(true);
    expect(verification.appliesTo(state.placeState('q0', { x: 200, y: 200 }))).toBe(true);
    expect(verification.appliesTo(state.removeSymbol('q2', 'q0', 'b'))).toBe(false);
  });
});
