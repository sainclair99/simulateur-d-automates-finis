import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton } from '../endsWithAb.fixture';
import { Alphabet } from '../model/Alphabet';
import { Automaton } from '../model/Automaton';
import type { State } from '../model/State';
import type { Transition } from '../model/Transition';
import { simulate } from '../simulation/simulate';
import { allWords } from '../words.fixture';
import { determinize } from './determinize';

function converted(automaton: Automaton, options = {}) {
  const result = determinize(automaton, options);
  if (result.kind !== 'converted') throw new Error(`Conversion attendue, reçu « ${result.kind} »`);
  return result;
}

const verdict = (automaton: Automaton, word: string): boolean => simulate(automaton, word).verdict === 'accepted';

describe('determinize : cas de référence', () => {
  it('convertit l’AFN « se termine par ab » en l’AFD classique à trois états', () => {
    const { automaton, subsets, sinkState } = converted(buildNfaEndsWithAbAutomaton());
    expect(automaton.states).toEqual([
      { id: '{q0}', isInitial: true, isFinal: false },
      { id: '{q0,q1}', isInitial: false, isFinal: false },
      { id: '{q0,q2}', isInitial: false, isFinal: true },
    ]);
    expect(automaton.transitions.map((t) => `${t.from} -${t.symbol}-> ${t.to}`)).toEqual([
      '{q0} -a-> {q0,q1}',
      '{q0} -b-> {q0}',
      '{q0,q1} -a-> {q0,q1}',
      '{q0,q1} -b-> {q0,q2}',
      '{q0,q2} -a-> {q0,q1}',
      '{q0,q2} -b-> {q0}',
    ]);
    expect(automaton.isDeterministic()).toBe(true);
    expect(subsets.get('{q0,q2}')).toEqual(['q0', 'q2']);
    expect(sinkState).toBe(null);
  });

  it('renomme simplement un automate déjà déterministe', () => {
    const { automaton } = converted(buildEndsWithAbAutomaton());
    expect(automaton.states.map((s) => s.id)).toEqual(['{q0}', '{q1}', '{q2}']);
    expect(automaton.transitions).toHaveLength(6);
    for (const word of allWords(7)) expect(verdict(automaton, word)).toBe(verdict(buildEndsWithAbAutomaton(), word));
  });

  it('n’ajoute pas d’état puits par défaut, et le fait si on le demande', () => {
    // q0 -a-> q1 (final) ; rien d'autre : la plupart des transitions manquent.
    const alphabet = Alphabet.of(['a', 'b']);
    const partial = Automaton.create(
      alphabet,
      [
        { id: 'q0', isInitial: true, isFinal: false },
        { id: 'q1', isInitial: false, isFinal: true },
      ],
      [{ from: 'q0', to: 'q1', symbol: 'a' }],
    );
    const plain = converted(partial);
    expect(plain.automaton.states.map((s) => s.id)).toEqual(['{q0}', '{q1}']);
    expect(plain.sinkState).toBe(null);

    const full = converted(partial, { complete: true });
    expect(full.sinkState).toBe('∅');
    expect(full.automaton.states.map((s) => s.id)).toEqual(['{q0}', '{q1}', '∅']);
    expect(full.automaton.states.find((s) => s.id === '∅')).toEqual({ id: '∅', isInitial: false, isFinal: false });
    // complet : chaque état a une transition pour chaque symbole, et le puits boucle sur lui-même
    for (const state of full.automaton.states) {
      for (const symbol of ['a', 'b']) expect(full.automaton.next(state.id, symbol)).toHaveLength(1);
    }
    expect(full.automaton.next('∅', 'a')).toEqual(['∅']);
    expect(full.subsets.get('∅')).toEqual([]);
  });
});

