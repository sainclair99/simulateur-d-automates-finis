import type { ProjectFiles } from '../../application';
import type { AutomataApi } from '../../shared/projectIpc';

/** Boîtes de dialogue natives : le processus principal choisit et lit / écrit le fichier. */
export function createElectronProjectFiles(api: AutomataApi): ProjectFiles {
  return {
    save: (suggestedName, content) => api.saveProject(suggestedName, content),
    open: () => api.openProject(),
  };
}
