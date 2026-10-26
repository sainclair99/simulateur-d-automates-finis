export class InvalidAlphabetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAlphabetError';
  }
}

/** Caractères ayant un sens dans la syntaxe des expressions régulières. */
export const RESERVED_SYMBOLS: ReadonlySet<string> = new Set(['|', '*', '+', '?', '(', ')', 'ε']);

export class Alphabet {
  private constructor(private readonly symbols: readonly string[]) {}

  static of(symbols: readonly string[]): Alphabet {
    if (symbols.length === 0) {
      throw new InvalidAlphabetError("L'alphabet doit contenir au moins un symbole");
    }
    const seen = new Set<string>();
    for (const symbol of symbols) {
      if (Array.from(symbol).length !== 1) {
        throw new InvalidAlphabetError(`« ${symbol} » : un symbole doit être un caractère unique`);
      }
      if (/\s/u.test(symbol)) {
        throw new InvalidAlphabetError('Un symbole ne peut pas être un espace');
      }
      if (RESERVED_SYMBOLS.has(symbol)) {
        throw new InvalidAlphabetError(`« ${symbol} » est réservé à la syntaxe des expressions régulières`);
      }
      if (seen.has(symbol)) {
        throw new InvalidAlphabetError(`Le symbole « ${symbol} » est en double`);
      }
      seen.add(symbol);
    }
    return new Alphabet([...symbols]);
  }

  has(symbol: string): boolean {
    return this.symbols.includes(symbol);
  }

  toArray(): readonly string[] {
    return this.symbols;
  }
}
