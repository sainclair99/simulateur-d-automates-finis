import { describe, expect, it } from 'vitest';
import {
  createProjectFileHandlers,
  DEFAULT_PROJECT_FILE_NAME,
  MAX_IMAGE_BYTES,
  MAX_PROJECT_BYTES,
  safeFileName,
  safeImageFileName,
} from './projectFiles';
import type { FileDialogs, FileSystem } from './projectFiles';

interface Fakes {
  dialogs: FileDialogs;
  fs: FileSystem;
  files: Map<string, string>;
  binaries: Map<string, Uint8Array>;
  saveOptions: Array<{ title: string; defaultPath: string; extensions: string[] }>;
}

function fakes(options: { savePath?: string | null; openPath?: string | null; failWrite?: boolean; failRead?: boolean } = {}): Fakes {
  const files = new Map<string, string>();
  const binaries = new Map<string, Uint8Array>();
  const saveOptions: Fakes['saveOptions'] = [];
  const { savePath = '/docs/choisi.automate.json', openPath = '/docs/ouvert.automate.json' } = options;
  return {
    files,
    binaries,
    saveOptions,
    dialogs: {
      showSaveDialog: async (o) => {
        saveOptions.push({ title: o.title, defaultPath: o.defaultPath, extensions: o.filters.flatMap((f) => f.extensions) });
        return savePath === null ? { canceled: true } : { canceled: false, filePath: savePath };
      },
      showOpenDialog: async () =>
        openPath === null ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: [openPath] },
    },
    fs: {
      writeFile: async (file, data) => {
        if (options.failWrite) throw new Error('disque plein');
        files.set(file, data);
      },
      writeBinary: async (file, data) => {
        if (options.failWrite) throw new Error('disque plein');
        binaries.set(file, data);
      },
      readFile: async (file) => {
        if (options.failRead) throw new Error('accès refusé');
        const content = files.get(file);
        if (content === undefined) throw new Error('introuvable');
        return content;
      },
      stat: async (file) => ({ size: new TextEncoder().encode(files.get(file) ?? '').length }),
    },
  };
}

describe('safeFileName', () => {
  it.each([
    ['mon-automate.automate.json', 'mon-automate.automate.json'],
    ['test', 'test.automate.json'],
    ['../../etc/passwd', 'passwd.automate.json'],
    ['C:\\Users\\moi\\projet.json', 'projet.json'],
    ['a<b>c:d|e?.json', 'a-b-c-d-e-.json'],
    ['   ', DEFAULT_PROJECT_FILE_NAME],
    ['..', DEFAULT_PROJECT_FILE_NAME],
    ['', DEFAULT_PROJECT_FILE_NAME],
  ])('« %s » → « %s »', (requested, expected) => {
    expect(safeFileName(requested)).toBe(expected);
  });
});

describe('createProjectFileHandlers : enregistrer', () => {
  it('écrit le contenu à l’endroit choisi et propose un nom sûr dans le dossier par défaut', async () => {
    const f = fakes();
    const result = await createProjectFileHandlers(f.dialogs, f.fs, '/documents').save('../x/mon projet', '{"a":1}');
    expect(result).toEqual({ kind: 'saved', location: '/docs/choisi.automate.json' });
    expect(f.files.get('/docs/choisi.automate.json')).toBe('{"a":1}');
    expect(f.saveOptions[0]?.defaultPath).toBe('/documents/mon projet.automate.json');
  });

  it('ajoute l’extension quand le nom choisi n’en a pas', async () => {
    const f = fakes({ savePath: '/docs/sans-extension' });
    const result = await createProjectFileHandlers(f.dialogs, f.fs, '/documents').save('a', 'x');
    expect(result).toEqual({ kind: 'saved', location: '/docs/sans-extension.automate.json' });
  });

  it('ne fait rien quand la boîte de dialogue est annulée', async () => {
    const f = fakes({ savePath: null });
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').save('a', 'x')).toEqual({ kind: 'cancelled' });
    expect(f.files.size).toBe(0);
  });

  it('refuse des arguments qui ne sont pas du texte, sans ouvrir de dialogue', async () => {
    const f = fakes();
    const handlers = createProjectFileHandlers(f.dialogs, f.fs, '/d');
    expect((await handlers.save(42, 'x')).kind).toBe('failed');
    expect((await handlers.save('a', { evil: true })).kind).toBe('failed');
    expect(f.saveOptions).toHaveLength(0);
  });

  it('refuse un contenu trop volumineux', async () => {
    const f = fakes();
    const result = await createProjectFileHandlers(f.dialogs, f.fs, '/d').save('a', 'x'.repeat(MAX_PROJECT_BYTES + 1));
    expect(result.kind).toBe('failed');
    expect(f.saveOptions).toHaveLength(0);
  });

  it('transforme une erreur d’écriture en message', async () => {
    const f = fakes({ failWrite: true });
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').save('a', 'x')).toEqual({
      kind: 'failed',
      message: 'Écriture impossible : disque plein',
    });
  });
});

