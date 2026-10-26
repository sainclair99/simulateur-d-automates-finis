import type { SaveResult } from './ProjectFiles';

export type ImageFormat = 'svg' | 'png';

/** Port : enregistrer une image exportée (octets déjà encodés). Même logique que ProjectFiles. */
export interface ImageFiles {
  save(suggestedName: string, format: ImageFormat, data: Uint8Array): Promise<SaveResult>;
}

/** « ab.automate.json » → « ab.png » ; sans projet nommé → « automate.png ». */
export function imageFileName(projectFileName: string | null, format: ImageFormat): string {
  const base = (projectFileName ?? '')
    .replace(/\.automate\.json$/i, '')
    .replace(/\.json$/i, '')
    .trim();
  return `${base === '' ? 'automate' : base}.${format}`;
}
