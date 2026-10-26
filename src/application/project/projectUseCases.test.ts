import { describe, expect, it } from 'vitest';
import { endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { ConstructionState } from '../construction/ConstructionState';
import { DEFAULT_FILE_NAME, parseProject, serializeProject } from './projectFile';
import type { OpenResult, ProjectFiles, SaveResult } from './ProjectFiles';
import { openProject, saveProject } from './projectUseCases';

const definition = endsWithAbDefinition();
const construction = ConstructionState.start(definition).autoLayout().addSymbol('q0', 'q1', 'a').addLink('q1', 'q2');

/** Faux gestionnaire de fichiers : un seul « disque » en mémoire. */
function memoryFiles(behaviour: { save?: SaveResult | Error; open?: OpenResult | Error } = {}) {
  const state = { content: '', suggested: '' };
  const files: ProjectFiles = {
    async save(suggestedName, content) {
      if (behaviour.save instanceof Error) throw behaviour.save;
      state.suggested = suggestedName;
      state.content = content;
      return behaviour.save ?? { kind: 'saved', location: `C:\\Docs\\${suggestedName}` };
    },
    async open() {
      if (behaviour.open instanceof Error) throw behaviour.open;
      return behaviour.open ?? { kind: 'opened', name: 'projet.automate.json', content: state.content };
    },
  };
  return { files, state };
}

describe('saveProject', () => {
  it('écrit le projet sérialisé et renvoie l’instantané de référence', async () => {
    const { files, state } = memoryFiles();
    const outcome = await saveProject(files, definition, construction);
    expect(outcome).toEqual({
      kind: 'saved',
      location: `C:\\Docs\\${DEFAULT_FILE_NAME}`,
      fileName: DEFAULT_FILE_NAME,
      snapshot: serializeProject(definition, construction),
    });
    expect(state.content).toBe(serializeProject(definition, construction));
  });

  it('propose le nom donné (ré-enregistrement)', async () => {
    const { files, state } = memoryFiles();
    await saveProject(files, definition, construction, 'ab.automate.json');
    expect(state.suggested).toBe('ab.automate.json');
  });

  it('transmet l’annulation et les échecs, et capture les exceptions', async () => {
    expect(await saveProject(memoryFiles({ save: { kind: 'cancelled' } }).files, definition, construction)).toEqual({ kind: 'cancelled' });
    expect(await saveProject(memoryFiles({ save: { kind: 'failed', message: 'disque plein' } }).files, definition, construction)).toEqual({
      kind: 'failed',
      message: 'disque plein',
    });
    expect(await saveProject(memoryFiles({ save: new Error('boum') }).files, definition, construction)).toEqual({
      kind: 'failed',
      message: 'Enregistrement impossible : boum',
    });
  });
});

describe('openProject', () => {
  it('relit le projet enregistré, identique à l’original', async () => {
    const { files } = memoryFiles();
    await saveProject(files, definition, construction);
    const outcome = await openProject(files);
    if (outcome.kind !== 'opened') throw new Error('Ouverture attendue');
    expect(outcome.fileName).toBe('projet.automate.json');
    expect(outcome.snapshot).toBe(serializeProject(definition, construction));
    expect(serializeProject(outcome.definition, outcome.construction)).toBe(outcome.snapshot);
    expect(outcome.construction.automaton.next('q0', 'a')).toEqual(['q1']);
  });

  it('transmet l’annulation et les échecs, et capture les exceptions', async () => {
    expect(await openProject(memoryFiles({ open: { kind: 'cancelled' } }).files)).toEqual({ kind: 'cancelled' });
    expect(await openProject(memoryFiles({ open: { kind: 'failed', message: 'illisible' } }).files)).toEqual({
      kind: 'failed',
      message: 'illisible',
    });
    expect(await openProject(memoryFiles({ open: new Error('boum') }).files)).toEqual({
      kind: 'failed',
      message: 'Ouverture impossible : boum',
    });
  });

  it('nomme le fichier fautif quand son contenu est invalide', async () => {
    const outcome = await openProject(memoryFiles({ open: { kind: 'opened', name: 'notes.json', content: '{"a":1}' } }).files);
    expect(outcome).toEqual({
      kind: 'failed',
      message: "« notes.json » : Ce fichier n'est pas un projet du Simulateur d'automates.",
    });
  });

  it('le résultat de parseProject sert bien de base à l’ouverture', () => {
    expect(parseProject(serializeProject(definition, construction)).ok).toBe(true);
  });
});
