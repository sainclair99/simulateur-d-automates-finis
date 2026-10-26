/** Ce que l'utilisateur est en train de faire glisser depuis la palette. */
export type DragPayload =
  | { readonly kind: 'symbol'; readonly symbol: string }
  | { readonly kind: 'state'; readonly id: string };
