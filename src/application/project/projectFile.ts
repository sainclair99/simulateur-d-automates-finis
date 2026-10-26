import { DomainError, InvalidAlphabetError, LanguageDefinition, RegexSyntaxError } from '../../core';
import { ConstructionState } from '../construction/ConstructionState';

export const PROJECT_FORMAT = 'automata-simulator/project';
export const PROJECT_VERSION = 1;
export const DEFAULT_FILE_NAME = 'mon-automate.automate.json';
/** Garde-fou : un fichier plus « riche » que cela n'est pas un automate raisonnable. */
const MAX_ITEMS = 5000;

/*
 * Format (JSON, version 1). Les tableaux (et non des objets indexés par nom d'état) évitent tout souci
 * avec des noms d'états comme « __proto__ ». Les champs inconnus sont ignorés (compatibilité ascendante).
 *
 * {
 *   "format": "automata-simulator/project", "version": 1,
 *   "definition":   { "regex": "...", "alphabet": ["a"], "states": [{ "id": "q0", "isInitial": true, "isFinal": false }] },
 *   "construction": { "positions": [{ "state": "q0", "x": 240, "y": 310 }],
 *                     "transitions": [{ "from": "q0", "to": "q1", "symbol": "a" }],
 *                     "links": [{ "from": "q0", "to": "q1" }] }     // flèches encore sans symbole
 * }
 */

export function serializeProject(definition: LanguageDefinition, construction: ConstructionState): string {
  const document = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    definition: {
      regex: definition.regexSource,
      alphabet: [...definition.alphabet.toArray()],
      states: definition.states.map((state) => ({
        id: state.id,
        isInitial: state.isInitial,
        isFinal: state.isFinal,
      })),
    },
    construction: {
      positions: construction.placedStates.map((placed) => ({
        state: placed.id,
        x: Math.round(placed.position.x),
        y: Math.round(placed.position.y),
      })),
      transitions: construction.automaton.transitions.map((transition) => ({
        from: transition.from,
        to: transition.to,
        symbol: transition.symbol,
      })),
      links: construction.links
        .filter((link) => link.symbols.length === 0)
        .map((link) => ({ from: link.from, to: link.to })),
    },
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

export type ParseOutcome =
  | { readonly ok: true; readonly definition: LanguageDefinition; readonly construction: ConstructionState }
  | { readonly ok: false; readonly message: string };

const fail = (message: string): ParseOutcome => ({ ok: false, message });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function listOf<T>(value: unknown, guard: (item: unknown) => item is T): T[] | null {
  return Array.isArray(value) && value.every(guard) ? (value as T[]) : null;
}

const isString = (item: unknown): item is string => typeof item === 'string';
const isStateRecord = (item: unknown): item is { id: string; isInitial: boolean; isFinal: boolean } =>
  isRecord(item) && isString(item['id']) && typeof item['isInitial'] === 'boolean' && typeof item['isFinal'] === 'boolean';
const isPositionRecord = (item: unknown): item is { state: string; x: number; y: number } =>
  isRecord(item) && isString(item['state']) && Number.isFinite(item['x']) && Number.isFinite(item['y']);
const isTransitionRecord = (item: unknown): item is { from: string; to: string; symbol: string } =>
  isRecord(item) && isString(item['from']) && isString(item['to']) && isString(item['symbol']);
const isLinkRecord = (item: unknown): item is { from: string; to: string } =>
  isRecord(item) && isString(item['from']) && isString(item['to']);

const isUserFacing = (error: unknown): error is Error =>
  error instanceof DomainError || error instanceof InvalidAlphabetError || error instanceof RegexSyntaxError;

/** Lit un fichier de projet. Ne lève jamais d'exception pour un contenu invalide : renvoie un message clair. */
export function parseProject(text: string): ParseOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail("Le fichier n'est pas du JSON valide.");
  }
  if (!isRecord(raw) || raw['format'] !== PROJECT_FORMAT) {
    return fail("Ce fichier n'est pas un projet du Simulateur d'automates.");
  }
  const version = raw['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('Version de format illisible.');
  }
  if (version > PROJECT_VERSION) {
    return fail(`Ce fichier a été créé par une version plus récente de l'application (format ${version}).`);
  }

  const rawDefinition = raw['definition'];
  if (!isRecord(rawDefinition)) return fail('La définition du langage est absente.');
  const alphabet = listOf(rawDefinition['alphabet'], isString);
  const states = listOf(rawDefinition['states'], isStateRecord);
  if (!isString(rawDefinition['regex']) || alphabet === null || states === null) {
    return fail('La définition du langage est incomplète ou mal formée.');
  }
  if (alphabet.length > MAX_ITEMS || states.length > MAX_ITEMS) return fail('Ce fichier est trop complexe.');

  let definition: LanguageDefinition;
  try {
    definition = LanguageDefinition.create({ regex: rawDefinition['regex'], alphabet, states });
  } catch (error) {
    if (isUserFacing(error)) return fail(`Définition invalide : ${error.message}`);
    throw error;
  }

  // La construction est facultative : un fichier réduit à la définition est accepté.
  const rawConstruction = raw['construction'] ?? {};
  if (!isRecord(rawConstruction)) return fail('La construction est mal formée.');
  const positions = listOf(rawConstruction['positions'] ?? [], isPositionRecord);
  const transitions = listOf(rawConstruction['transitions'] ?? [], isTransitionRecord);
  const links = listOf(rawConstruction['links'] ?? [], isLinkRecord);
  if (positions === null || transitions === null || links === null) return fail('La construction est mal formée.');
  if (positions.length > MAX_ITEMS || transitions.length > MAX_ITEMS || links.length > MAX_ITEMS) {
    return fail('Ce fichier est trop complexe.');
  }

  try {
    let construction = ConstructionState.start(definition);
    for (const position of positions) construction = construction.placeState(position.state, position);
    for (const link of links) construction = construction.addLink(link.from, link.to);
    for (const transition of transitions) {
      construction = construction.addSymbol(transition.from, transition.to, transition.symbol);
    }
    return { ok: true, definition, construction };
  } catch (error) {
    if (error instanceof DomainError) return fail(`Construction invalide : ${error.message}`);
    throw error;
  }
}

/** Vrai si le projet a changé depuis le dernier enregistrement / la dernière ouverture (ou depuis sa création). */
export function isDirty(
  definition: LanguageDefinition,
  construction: ConstructionState,
  savedSnapshot: string | null,
): boolean {
  const baseline = savedSnapshot ?? serializeProject(definition, ConstructionState.start(definition));
  return serializeProject(definition, construction) !== baseline;
}

/** « C:\\dossier\\a.json » ou « /home/x/a.json » → « a.json ». */
export function fileNameOf(location: string): string {
  return location.split(/[\\/]/).pop() || location;
}
