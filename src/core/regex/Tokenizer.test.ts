import { describe, expect, it } from 'vitest';
import { tokenize } from './Tokenizer';

describe('tokenize', () => {
  it('reconnaît symboles et opérateurs', () => {
    const types = tokenize('(a|b)*ε').map((t) => t.type);
    expect(types).toEqual(['lparen', 'symbol', 'union', 'symbol', 'rparen', 'star', 'epsilon', 'end']);
  });

  it('ignore les espaces et conserve les positions', () => {
    const tokens = tokenize('a | b');
    expect(tokens.map((t) => t.value)).toEqual(['a', '|', 'b', '']);
    expect(tokens.map((t) => t.position)).toEqual([0, 2, 4, 5]);
  });

  it('produit uniquement un jeton de fin pour une source vide', () => {
    expect(tokenize('')).toEqual([{ type: 'end', value: '', position: 0 }]);
  });
});
