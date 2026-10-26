/** Contrat entre le renderer (via le preload) et le processus principal pour les fichiers de projet. */

export const PROJECT_CHANNELS = {
  save: 'project:save',
  open: 'project:open',
  exportImage: 'project:export-image',
} as const;

export type IpcImageFormat = 'svg' | 'png';

export type IpcSaveResult =
  | { readonly kind: 'saved'; readonly location: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

export type IpcOpenResult =
  | { readonly kind: 'opened'; readonly name: string; readonly content: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

/** API exposée au renderer sous `window.automataApi`. */
export interface AutomataApi {
  readonly platform: string;
  readonly saveProject: (suggestedName: string, content: string) => Promise<IpcSaveResult>;
  readonly openProject: () => Promise<IpcOpenResult>;
  readonly exportImage: (suggestedName: string, format: IpcImageFormat, data: Uint8Array) => Promise<IpcSaveResult>;
}
