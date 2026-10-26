import type { ImageFiles } from '../../application';
import { createBrowserImageFiles } from './browserImageFiles';
import { createElectronImageFiles } from './electronImageFiles';

export function selectImageFiles(target: Window = window): ImageFiles {
  const api = target.automataApi;
  return api !== undefined && typeof api.exportImage === 'function'
    ? createElectronImageFiles(api)
    : createBrowserImageFiles();
}
