import { RegexNfa } from '../../core';
import type { LanguageDefinition } from '../../core';
import type { SimulationPlayback } from '../SimulationPlayback';

export interface AgreementView {
  readonly agrees: boolean;
  readonly text: string;
}

/**
 * Confronte le verdict de l'automate à celui de la regex pour le mot simulé.
 * null tant que la lecture n'est pas terminée (même règle que le verdict : rien n'est révélé avant la fin).
 */
export function describeAgreement(definition: LanguageDefinition, playback: SimulationPlayback): AgreementView | null {
  if (!playback.isAtEnd) return null;
  const regexAccepts = RegexNfa.fromRegex(definition.regex).accepts(playback.result.word);
  const automatonAccepts = playback.result.verdict === 'accepted';

  if (regexAccepts === automatonAccepts) {
    return {
      agrees: true,
      text: regexAccepts
        ? 'La regex confirme : ce mot appartient au langage.'
        : "La regex confirme : ce mot n'appartient pas au langage.",
    };
  }
  return {
    agrees: false,
    text: regexAccepts
      ? "La regex n'est pas d'accord : ce mot appartient au langage, mais l'automate le rejette."
      : "La regex n'est pas d'accord : ce mot n'appartient pas au langage, mais l'automate l'accepte.",
  };
}