describe('createProjectFileHandlers : ouvrir', () => {
  it('lit le fichier choisi et renvoie son nom (sans le chemin)', async () => {
    const f = fakes();
    f.files.set('/docs/ouvert.automate.json', '{"ok":true}');
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').open()).toEqual({
      kind: 'opened',
      name: 'ouvert.automate.json',
      content: '{"ok":true}',
    });
  });

  it('ne fait rien quand la boîte de dialogue est annulée', async () => {
    const f = fakes({ openPath: null });
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').open()).toEqual({ kind: 'cancelled' });
  });

  it('refuse un fichier trop volumineux sans le lire', async () => {
    const f = fakes();
    f.files.set('/docs/ouvert.automate.json', 'x'.repeat(MAX_PROJECT_BYTES + 1));
    expect((await createProjectFileHandlers(f.dialogs, f.fs, '/d').open()).kind).toBe('failed');
  });

  it('transforme une erreur de lecture en message', async () => {
    const f = fakes({ failRead: true });
    f.files.set('/docs/ouvert.automate.json', 'x');
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').open()).toEqual({
      kind: 'failed',
      message: 'Lecture impossible : accès refusé',
    });
  });
});

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const SVG = new TextEncoder().encode('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('safeImageFileName', () => {
  it.each([
    ['ab.png', 'png', 'ab.png'],
    ['ab', 'png', 'ab.png'],
    ['ab.svg', 'png', 'ab.svg.png'],
    ['../../x/dessin', 'svg', 'dessin.svg'],
    ['A.SVG', 'svg', 'A.SVG'],
    ['', 'svg', 'automate.svg'],
    ['..', 'png', 'automate.png'],
  ] as const)('« %s » (%s) → « %s »', (requested, format, expected) => {
    expect(safeImageFileName(requested, format)).toBe(expected);
  });
});

describe('createProjectFileHandlers : exporter une image', () => {
  it('écrit un PNG à l’endroit choisi, avec le filtre PNG et un nom sûr', async () => {
    const f = fakes({ savePath: '/img/choisi.png' });
    const result = await createProjectFileHandlers(f.dialogs, f.fs, '/documents').exportImage('../a/mon dessin', 'png', PNG);
    expect(result).toEqual({ kind: 'saved', location: '/img/choisi.png' });
    expect(f.binaries.get('/img/choisi.png')).toEqual(PNG);
    expect(f.saveOptions[0]).toEqual({ title: "Exporter l'image", defaultPath: '/documents/mon dessin.png', extensions: ['png'] });
  });

  it('écrit un SVG et ajoute l’extension quand le nom choisi n’en a pas', async () => {
    const f = fakes({ savePath: '/img/sans-extension' });
    const result = await createProjectFileHandlers(f.dialogs, f.fs, '/d').exportImage('a', 'svg', SVG);
    expect(result).toEqual({ kind: 'saved', location: '/img/sans-extension.svg' });
    expect(f.binaries.has('/img/sans-extension.svg')).toBe(true);
  });

  it('ne fait rien quand la boîte de dialogue est annulée', async () => {
    const f = fakes({ savePath: null });
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').exportImage('a', 'png', PNG)).toEqual({ kind: 'cancelled' });
    expect(f.binaries.size).toBe(0);
  });

  it('refuse des arguments invalides, sans ouvrir de dialogue', async () => {
    const f = fakes();
    const handlers = createProjectFileHandlers(f.dialogs, f.fs, '/d');
    for (const [name, format, data] of [
      [42, 'png', PNG],
      ['a', 'gif', PNG],
      ['a', 'png', 'pas des octets'],
      ['a', 'png', [137, 80, 78, 71]],
      ['a', 'png', null],
    ] as const) {
      expect((await handlers.exportImage(name, format, data)).kind).toBe('failed');
    }
    expect(f.saveOptions).toHaveLength(0);
  });

  it('refuse un contenu qui ne correspond pas au format annoncé', async () => {
    const f = fakes();
    const handlers = createProjectFileHandlers(f.dialogs, f.fs, '/d');
    expect(await handlers.exportImage('a', 'png', SVG)).toEqual({ kind: 'failed', message: 'Le contenu ne correspond pas au format demandé.' });
    expect((await handlers.exportImage('a', 'svg', PNG)).kind).toBe('failed');
    expect((await handlers.exportImage('a', 'svg', new TextEncoder().encode('<html></html>'))).kind).toBe('failed');
    expect(f.saveOptions).toHaveLength(0);
  });

  it('refuse une image trop volumineuse', async () => {
    const f = fakes();
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(PNG);
    expect((await createProjectFileHandlers(f.dialogs, f.fs, '/d').exportImage('a', 'png', huge)).kind).toBe('failed');
    expect(f.saveOptions).toHaveLength(0);
  });

  it('transforme une erreur d’écriture en message', async () => {
    const f = fakes({ failWrite: true });
    expect(await createProjectFileHandlers(f.dialogs, f.fs, '/d').exportImage('a', 'png', PNG)).toEqual({
      kind: 'failed',
      message: 'Écriture impossible : disque plein',
    });
  });
});
