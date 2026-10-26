import type { ImageFiles } from '../../application';
import type { AutomataApi } from '../../shared/projectIpc';

/** Boîte de dialogue native : le processus principal vérifie l'image et l'écrit à l'endroit choisi. */
export function createElectronImageFiles(api: AutomataApi): ImageFiles {
  return { save: (suggestedName, format, data) => api.exportImage(suggestedName, format, data) };
}
