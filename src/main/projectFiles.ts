import path from 'node:path';
import type { IpcOpenResult, IpcSaveResult } from '../shared/projectIpc';

/** Taille maximale d'un fichier de projet (protège la lecture comme l'écriture). */
export const MAX_PROJECT_BYTES = 5 * 1024 * 1024;
/** Taille maximale d'une image exportée. */
export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
export const DEFAULT_PROJECT_FILE_NAME = 'mon-automate.automate.json';
const PROJECT_EXTENSION = '.automate.json';

interface FileFilter {
  name: string;
  extensions: string[];
}

/** Sous-ensemble des boîtes de dialogue d'Electron utilisé ici (compatible avec `dialog`). */
export interface FileDialogs {
  showSaveDialog(options: {
    title: string;
    defaultPath: string;
    filters: FileFilter[];
  }): Promise<{ canceled: boolean; filePath?: string }>;
  showOpenDialog(options: {
    title: string;
    properties: 'openFile'[];
    filters: FileFilter[];
  }): Promise<{ canceled: boolean; filePaths: string[] }>;
}

/** Sous-ensemble de `node:fs/promises` utilisé ici. */
export interface FileSystem {
  writeFile(file: string, data: string, encoding: 'utf-8'): Promise<void>;
  writeBinary(file: string, data: Uint8Array): Promise<void>;
  readFile(file: string, encoding: 'utf-8'): Promise<string>;
  stat(file: string): Promise<{ size: number }>;
}

const PROJECT_FILTERS: FileFilter[] = [
  { name: 'Automate (*.json)', extensions: ['json'] },
  { name: 'Tous les fichiers', extensions: ['*'] },
];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type ImageFormat = 'svg' | 'png';

const IMAGE_FORMATS: Record<ImageFormat, { extension: string; filter: FileFilter; matches(data: Uint8Array): boolean }> = {
  png: {
    extension: '.png',
    filter: { name: 'Image PNG (*.png)', extensions: ['png'] },
    matches: (data) => PNG_SIGNATURE.every((byte, index) => data[index] === byte),
  },
  svg: {
    extension: '.svg',
    filter: { name: 'Image SVG (*.svg)', extensions: ['svg'] },
    matches: (data) => new TextDecoder().decode(data.subarray(0, 512)).includes('<svg'),
  },
};

/** Nom sans chemin ni caractère interdit ; chaîne vide si rien d'exploitable. */
function cleanBaseName(requested: string): string {
  const base = path.basename(requested.replace(/\\/g, '/'));
  const cleaned = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim();
  return cleaned === '.' || cleaned === '..' ? '' : cleaned;
}

/** Nom proposé pour un projet : toujours une extension .json. */
export function safeFileName(requested: string): string {
  const cleaned = cleanBaseName(requested);
  if (cleaned === '') return DEFAULT_PROJECT_FILE_NAME;
  return cleaned.toLowerCase().endsWith('.json') ? cleaned : `${cleaned}${PROJECT_EXTENSION}`;
}

/** Nom proposé pour une image : toujours l'extension du format demandé. */
export function safeImageFileName(requested: string, format: ImageFormat): string {
  const { extension } = IMAGE_FORMATS[format];
  const cleaned = cleanBaseName(requested);
  if (cleaned === '') return `automate${extension}`;
  return cleaned.toLowerCase().endsWith(extension) ? cleaned : `${cleaned}${extension}`;
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const byteLength = (text: string): number => new TextEncoder().encode(text).length;
const failed = (message: string): IpcSaveResult => ({ kind: 'failed', message });

export function createProjectFileHandlers(dialogs: FileDialogs, fs: FileSystem, defaultDirectory: string) {
  return {
    /** Les arguments viennent du renderer : rien n'est supposé, tout est vérifié. */
    async save(suggestedName: unknown, content: unknown): Promise<IpcSaveResult> {
      if (typeof suggestedName !== 'string' || typeof content !== 'string') return failed('Requête invalide.');
      if (byteLength(content) > MAX_PROJECT_BYTES) {
        return failed('Le projet est trop volumineux pour être enregistré.');
      }
      const chosen = await dialogs.showSaveDialog({
        title: "Enregistrer l'automate",
        defaultPath: path.join(defaultDirectory, safeFileName(suggestedName)),
        filters: PROJECT_FILTERS,
      });
      if (chosen.canceled || !chosen.filePath) return { kind: 'cancelled' };
      const target = path.extname(chosen.filePath) === '' ? `${chosen.filePath}${PROJECT_EXTENSION}` : chosen.filePath;
      try {
        await fs.writeFile(target, content, 'utf-8');
        return { kind: 'saved', location: target };
      } catch (error) {
        return failed(`Écriture impossible : ${reason(error)}`);
      }
    },

    async open(): Promise<IpcOpenResult> {
      const chosen = await dialogs.showOpenDialog({
        title: 'Ouvrir un automate',
        properties: ['openFile'],
        filters: PROJECT_FILTERS,
      });
      const file = chosen.filePaths[0];
      if (chosen.canceled || file === undefined) return { kind: 'cancelled' };
      try {
        const { size } = await fs.stat(file);
        if (size > MAX_PROJECT_BYTES) {
          return { kind: 'failed', message: 'Ce fichier est trop volumineux pour être un projet d’automate.' };
        }
        return { kind: 'opened', name: path.basename(file), content: await fs.readFile(file, 'utf-8') };
      } catch (error) {
        return { kind: 'failed', message: `Lecture impossible : ${reason(error)}` };
      }
    },

    /** Image exportée par le renderer : format, taille et signature du contenu sont contrôlés avant d'écrire. */
    async exportImage(suggestedName: unknown, format: unknown, data: unknown): Promise<IpcSaveResult> {
      if (typeof suggestedName !== 'string' || (format !== 'svg' && format !== 'png') || !(data instanceof Uint8Array)) {
        return failed('Requête invalide.');
      }
      if (data.byteLength > MAX_IMAGE_BYTES) return failed("L'image est trop volumineuse pour être exportée.");
      const spec = IMAGE_FORMATS[format];
      if (!spec.matches(data)) return failed('Le contenu ne correspond pas au format demandé.');

      const chosen = await dialogs.showSaveDialog({
        title: "Exporter l'image",
        defaultPath: path.join(defaultDirectory, safeImageFileName(suggestedName, format)),
        filters: [spec.filter],
      });
      if (chosen.canceled || !chosen.filePath) return { kind: 'cancelled' };
      const target = path.extname(chosen.filePath) === '' ? `${chosen.filePath}${spec.extension}` : chosen.filePath;
      try {
        await fs.writeBinary(target, data);
        return { kind: 'saved', location: target };
      } catch (error) {
        return failed(`Écriture impossible : ${reason(error)}`);
      }
    },
  };
}
