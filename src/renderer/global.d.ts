import type { AutomataApi } from '../shared/projectIpc';

declare global {
  interface Window {
    /** Présent uniquement dans Electron (exposé par le preload) ; absent dans un navigateur ordinaire. */
    readonly automataApi?: AutomataApi;
  }
}

export {};
