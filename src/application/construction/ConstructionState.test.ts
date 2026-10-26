import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import { expectDomainError } from '../../core/test-helpers.fixture';
import { ConstructionState } from './ConstructionState';
import { BOUNDS, distance, NODE_RADIUS } from './layout';

const definition = (count = 3): LanguageDefinition =>
  LanguageDefinition.create({
    regex: '(a|b)*',
    alphabet: ['a', 'b'],
    states: Array.from({ length: count }, (_, index) => ({
      id: `q${index}`,
      isInitial: index === 0,
      isFinal: index === count - 1,
    })),
  });
const start = (count = 3): ConstructionState => ConstructionState.start(definition(count));

describe('ConstructionState : placement', () => {
  it('démarre sans état placé ni liaison', () => {
    const state = start();
    expect(state.unplacedStates).toEqual(['q0', 'q1', 'q2']);
    expect(state.placedStates).toEqual([]);
    expect(state.links).toEqual([]);
  });

  it('place un état en le ramenant dans le canevas', () => {
    const state = start().placeState('q1', { x: -50, y: 9999 });
    expect(state.positions.get('q1')).toEqual({ x: BOUNDS.minX, y: BOUNDS.maxY });
    expect(state.unplacedStates).toEqual(['q0', 'q2']);
    expect(state.placedStates).toEqual([
      { id: 'q1', position: { x: BOUNDS.minX, y: BOUNDS.maxY }, isInitial: false, isFinal: false },
    ]);
  });

  it('refuse un état inconnu et reste immuable', () => {
    const original = start();
    expectDomainError(() => original.placeState('qX', { x: 100, y: 200 }), 'UNKNOWN_STATE');
    original.placeState('q0', { x: 100, y: 200 });
    expect(original.placedStates).toEqual([]);
  });

  it('dispose tous les états avec l’état initial le plus à gauche', () => {
    const state = start(6).autoLayout();
    const positions = state.placedStates.map((placed) => placed.position);
    expect(state.unplacedStates).toEqual([]);
    const [initial, ...others] = positions;
    for (const other of others) expect(initial && initial.x < other.x).toBe(true);
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const a = positions[i];
        const b = positions[j];
        expect(a && b && distance(a, b) >= 2 * NODE_RADIUS + 10).toBe(true);
      }
    }
  });

  it('complète le placement sans déplacer ni recouvrir les états déjà posés', () => {
    const manual = { x: 450, y: 310 };
    const state = start().placeState('q0', manual).completeLayout();
    expect(state.unplacedStates).toEqual([]);
    expect(state.positions.get('q0')).toEqual(manual);
    const others = ['q1', 'q2'].map((id) => state.positions.get(id));
    for (const position of others) expect(position && distance(position, manual) >= 80).toBe(true);
    const [first, second] = others;
    expect(first && second && distance(first, second) >= 80).toBe(true);
  });

  it('complete sans effet quand tout est placé', () => {
    const placed = start().autoLayout();
    expect(placed.completeLayout()).toBe(placed);
  });
});

describe('ConstructionState : stateAt', () => {
  it('trouve l’état sous le pointeur, avec une petite tolérance', () => {
    const state = start().placeState('q0', { x: 100, y: 200 }).placeState('q1', { x: 300, y: 200 });
    expect(state.stateAt({ x: 105, y: 205 })).toBe('q0');
    expect(state.stateAt({ x: 100 + NODE_RADIUS + 4, y: 200 })).toBe('q0');
    expect(state.stateAt({ x: 200, y: 200 })).toBe(null);
    expect(state.stateAt({ x: 298, y: 190 })).toBe('q1');
  });
});

describe('ConstructionState : liaisons et symboles', () => {
  it('crée une liaison vide sans créer de transition', () => {
    const state = start().addLink('q0', 'q1');
    expect(state.links).toEqual([{ from: 'q0', to: 'q1', symbols: [] }]);
    expect(state.automaton.transitions).toHaveLength(0);
  });

  it('ignore la création d’une liaison déjà existante', () => {
    const state = start().addLink('q0', 'q1');
    expect(state.addLink('q0', 'q1')).toBe(state);
  });

  it('crée une transition par symbole déposé, triés selon l’alphabet', () => {
    const state = start().addLink('q0', 'q1').addSymbol('q0', 'q1', 'b').addSymbol('q0', 'q1', 'a');
    expect(state.links).toEqual([{ from: 'q0', to: 'q1', symbols: ['a', 'b'] }]);
    expect(state.automaton.transitions).toHaveLength(2);
  });

  it('crée la liaison si on dépose directement un symbole', () => {
    const state = start().addSymbol('q0', 'q2', 'a');
    expect(state.links).toEqual([{ from: 'q0', to: 'q2', symbols: ['a'] }]);
  });

  it('gère les boucles (symbole déposé sur un état)', () => {
    const state = start().addSymbol('q1', 'q1', 'a');
    expect(state.links).toEqual([{ from: 'q1', to: 'q1', symbols: ['a'] }]);
    expect(state.automaton.next('q1', 'a')).toEqual(['q1']);
  });

  it('conserve la flèche quand on retire son dernier symbole', () => {
    const state = start().addSymbol('q0', 'q1', 'a').removeSymbol('q0', 'q1', 'a');
    expect(state.links).toEqual([{ from: 'q0', to: 'q1', symbols: [] }]);
    expect(state.automaton.transitions).toHaveLength(0);
  });

  it('retire un symbole parmi plusieurs', () => {
    const state = start().addSymbol('q0', 'q1', 'a').addSymbol('q0', 'q1', 'b').removeSymbol('q0', 'q1', 'a');
    expect(state.links).toEqual([{ from: 'q0', to: 'q1', symbols: ['b'] }]);
  });

  it('supprime la liaison avec toutes ses transitions', () => {
    const state = start()
      .addSymbol('q0', 'q1', 'a')
      .addSymbol('q0', 'q1', 'b')
      .addSymbol('q1', 'q2', 'a')
      .removeLink('q0', 'q1');
    expect(state.links).toEqual([{ from: 'q1', to: 'q2', symbols: ['a'] }]);
    expect(state.automaton.transitions).toHaveLength(1);
  });

  it('bascule un symbole', () => {
    const on = start().toggleSymbol('q0', 'q1', 'a');
    expect(on.automaton.next('q0', 'a')).toEqual(['q1']);
    expect(on.toggleSymbol('q0', 'q1', 'a').automaton.next('q0', 'a')).toEqual([]);
  });

  it('refuse ce que le domaine interdit', () => {
    const state = start().addSymbol('q0', 'q1', 'a');
    expectDomainError(() => state.addSymbol('q0', 'q1', 'a'), 'DUPLICATE_TRANSITION');
    expectDomainError(() => state.addSymbol('q0', 'q1', 'c'), 'SYMBOL_NOT_IN_ALPHABET');
    expectDomainError(() => state.addLink('q0', 'qX'), 'UNKNOWN_STATE');
    expectDomainError(() => state.removeSymbol('q0', 'q1', 'b'), 'TRANSITION_NOT_FOUND');
  });

  it('expose les diagnostics de l’automate', () => {
    const codes = start().diagnostics().map((diagnostic) => diagnostic.code);
    expect(codes).toContain('NO_REACHABLE_FINAL_STATE');
  });
});
