import type { LanguageDefinition } from '../../core';

export interface StateDraft {
  /** Identifiant technique stable (le nom peut changer pendant la saisie). */
  readonly key: number;
  readonly name: string;
  readonly isInitial: boolean;
  readonly isFinal: boolean;
}

const SEPARATORS = /[\s,;]/u;

/**
 * Brouillon IMMUABLE du formulaire « Définition » : tolère les saisies incomplètes ou invalides.
 * La validation (et la création du LanguageDefinition) est faite par `validateDefinitionDraft`.
 */
export class DefinitionDraft {
  private constructor(
    readonly regex: string,
    readonly alphabet: readonly string[],
    readonly states: readonly StateDraft[],
    private readonly nextKey: number,
  ) {}

  /** Départ proposé : q0 (initial) et q1 (final). */
  static empty(): DefinitionDraft {
    return new DefinitionDraft(
      '',
      [],
      [
        { key: 0, name: 'q0', isInitial: true, isFinal: false },
        { key: 1, name: 'q1', isInitial: false, isFinal: true },
      ],
      2,
    );
  }

  /** Remplit le formulaire avec une définition existante (ex. fichier ouvert). */
  static fromDefinition(definition: LanguageDefinition): DefinitionDraft {
    return new DefinitionDraft(
      definition.regexSource,
      [...definition.alphabet.toArray()],
      definition.states.map((state, key) => ({ key, name: state.id, isInitial: state.isInitial, isFinal: state.isFinal })),
      definition.states.length,
    );
  }

  withRegex(regex: string): DefinitionDraft {
    return new DefinitionDraft(regex, this.alphabet, this.states, this.nextKey);
  }

  /** Chaque caractère du texte devient un symbole ; espaces, virgules et doublons sont ignorés. */
  withSymbolsAdded(text: string): DefinitionDraft {
    const alphabet = [...this.alphabet];
    for (const char of Array.from(text)) {
      if (!SEPARATORS.test(char) && !alphabet.includes(char)) alphabet.push(char);
    }
    return new DefinitionDraft(this.regex, alphabet, this.states, this.nextKey);
  }

  withoutSymbol(symbol: string): DefinitionDraft {
    return new DefinitionDraft(
      this.regex,
      this.alphabet.filter((existing) => existing !== symbol),
      this.states,
      this.nextKey,
    );
  }

  /** Ajoute un état intermédiaire nommé q<n> (premier nom libre). */
  withStateAdded(): DefinitionDraft {
    const used = new Set(this.states.map((state) => state.name.trim()));
    let index = 0;
    while (used.has(`q${index}`)) index += 1;
    const state: StateDraft = { key: this.nextKey, name: `q${index}`, isInitial: false, isFinal: false };
    return new DefinitionDraft(this.regex, this.alphabet, [...this.states, state], this.nextKey + 1);
  }

  withoutState(key: number): DefinitionDraft {
    return this.withStates(this.states.filter((state) => state.key !== key));
  }

  withStateRenamed(key: number, name: string): DefinitionDraft {
    return this.withStates(this.states.map((state) => (state.key === key ? { ...state, name } : state)));
  }

  /** Un seul état initial : choisir celui-ci retire le statut aux autres. */
  withInitialState(key: number): DefinitionDraft {
    return this.withStates(this.states.map((state) => ({ ...state, isInitial: state.key === key })));
  }

  withFinalToggled(key: number): DefinitionDraft {
    return this.withStates(
      this.states.map((state) => (state.key === key ? { ...state, isFinal: !state.isFinal } : state)),
    );
  }

  private withStates(states: readonly StateDraft[]): DefinitionDraft {
    return new DefinitionDraft(this.regex, this.alphabet, states, this.nextKey);
  }
}
