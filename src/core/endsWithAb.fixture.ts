import { LanguageDefinition } from './definition/LanguageDefinition';
import type { Automaton } from './model/Automaton';

/** Langage « mots sur {a,b} se terminant par ab » : AFD complet à 3 états. */
export function endsWithAbDefinition(): LanguageDefinition {
  return LanguageDefinition.create({
    regex: '(a|b)*ab',
    alphabet: ['a', 'b'],
    states: [
      { id: 'q0', isInitial: true, isFinal: false },
      { id: 'q1', isInitial: false, isFinal: false },
      { id: 'q2', isInitial: false, isFinal: true },
    ],
  });
}

const TRANSITIONS: ReadonlyArray<readonly [string, string, string]> = [
  ['q0', 'q1', 'a'],
  ['q0', 'q0', 'b'],
  ['q1', 'q1', 'a'],
  ['q1', 'q2', 'b'],
  ['q2', 'q1', 'a'],
  ['q2', 'q0', 'b'],
];

function withTransitions(
  automaton: Automaton,
  transitions: ReadonlyArray<readonly [string, string, string]>,
): Automaton {
  return transitions.reduce(
    (current, [from, to, symbol]) => current.withTransition({ from, to, symbol }),
    automaton,
  );
}

export function buildEndsWithAbAutomaton(): Automaton {
  return withTransitions(endsWithAbDefinition().createAutomaton(), TRANSITIONS);
}

/** Même langage, version non déterministe : q0 boucle sur a et b, devine le début de « ab ». */
export function buildNfaEndsWithAbAutomaton(): Automaton {
  return withTransitions(endsWithAbDefinition().createAutomaton(), [
    ['q0', 'q0', 'a'],
    ['q0', 'q0', 'b'],
    ['q0', 'q1', 'a'],
    ['q1', 'q2', 'b'],
  ]);
}
