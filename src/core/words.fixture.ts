/** Tous les mots jusqu'à `maxLength`, par longueur croissante puis dans l'ordre des symboles. */
export function allWords(maxLength: number, symbols: readonly string[] = ['a', 'b']): string[] {
  let level = [''];
  const all = [''];
  for (let length = 1; length <= maxLength; length += 1) {
    level = level.flatMap((word) => symbols.map((symbol) => `${word}${symbol}`));
    all.push(...level);
  }
  return all;
}
