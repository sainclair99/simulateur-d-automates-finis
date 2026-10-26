import { compareWithRegex } from '../../core';
import type { Automaton, LanguageDefinition } from '../../core';
import type { ConstructionState } from '../construction/ConstructionState';

export type VerificationStatus = 'equivalent' | 'different' | 'inconclusive';

export interface VerificationView {
  readonly status: VerificationStatus;
  readonly title: string;
  readonly detail: string;
  /** Plus court mot sur lequel l'automate et la regex ne sont pas d'accord ('' = mot vide) ; null sinon. */
  readonly counterexample: string | null;
}

/** Résultat de la comparaison « automate construit » ↔ « langage de la regex », lié à l'automate vérifié. */
export class Verification {
  private constructor(
    readonly view: VerificationView,
    private readonly automaton: Automaton,
  ) {}

  static run(definition: LanguageDefinition, construction: ConstructionState, limit?: number): Verification {
    const comparison = compareWithRegex(construction.automaton, definition.regex, limit);
    return new Verification(toView(definition, comparison), construction.automaton);
  }

  /** Vrai tant que l'automate n'a pas été modifié (déplacer un état ne compte pas) : le résultat reste valable. */
  appliesTo(construction: ConstructionState): boolean {
    return construction.automaton === this.automaton;
  }
}

function toView(definition: LanguageDefinition, comparison: ReturnType<typeof compareWithRegex>): VerificationView {
  switch (comparison.kind) {
    case 'equivalent':
      return {
        status: 'equivalent',
        title: 'Automate conforme',
        detail: `L'automate reconnaît exactement le langage de l'expression régulière ${definition.regexSource}.`,
        counterexample: null,
      };
    case 'different': {
      const subject = comparison.word === '' ? 'Le mot vide (ε)' : `Le mot « ${comparison.word} »`;
      return {
        status: 'different',
        title: 'Automate non conforme',
        detail: comparison.regexAccepts
          ? `${subject} appartient au langage de la regex, mais l'automate le rejette.`
          : `${subject} est accepté par l'automate, mais n'appartient pas au langage de la regex.`,
        counterexample: comparison.word,
      };
    }
    case 'inconclusive':
      return {
        status: 'inconclusive',
        title: 'Vérification impossible',
        detail: "L'automate est trop complexe pour être comparé automatiquement à la regex.",
        counterexample: null,
      };
  }
}
