import { determinize, LanguageDefinition } from '../../core';
import { ConstructionState } from '../construction/ConstructionState';

export interface ConversionOptions {
  /** Ajoute un état puits « ∅ » pour obtenir un AFD complet. */
  readonly complete: boolean;
}

export type ConversionOutcome =
  | {
      readonly kind: 'converted';
      /** Même langage (regex, alphabet), mais avec les états de l'AFD. */
      readonly definition: LanguageDefinition;
      /** L'AFD, avec ses transitions et une disposition automatique. */
      readonly construction: ConstructionState;
      readonly message: string;
    }
  | { readonly kind: 'failed'; readonly message: string };

/**
 * Transforme un AFN en AFD équivalent (construction par sous-ensembles). Le résultat est un NOUVEAU projet
 * (nouveaux états) : l'appelant décide de le substituer à l'ancien, et peut conserver l'ancien pour y revenir.
 */
export function convertToDfa(
  definition: LanguageDefinition,
  construction: ConstructionState,
  options: ConversionOptions,
): ConversionOutcome {
  const source = construction.automaton;
  if (source.isDeterministic()) {
    return { kind: 'failed', message: "L'automate est déjà déterministe : il n'y a rien à convertir." };
  }

  const result = determinize(source, { complete: options.complete });
  if (result.kind === 'too-large') {
    return {
      kind: 'failed',
      message: `La conversion produirait plus de ${result.limit} états : l'AFD serait trop grand pour être dessiné.`,
    };
  }
  if (result.kind === 'no-final-state') {
    return {
      kind: 'failed',
      message: "Aucun état final n'est accessible : l'automate n'accepte aucun mot, il n'y a pas d'AFD utile à produire.",
    };
  }

  const dfa = result.automaton;
  const converted = LanguageDefinition.create({
    regex: definition.regexSource,
    alphabet: [...definition.alphabet.toArray()],
    states: dfa.states,
  });
  const built = dfa.transitions
    .reduce((state, transition) => state.addSymbol(transition.from, transition.to, transition.symbol), ConstructionState.start(converted))
    .autoLayout();

  const sink = result.sinkState === null ? '.' : `, et ${result.sinkState} est l'état puits ajouté pour compléter l'AFD.`;
  return {
    kind: 'converted',
    definition: converted,
    construction: built,
    message:
      `AFN converti en AFD : ${dfa.states.length} état${dfa.states.length > 1 ? 's' : ''} ` +
      `(contre ${source.states.length} pour l'AFN). Chaque état de l'AFD est un ensemble d'états de l'AFN${sink}`,
  };
}