describe('determinize : cas limites', () => {
  /** Langage « le n-ième symbole avant la fin est un a » : l'AFD minimal a 2^n états. */
  function nthFromEnd(n: number): Automaton {
    const alphabet = Alphabet.of(['a', 'b']);
    const states: State[] = Array.from({ length: n + 1 }, (_, i) => ({ id: `q${i}`, isInitial: i === 0, isFinal: i === n }));
    const transitions: Transition[] = [
      { from: 'q0', to: 'q0', symbol: 'a' },
      { from: 'q0', to: 'q0', symbol: 'b' },
      { from: 'q0', to: 'q1', symbol: 'a' },
    ];
    for (let i = 1; i < n; i += 1) {
      transitions.push({ from: `q${i}`, to: `q${i + 1}`, symbol: 'a' }, { from: `q${i}`, to: `q${i + 1}`, symbol: 'b' });
    }
    return Automaton.create(alphabet, states, transitions);
  }

  it('produit bien 2^n états dans le pire cas connu', () => {
    expect(converted(nthFromEnd(4)).automaton.states).toHaveLength(16);
  });

  it('abandonne quand l’AFD dépasse la limite', () => {
    expect(determinize(nthFromEnd(10))).toEqual({ kind: 'too-large', limit: 256 });
    expect(determinize(nthFromEnd(4), { limit: 8 })).toEqual({ kind: 'too-large', limit: 8 });
    expect(determinize(nthFromEnd(4), { limit: 16 }).kind).toBe('converted');
  });

  it('refuse proprement quand aucun état final n’est accessible', () => {
    const unreachableFinal = Automaton.create(
      Alphabet.of(['a']),
      [
        { id: 'q0', isInitial: true, isFinal: false },
        { id: 'q1', isInitial: false, isFinal: true },
      ],
      [{ from: 'q0', to: 'q0', symbol: 'a' }],
    );
    expect(determinize(unreachableFinal)).toEqual({ kind: 'no-final-state' });
  });

  it('garde des noms uniques quand des noms d’états libres donnent le même texte', () => {
    const automaton = Automaton.create(
      Alphabet.of(['x', 'y']),
      [
        { id: 'i', isInitial: true, isFinal: false },
        { id: 'a', isInitial: false, isFinal: false },
        { id: 'b', isInitial: false, isFinal: false },
        { id: 'a,b', isInitial: false, isFinal: true },
      ],
      [
        { from: 'i', to: 'a', symbol: 'x' },
        { from: 'i', to: 'b', symbol: 'x' },
        { from: 'i', to: 'a,b', symbol: 'y' },
      ],
    );
    const { automaton: dfa, subsets } = converted(automaton);
    const names = dfa.states.map((s) => s.id);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(['{i}', '{a,b}', "{a,b}'"]);
    expect(subsets.get('{a,b}')).toEqual(['a', 'b']);
    expect(subsets.get("{a,b}'")).toEqual(['a,b']);
  });
});

describe('determinize : l’AFD reconnaît exactement le même langage (automates aléatoires)', () => {
  /** Générateur pseudo-aléatoire reproductible (mulberry32). */
  function random(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomNfa(rand: () => number): Automaton {
    const count = 2 + Math.floor(rand() * 4); // 2 à 5 états
    const ids = Array.from({ length: count }, (_, i) => `s${i}`);
    const finalIndex = Math.floor(rand() * count);
    const states: State[] = ids.map((id, i) => ({ id, isInitial: i === 0, isFinal: i === finalIndex || rand() < 0.3 }));
    const transitions: Transition[] = [];
    for (const from of ids) {
      for (const to of ids) {
        for (const symbol of ['a', 'b']) {
          if (rand() < 0.3) transitions.push({ from, to, symbol });
        }
      }
    }
    return Automaton.create(Alphabet.of(['a', 'b']), states, transitions);
  }

  it('sur 300 AFN aléatoires, avec et sans état puits', () => {
    const rand = random(20261026);
    const words = allWords(7);
    let nondeterministic = 0;
    let converted_ = 0;
    for (let round = 0; round < 300; round += 1) {
      const nfa = randomNfa(rand);
      if (!nfa.isDeterministic()) nondeterministic += 1;
      for (const complete of [false, true]) {
        const result = determinize(nfa, { complete });
        if (result.kind === 'no-final-state') {
          // aucun mot de longueur ≤ 7 ne doit alors être accepté par l'AFN
          expect(words.some((word) => verdict(nfa, word))).toBe(false);
          continue;
        }
        if (result.kind !== 'converted') throw new Error('Conversion attendue');
        converted_ += 1;
        const dfa = result.automaton;
        expect(dfa.isDeterministic()).toBe(true);
        if (complete) {
          for (const state of dfa.states) for (const symbol of ['a', 'b']) expect(dfa.next(state.id, symbol)).toHaveLength(1);
        }
        for (const word of words) {
          if (verdict(dfa, word) !== verdict(nfa, word)) {
            throw new Error(`Langages différents sur « ${word} » (automate n°${round}, complete=${complete})`);
          }
        }
      }
    }
    expect(nondeterministic).toBeGreaterThan(100); // le test porte bien sur de vrais AFN
    expect(converted_).toBeGreaterThan(300);
  });
});
