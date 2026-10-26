import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import { buildEndsWithAbAutomaton, endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { ConstructionState } from '../construction/ConstructionState';
import { Verification } from '../verification/Verification';
import { convertToDfa } from './convertToDfa';

const definition = endsWithAbDefinition();

/** AFN « se termine par ab » dessiné dans l'écran de construction. */
const nfa = (): ConstructionState =>
  (
    [
      ['q0', 'q0', 'a'],
      ['q0', 'q0', 'b'],
      ['q0', 'q1', 'a'],
      ['q1', 'q2', 'b'],
    ] as const
  ).reduce((state, [from, to, symbol]) => state.addSymbol(from, to, symbol), ConstructionState.start(definition));

function converted(state: ConstructionState, complete = false) {
  const outcome = convertToDfa(definition, state, { complete });
  if (outcome.kind !== 'converted') throw new Error(`Conversion attendue : ${outcome.message}`);
  return outcome;
}

describe('ConstructionState.isDeterministic', () => {
  it('distingue AFN et AFD', () => {
    expect(nfa().isDeterministic).toBe(false);
    expect(ConstructionState.start(definition).isDeterministic).toBe(true);
  });
});

describe('convertToDfa', () => {
  it('produit un nouveau projet déterministe, placé, avec le même langage', () => {
    const outcome = converted(nfa());
    expect(outcome.definition.regexSource).toBe('(a|b)*ab');
    expect(outcome.definition.alphabet.toArray()).toEqual(['a', 'b']);
    expect(outcome.definition.states.map((s) => s.id)).toEqual(['{q0}', '{q0,q1}', '{q0,q2}']);
    expect(outcome.construction.isDeterministic).toBe(true);
    expect(outcome.construction.unplacedStates).toEqual([]);
    expect(outcome.construction.automaton.transitions).toHaveLength(6);
    expect(outcome.message).toBe(
      "AFN converti en AFD : 3 états (contre 3 pour l'AFN). Chaque état de l'AFD est un ensemble d'états de l'AFN.",
    );
  });

  it('reste conforme à la regex après la conversion', () => {
    const before = Verification.run(definition, nfa()).view.status;
    const outcome = converted(nfa());
    const after = Verification.run(outcome.definition, outcome.construction).view;
    expect(before).toBe('equivalent');
    expect(after.status).toBe('equivalent');
  });

  it('ne modifie pas le projet d’origine', () => {
    const original = nfa();
    converted(original);
    expect(original.isDeterministic).toBe(false);
    expect(original.automaton.states.map((s) => s.id)).toEqual(['q0', 'q1', 'q2']);
  });

  it('ajoute l’état puits quand on le demande, et l’annonce', () => {
    const partial = ConstructionState.start(definition)
      .addSymbol('q0', 'q0', 'a')
      .addSymbol('q0', 'q1', 'a')
      .addSymbol('q1', 'q2', 'b');
    const plain = converted(partial);
    const full = converted(partial, true);
    expect(plain.definition.states.some((s) => s.id === '∅')).toBe(false);
    expect(full.definition.states.some((s) => s.id === '∅')).toBe(true);
    expect(full.message).toContain("∅ est l'état puits ajouté pour compléter l'AFD.");
  });

  it('refuse un automate déjà déterministe', () => {
    const dfa = buildEndsWithAbAutomaton().transitions.reduce(
      (state, t) => state.addSymbol(t.from, t.to, t.symbol),
      ConstructionState.start(definition),
    );
    expect(convertToDfa(definition, dfa, { complete: false })).toEqual({
      kind: 'failed',
      message: "L'automate est déjà déterministe : il n'y a rien à convertir.",
    });
  });

  it('explique pourquoi la conversion est impossible quand aucun état final n’est accessible', () => {
    const noFinal = ConstructionState.start(definition).addSymbol('q0', 'q0', 'a').addSymbol('q0', 'q1', 'a');
    const outcome = convertToDfa(definition, noFinal, { complete: false });
    expect(outcome.kind).toBe('failed');
    expect(outcome.message).toContain("Aucun état final n'est accessible");
  });

  it('explique pourquoi la conversion est impossible quand l’AFD serait énorme', () => {
    // le n-ième symbole avant la fin est un a : 2^n états
    const n = 10;
    const big = LanguageDefinition.create({
      regex: '(a|b)*a(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)',
      alphabet: ['a', 'b'],
      states: Array.from({ length: n + 1 }, (_, i) => ({ id: `q${i}`, isInitial: i === 0, isFinal: i === n })),
    });
    let state = ConstructionState.start(big).addSymbol('q0', 'q0', 'a').addSymbol('q0', 'q0', 'b').addSymbol('q0', 'q1', 'a');
    for (let i = 1; i < n; i += 1) state = state.addSymbol(`q${i}`, `q${i + 1}`, 'a').addSymbol(`q${i}`, `q${i + 1}`, 'b');
    const outcome = convertToDfa(big, state, { complete: false });
    expect(outcome).toEqual({
      kind: 'failed',
      message: "La conversion produirait plus de 256 états : l'AFD serait trop grand pour être dessiné.",
    });
  });
});
