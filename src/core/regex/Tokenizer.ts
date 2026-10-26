export type TokenType =
  | 'symbol'
  | 'epsilon'
  | 'union'
  | 'star'
  | 'plus'
  | 'optional'
  | 'lparen'
  | 'rparen'
  | 'end';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
}

const OPERATORS: Readonly<Record<string, TokenType>> = {
  '|': 'union',
  '*': 'star',
  '+': 'plus',
  '?': 'optional',
  '(': 'lparen',
  ')': 'rparen',
  'ε': 'epsilon',
};

/** Découpe l'expression en jetons. Les espaces sont ignorés. Termine toujours par un jeton 'end'. */
export function tokenize(source: string): Token[] {
  const chars = Array.from(source);
  const tokens: Token[] = [];
  chars.forEach((char, position) => {
    if (/\s/u.test(char)) return;
    tokens.push({ type: OPERATORS[char] ?? 'symbol', value: char, position });
  });
  tokens.push({ type: 'end', value: '', position: chars.length });
  return tokens;
}
