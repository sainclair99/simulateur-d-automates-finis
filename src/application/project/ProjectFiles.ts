/**
 * Port : comment l'application obtient un emplacement de fichier et en lit / écrit le contenu.
 * Implémenté dans le renderer (dialogues natifs d'Electron via le preload, ou téléchargement dans un navigateur).
 */
export type SaveResult =
  | { readonly kind: 'saved'; readonly location: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

export type OpenResult =
  | { readonly kind: 'opened'; readonly name: string; readonly content: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

export interface ProjectFiles {
  save(suggestedName: string, content: string): Promise<SaveResult>;
  open(): Promise<OpenResult>;
}
