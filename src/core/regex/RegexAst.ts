export type RegexNode =
  | { readonly kind: 'epsilon' }
  | { readonly kind: 'symbol'; readonly symbol: string }
  | { readonly kind: 'concat'; readonly left: RegexNode; readonly right: RegexNode }
  | { readonly kind: 'union'; readonly left: RegexNode; readonly right: RegexNode }
  | { readonly kind: 'star'; readonly child: RegexNode };

export const epsilon = (): RegexNode => ({ kind: 'epsilon' });
export const symbol = (value: string): RegexNode => ({ kind: 'symbol', symbol: value });
export const concat = (left: RegexNode, right: RegexNode): RegexNode => ({ kind: 'concat', left, right });
export const union = (left: RegexNode, right: RegexNode): RegexNode => ({ kind: 'union', left, right });
export const star = (child: RegexNode): RegexNode => ({ kind: 'star', child });

/** Représentation entièrement parenthésée (concat/union), utile pour les tests et le débogage. */
export function regexToString(node: RegexNode): string {
  switch (node.kind) {
    case 'epsilon':
      return 'ε';
    case 'symbol':
      return node.symbol;
    case 'concat':
      return `(${regexToString(node.left)}${regexToString(node.right)})`;
    case 'union':
      return `(${regexToString(node.left)}|${regexToString(node.right)})`;
    case 'star':
      return `${regexToString(node.child)}*`;
  }
}
