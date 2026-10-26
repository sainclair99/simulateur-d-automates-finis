import type { ProjectFiles } from '../../application';
import { createBrowserProjectFiles } from './browserProjectFiles';
import { createElectronProjectFiles } from './electronProjectFiles';

/** Dans Electron, `window.automataApi` existe (preload) : dialogues natifs ; sinon, repli navigateur. */
export function selectProjectFiles(target: Window = window): ProjectFiles {
  const api = target.automataApi;
  return api !== undefined && typeof api.saveProject === 'function' && typeof api.openProject === 'function'
    ? createElectronProjectFiles(api)
    : createBrowserProjectFiles();
}
