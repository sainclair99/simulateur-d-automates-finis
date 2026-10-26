import type { ImageFiles, SaveResult } from '../../application';

const MIME = { svg: 'image/svg+xml', png: 'image/png' } as const;

/** Repli pour un navigateur ordinaire : simple téléchargement. */
export function createBrowserImageFiles(): ImageFiles {
  return {
    async save(suggestedName, format, data): Promise<SaveResult> {
      const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: MIME[format] }));
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { kind: 'saved', location: suggestedName };
    },
  };
}
