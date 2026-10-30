/** « Le mot « ab » » ou « Le mot vide (ε) » : sujet de phrase pour parler d'un mot. */
export function wordSubject(word: string): string {
  return word === '' ? 'Le mot vide (ε)' : `Le mot « ${word} »`;
}
