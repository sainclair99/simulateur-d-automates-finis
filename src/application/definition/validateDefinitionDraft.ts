import {
  Alphabet,
  DomainError,
  InvalidAlphabetError,
  LanguageDefinition,
  parseRegex,
  RegexSyntaxError,
  validateStates,
} from '../../core';
import type { State } from '../../core';
import type { DefinitionDraft, StateDraft } from './DefinitionDraft';

export interface RegexIssue {
  readonly message: string;
  /** Index (en caractères) de l'erreur dans l'expression, si connu. */
  readonly position: number | null;
}

/** Erreurs par zone du formulaire, pour afficher chaque message au bon endroit. */
export interface DefinitionErrors {
  readonly alphabet: string | null;
  readonly regex: RegexIssue | null;
  /** Règles globales : état initial, états finaux… (affichées quand les noms sont valides). */
  readonly states: string | null;
  /** Erreurs par ligne d'état, indexées par `StateDraft.key`. */
  readonly stateNames: Readonly<Record<number, string>>;
}

export type DefinitionValidation =
  | { readonly ok: true; readonly definition: LanguageDefinition }
  | { readonly ok: false; readonly errors: DefinitionErrors };

/** Valide le brouillon ; les règles métier restent dans le core, ici on ne fait que les répartir par zone. */
export function validateDefinitionDraft(draft: DefinitionDraft): DefinitionValidation {
  const { alphabet, error: alphabetError } = checkAlphabet(draft.alphabet);
  const regexIssue = checkRegex(draft.regex, alphabet);
  const stateNames = checkStateNames(draft.states);
  const hasRowErrors = Object.keys(stateNames).length > 0;
  const states = toStates(draft.states);
  const statesError = hasRowErrors ? null : checkStates(states);

  if (alphabet !== null && regexIssue === null && !hasRowErrors && statesError === null) {
    return {
      ok: true,
      definition: LanguageDefinition.create({
        regex: draft.regex.trim(),
        alphabet: draft.alphabet,
        states,
      }),
    };
  }
  return { ok: false, errors: { alphabet: alphabetError, regex: regexIssue, states: statesError, stateNames } };
}

function checkAlphabet(symbols: readonly string[]): { alphabet: Alphabet | null; error: string | null } {
  try {
    return { alphabet: Alphabet.of(symbols), error: null };
  } catch (error) {
    if (error instanceof InvalidAlphabetError) return { alphabet: null, error: error.message };
    throw error;
  }
}

function checkRegex(source: string, alphabet: Alphabet | null): RegexIssue | null {
  if (source.trim() === '') {
    return { message: "Saisis l'expression régulière qui définit le langage", position: null };
  }
  if (alphabet === null) return null; // impossible à vérifier tant que l'alphabet est invalide
  try {
    parseRegex(source, alphabet);
    return null;
  } catch (error) {
    if (error instanceof RegexSyntaxError) return { message: error.message, position: error.position };
    throw error;
  }
}

function checkStateNames(states: readonly StateDraft[]): Record<number, string> {
  const errors: Record<number, string> = {};
  const counts = new Map<string, number>();
  for (const state of states) {
    const name = state.name.trim();
    if (name !== '') counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const state of states) {
    const name = state.name.trim();
    if (name === '') {
      errors[state.key] = 'Le nom ne peut pas être vide';
    } else if ((counts.get(name) ?? 0) > 1) {
      errors[state.key] = `Le nom « ${name} » est utilisé plusieurs fois`;
    }
  }
  return errors;
}

function checkStates(states: readonly State[]): string | null {
  try {
    validateStates(states);
    return null;
  } catch (error) {
    if (error instanceof DomainError) return error.message;
    throw error;
  }
}

function toStates(states: readonly StateDraft[]): State[] {
  return states.map((state) => ({ id: state.name.trim(), isInitial: state.isInitial, isFinal: state.isFinal }));
}
