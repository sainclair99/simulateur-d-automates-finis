import type { OpenResult, ProjectFiles, SaveResult } from '../../application';

/** Repli pour un navigateur ordinaire (ex. http://localhost:5173 dans Chrome) : téléchargement + sélecteur de fichier. */
export function createBrowserProjectFiles(): ProjectFiles {
  return {
    async save(suggestedName, content): Promise<SaveResult> {
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { kind: 'saved', location: suggestedName };
    },

    open(): Promise<OpenResult> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve({ kind: 'cancelled' });
            return;
          }
          try {
            resolve({ kind: 'opened', name: file.name, content: await file.text() });
          } catch {
            resolve({ kind: 'failed', message: 'Lecture du fichier impossible.' });
          }
        });
        input.addEventListener('cancel', () => resolve({ kind: 'cancelled' }));
        input.click();
      });
    },
  };
}
