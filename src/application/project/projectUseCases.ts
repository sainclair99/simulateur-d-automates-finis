import type { LanguageDefinition } from '../../core';
import type { ConstructionState } from '../construction/ConstructionState';
import { DEFAULT_FILE_NAME, fileNameOf, parseProject, serializeProject } from './projectFile';
import type { ProjectFiles } from './ProjectFiles';

export type SaveOutcome =
  | {
      readonly kind: 'saved';
      readonly location: string;
      readonly fileName: string;
      /** Contenu réellement écrit : sert de référence pour savoir si le projet a changé depuis. */
      readonly snapshot: string;
    }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

export type OpenOutcome =
  | {
      readonly kind: 'opened';
      readonly fileName: string;
      readonly definition: LanguageDefinition;
      readonly construction: ConstructionState;
      readonly snapshot: string;
    }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export async function saveProject(
  files: ProjectFiles,
  definition: LanguageDefinition,
  construction: ConstructionState,
  suggestedName: string = DEFAULT_FILE_NAME,
): Promise<SaveOutcome> {
  const snapshot = serializeProject(definition, construction);
  try {
    const result = await files.save(suggestedName, snapshot);
    if (result.kind === 'saved') {
      return { kind: 'saved', location: result.location, fileName: fileNameOf(result.location), snapshot };
    }
    return result;
  } catch (error) {
    return { kind: 'failed', message: `Enregistrement impossible : ${reason(error)}` };
  }
}

export async function openProject(files: ProjectFiles): Promise<OpenOutcome> {
  try {
    const result = await files.open();
    if (result.kind !== 'opened') return result;
    const parsed = parseProject(result.content);
    if (!parsed.ok) return { kind: 'failed', message: `« ${result.name} » : ${parsed.message}` };
    return {
      kind: 'opened',
      fileName: result.name,
      definition: parsed.definition,
      construction: parsed.construction,
      snapshot: serializeProject(parsed.definition, parsed.construction),
    };
  } catch (error) {
    return { kind: 'failed', message: `Ouverture impossible : ${reason(error)}` };
  }
}
