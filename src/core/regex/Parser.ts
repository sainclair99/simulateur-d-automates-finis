import type { Alphabet } from '../model/Alphabet';
import { RegexSyntaxError } from './errors';
import { concat, epsilon, star, symbol, union } from './RegexAst';
import type { RegexNode } from './RegexAst';
import { tokenize } from './Tokenizer';
import type { Token, TokenType } from './Tokenizer';

/**
 * Grammaire (priorité croissante) :
 *   union   := concat ('|' concat)*
 *   concat  := postfix postfix*
 *   postfix := atom ('*' | '+' | '?')*
 *   atom    := symbole | 'ε' | '(' union ')'
 * Sucre syntaxique : x+ ≡ x x*   et   x? ≡ x | ε
 */
export function parseRegex(source: string, alphabet: Alphabet): RegexNode {
  return new RegexParser(tokenize(source), alphabet).parse();
}

const ATOM_START: ReadonlySet<TokenType> = new Set<TokenType>(['symbol', 'epsilon', 'lparen']);

class RegexParser {
  private index = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly alphabet: Alphabet,
  ) {}

  parse(): RegexNode {
    const node = this.parseUnion();
    const trailing = this.peek();
    if (trailing.type !== 'end') {
      throw new RegexSyntaxError(`Symbole inattendu « ${trailing.value} »`, trailing.position);
    }
    return node;
  }

  private parseUnion(): RegexNode {
    let left = this.parseConcat();
    while (this.peek().type === 'union') {
      this.next();
      left = union(left, this.parseConcat());
    }
    return left;
  }

  private parseConcat(): RegexNode {
    let left = this.parsePostfix();
    while (ATOM_START.has(this.peek().type)) {
      left = concat(left, this.parsePostfix());
    }
    return left;
  }

  private parsePostfix(): RegexNode {
    let node = this.parseAtom();
    for (;;) {
      const type = this.peek().type;
      if (type === 'star') {
        this.next();
        node = star(node);
      } else if (type === 'plus') {
        this.next();
        node = concat(node, star(node));
      } else if (type === 'optional') {
        this.next();
        node = union(node, epsilon());
      } else {
        return node;
      }
    }
  }

  private parseAtom(): RegexNode {
    const token = this.next();
    switch (token.type) {
      case 'symbol':
        if (!this.alphabet.has(token.value)) {
          throw new RegexSyntaxError(
            `Le symbole « ${token.value} » n'appartient pas à l'alphabet`,
            token.position,
          );
        }
        return symbol(token.value);
      case 'epsilon':
        return epsilon();
      case 'lparen': {
        const inner = this.parseUnion();
        const closing = this.next();
        if (closing.type !== 'rparen') {
          throw new RegexSyntaxError('Parenthèse fermante manquante', closing.position);
        }
        return inner;
      }
      case 'end':
        throw new RegexSyntaxError("Fin d'expression inattendue : un symbole est attendu", token.position);
      default:
        throw new RegexSyntaxError(`Symbole inattendu « ${token.value} »`, token.position);
    }
  }

  private peek(): Token {
    const token = this.tokens[Math.min(this.index, this.tokens.length - 1)];
    if (!token) throw new Error('Le tokenizer doit toujours produire un jeton de fin');
    return token;
  }

  private next(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }
}
