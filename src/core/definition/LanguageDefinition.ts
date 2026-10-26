import { Alphabet } from '../model/Alphabet';
import { Automaton } from '../model/Automaton';
import { validateStates } from '../model/State';
import type { State } from '../model/State';
import { parseRegex } from '../regex/Parser';
import type { RegexNode } from '../regex/RegexAst';

export interface LanguageDefinitionInput {
  readonly regex: string;
  readonly alphabet: readonly string[];
  readonly states: readonly State[];
}

/**
 * Résultat de l'étape « Définition » : langage (regex), alphabet et états.
 * Toujours valide une fois créé (alphabet → regex → états, dans l'ordre du formulaire).
 */
export class LanguageDefinition {
  private constructor(
    readonly regexSource: string,
    readonly regex: RegexNode,
    readonly alphabet: Alphabet,
    readonly states: readonly State[],
  ) {}

  static create(input: LanguageDefinitionInput): LanguageDefinition {
    const alphabet = Alphabet.of(input.alphabet);
    const regex = parseRegex(input.regex, alphabet);
    validateStates(input.states);
    return new LanguageDefinition(
      input.regex,
      regex,
      alphabet,
      input.states.map((state) => ({ ...state })),
    );
  }

  /** Point de départ de l'étape « Construction » : les états, sans aucune transition. */
  createAutomaton(): Automaton {
    return Automaton.create(this.alphabet, this.states);
  }
}
