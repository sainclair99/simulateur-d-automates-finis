import type { Alphabet } from '../model/Alphabet';
import type { RegexNode } from '../regex/RegexAst';
import { RegexNfa } from './RegexNfa';

export interface GenerateWordsOptions {
  /** Nombre de mots visés dans chaque liste (acceptés / rejetés). */
  readonly count?: number;
  /** Longueur maximale des mots examinés. */
  readonly maxLength?: number;
  /** Plafond du nombre de mots en attente d'examen (protège la mémoire avec un grand alphabet). */
  readonly maxQueued?: number;
}

export interface GeneratedWords {
  /** Plus courts mots du langage (ordre : longueur croissante, puis ordre de l'alphabet). '' = mot vide. */
  readonly accepted: readonly string[];
  /** Plus courts mots hors du langage, dans le même ordre. */
  readonly rejected: readonly string[];
  /** Vrai quand tout a été examiné sans être limité : les listes sont alors complètes (langage fini notamment). */
  readonly exhausted: boolean;
}

const DEFAULTS = { count: 8, maxLength: 12, maxQueued: 20_000 } as const;

/**
 * Énumère les mots par longueur croissante (parcours en largeur) en suivant l'AFN de la regex, et garde les premiers
 * mots acceptés et rejetés. Un mot « mort » (plus aucun état possible) est rejeté mais n'est pas prolongé : toutes
 * ses extensions seraient rejetées aussi et noieraient la liste sous des mots sans intérêt.
 */
export function generateWords(regex: RegexNode, alphabet: Alphabet, options: GenerateWordsOptions = {}): GeneratedWords {
  const { count, maxLength, maxQueued } = { ...DEFAULTS, ...options };
  const nfa = RegexNfa.fromRegex(regex);
  const symbols = alphabet.toArray();
  const accepted: string[] = [];
  const rejected: string[] = [];
  const queue: Array<{ readonly word: string; readonly states: readonly number[]; readonly length: number }> = [
    { word: '', states: nfa.initial(), length: 0 },
  ];
  let limited = false;

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) break;
    if (accepted.length >= count && rejected.length >= count) {
      limited = true;
      break;
    }
    if (nfa.isAccepting(current.states)) {
      if (accepted.length < count) accepted.push(current.word);
    } else if (rejected.length < count) {
      rejected.push(current.word);
    }
    if (current.states.length === 0) continue; // mot mort
    if (current.length >= maxLength || queue.length >= maxQueued) {
      limited = true;
      continue;
    }
    for (const symbol of symbols) {
      queue.push({ word: current.word + symbol, states: nfa.step(current.states, symbol), length: current.length + 1 });
    }
  }
  return { accepted, rejected, exhausted: !limited };
}
