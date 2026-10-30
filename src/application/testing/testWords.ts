import { generateWords, simulate } from '../../core';
import type { Automaton, GenerateWordsOptions, LanguageDefinition } from '../../core';
import { wordSubject } from '../verification/wording';

/** Mots de test tirés de la regex : les plus courts acceptés et rejetés ('' = mot vide). */
export interface TestWordSet {
  readonly accepted: readonly string[];
  readonly rejected: readonly string[];
  /** Vrai si tous les mots intéressants ont été énumérés (langage fini). */
  readonly exhausted: boolean;
}

export function generateTestWords(definition: LanguageDefinition, options?: GenerateWordsOptions): TestWordSet {
  return generateWords(definition.regex, definition.alphabet, options);
}

export interface TestResult {
  readonly word: string;
  /** Verdict de la regex. */
  readonly expected: boolean;
  /** Verdict de l'automate. */
  readonly actual: boolean;
}

export interface TestFailure extends TestResult {
  readonly description: string;
}

export interface TestReport {
  readonly total: number;
  readonly results: readonly TestResult[];
  readonly failures: readonly TestFailure[];
  readonly summary: string;
}

const accepts = (automaton: Automaton, word: string): boolean => simulate(automaton, word).verdict === 'accepted';

/** Fait lire chaque mot de test à l'automate et le confronte au verdict de la regex. */
export function runTestWords(automaton: Automaton, words: TestWordSet): TestReport {
  const results: TestResult[] = [
    ...words.accepted.map((word) => ({ word, expected: true, actual: accepts(automaton, word) })),
    ...words.rejected.map((word) => ({ word, expected: false, actual: accepts(automaton, word) })),
  ];
  const failures: TestFailure[] = results
    .filter((result) => result.expected !== result.actual)
    .map((result) => ({
      ...result,
      description: result.expected
        ? `${wordSubject(result.word)} appartient au langage de la regex, mais l'automate le rejette.`
        : `${wordSubject(result.word)} est accepté par l'automate, mais n'appartient pas au langage de la regex.`,
    }));

  const total = results.length;
  const summary =
    total === 0
      ? 'Aucun mot de test à vérifier.'
      : failures.length === 0
        ? `Les ${total} mots de test donnent le même verdict avec l'automate et avec la regex.`
        : `${failures.length} écart${failures.length > 1 ? 's' : ''} sur ${total} mots de test.`;
  return { total, results, failures, summary };
}
