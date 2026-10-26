import { contextBridge, ipcRenderer } from 'electron';
import type { AutomataApi } from '../shared/projectIpc';

// ATTENTION : un preload « sandboxé » ne peut pas faire de require() relatif : les noms de canaux sont donc
// recopiés ici (import de type seulement, effacé à la compilation). Un test vérifie qu'ils restent identiques
// à ceux de src/shared/projectIpc.ts.
const SAVE_CHANNEL = 'project:save';
const OPEN_CHANNEL = 'project:open';
const EXPORT_IMAGE_CHANNEL = 'project:export-image';

const api: AutomataApi = {
  platform: process.platform,
  saveProject: (suggestedName, content) => ipcRenderer.invoke(SAVE_CHANNEL, suggestedName, content),
  openProject: () => ipcRenderer.invoke(OPEN_CHANNEL),
  exportImage: (suggestedName, format, data) => ipcRenderer.invoke(EXPORT_IMAGE_CHANNEL, suggestedName, format, data),
};

contextBridge.exposeInMainWorld('automataApi', api);
