import type { LanguageDefinition } from '../../core';

/** Deux définitions identiques (regex, alphabet dans le même ordre, états et rôles) : le travail de construction reste valable. */
export function sameDefinition(a: LanguageDefinition, b: LanguageDefinition): boolean {
  const symbolsA = a.alphabet.toArray();
  const symbolsB = b.alphabet.toArray();
  return (
    a.regexSource === b.regexSource &&
    symbolsA.length === symbolsB.length &&
    symbolsA.every((symbol, index) => symbol === symbolsB[index]) &&
    a.states.length === b.states.length &&
    a.states.every((state, index) => {
      const other = b.states[index];
      return (
        other !== undefined &&
        other.id === state.id &&
        other.isInitial === state.isInitial &&
        other.isFinal === state.isFinal
      );
    })
  );
}
