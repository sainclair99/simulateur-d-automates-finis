import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import { endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { ConstructionState } from '../construction/ConstructionState';
import { fileNameOf, isDirty, parseProject, PROJECT_FORMAT, serializeProject } from './projectFile';

const definition = endsWithAbDefinition();

/** Un projet « vécu » : positions libres, transitions, flèche vide laissée en attente. */
function sampleConstruction(): ConstructionState {
  return ConstructionState.start(definition)
    .placeState('q0', { x: 240.4, y: 310.6 })
    .placeState('q1', { x: 500, y: 200 })
    .addSymbol('q0', 'q1', 'a')
    .addSymbol('q0', 'q0', 'b')
    .addSymbol('q1', 'q2', 'b')
    .addLink('q2', 'q0');
}

function document(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...JSON.parse(serializeProject(definition, sampleConstruction())), ...overrides });
}

function parsed(text: string) {
  const result = parseProject(text);
  if (!result.ok) throw new Error(`Lecture refusée : ${result.message}`);
  return result;
}

function failure(text: string): string {
  const result = parseProject(text);
  if (result.ok) throw new Error('Un refus était attendu');
  return result.message;
}

describe('serializeProject', () => {
  it('produit un JSON versionné, lisible et sans date (donc reproductible)', () => {
    const text = serializeProject(definition, sampleConstruction());
    const json = JSON.parse(text);
    expect(json.format).toBe(PROJECT_FORMAT);
    expect(json.version).toBe(1);
    expect(json.definition.regex).toBe('(a|b)*ab');
    expect(json.definition.alphabet).toEqual(['a', 'b']);
    expect(json.construction.positions).toEqual([
      { state: 'q0', x: 240, y: 311 },
      { state: 'q1', x: 500, y: 200 },
    ]);
    expect(json.construction.transitions).toHaveLength(3);
    expect(json.construction.links).toEqual([{ from: 'q2', to: 'q0' }]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toBe(serializeProject(definition, sampleConstruction()));
  });
});

describe('parseProject : aller-retour', () => {
  it('relit exactement ce qui a été écrit', () => {
    const text = serializeProject(definition, sampleConstruction());
    const result = parsed(text);
    expect(serializeProject(result.definition, result.construction)).toBe(text);
    expect(result.definition.regexSource).toBe('(a|b)*ab');
    expect(result.construction.automaton.transitions).toHaveLength(3);
    expect(result.construction.positions.get('q1')).toEqual({ x: 500, y: 200 });
    expect(result.construction.links.find((l) => l.from === 'q2')?.symbols).toEqual([]);
    expect(result.construction.unplacedStates).toEqual(['q2']);
  });

  it('accepte des noms d’états piégeux sans les confondre avec des propriétés d’objet', () => {
    const tricky = LanguageDefinition.create({
      regex: 'a',
      alphabet: ['a'],
      states: [
        { id: '__proto__', isInitial: true, isFinal: false },
        { id: 'constructor', isInitial: false, isFinal: true },
      ],
    });
    const construction = ConstructionState.start(tricky)
      .placeState('__proto__', { x: 100, y: 200 })
      .addSymbol('__proto__', 'constructor', 'a');
    const text = serializeProject(tricky, construction);
    const result = parsed(text);
    expect(serializeProject(result.definition, result.construction)).toBe(text);
    expect(result.construction.automaton.next('__proto__', 'a')).toEqual(['constructor']);
  });

  it('accepte un fichier réduit à la définition, et ignore les champs inconnus', () => {
    const minimal = JSON.stringify({
      format: PROJECT_FORMAT,
      version: 1,
      futur: { a: 1 },
      definition: JSON.parse(document()).definition,
    });
    const result = parsed(minimal);
    expect(result.construction.automaton.transitions).toHaveLength(0);
    expect(result.construction.placedStates).toEqual([]);
  });
});

describe('parseProject : fichiers invalides', () => {
  it.each([
    ['du texte quelconque', 'bonjour', "Le fichier n'est pas du JSON valide."],
    ['un fichier vide', '', "Le fichier n'est pas du JSON valide."],
    ['un tableau', '[]', "Ce fichier n'est pas un projet du Simulateur d'automates."],
    ['null', 'null', "Ce fichier n'est pas un projet du Simulateur d'automates."],
    ['un autre JSON', '{"name":"x"}', "Ce fichier n'est pas un projet du Simulateur d'automates."],
    ['un mauvais format', document({ format: 'autre' }), "Ce fichier n'est pas un projet du Simulateur d'automates."],
    ['sans version', document({ version: undefined }), 'Version de format illisible.'],
    ['une version texte', document({ version: '1' }), 'Version de format illisible.'],
    ['une version décimale', document({ version: 1.5 }), 'Version de format illisible.'],
    ['une version plus récente', document({ version: 2 }), "Ce fichier a été créé par une version plus récente de l'application (format 2)."],
    ['sans définition', document({ definition: undefined }), 'La définition du langage est absente.'],
    ['une définition incomplète', document({ definition: { regex: 'a' } }), 'La définition du langage est incomplète ou mal formée.'],
  ])('refuse %s', (_label, text, message) => {
    expect(failure(text)).toBe(message);
  });

  it('explique une regex invalide ou hors alphabet', () => {
    const base = JSON.parse(document()).definition;
    expect(failure(document({ definition: { ...base, regex: '(a' } }))).toContain('Définition invalide : Parenthèse fermante manquante');
    expect(failure(document({ definition: { ...base, regex: 'ac' } }))).toContain("n'appartient pas à l'alphabet");
  });

  it('explique un alphabet ou des états invalides', () => {
    const base = JSON.parse(document()).definition;
    expect(failure(document({ definition: { ...base, alphabet: ['a', 'a'] } }))).toContain('en double');
    expect(failure(document({ definition: { ...base, states: [] } }))).toContain('Définition invalide');
  });

  it('explique une construction incohérente avec la définition', () => {
    const base = JSON.parse(document()).construction;
    const withConstruction = (construction: unknown): string => failure(document({ construction }));
    expect(withConstruction({ ...base, transitions: [{ from: 'q0', to: 'qX', symbol: 'a' }] })).toBe(
      "Construction invalide : L'état « qX » n'existe pas",
    );
    expect(withConstruction({ ...base, transitions: [{ from: 'q0', to: 'q1', symbol: 'z' }] })).toContain('« z »');
    expect(
      withConstruction({ ...base, transitions: [{ from: 'q0', to: 'q1', symbol: 'a' }, { from: 'q0', to: 'q1', symbol: 'a' }] }),
    ).toContain('existe déjà');
    expect(withConstruction({ ...base, positions: [{ state: 'qX', x: 1, y: 2 }] })).toContain('« qX »');
  });

  it('refuse des éléments de construction mal typés', () => {
    const base = JSON.parse(document()).construction;
    for (const broken of [
      { ...base, positions: [{ state: 'q0', x: '10', y: 5 }] },
      { ...base, positions: [{ state: 'q0', x: 10, y: null }] },
      { ...base, transitions: [{ from: 'q0', to: 'q1' }] },
      { ...base, links: 'oui' },
      'texte',
      42,
    ]) {
      expect(failure(document({ construction: broken }))).toBe('La construction est mal formée.');
    }
  });

  it('refuse un fichier démesuré', () => {
    const base = JSON.parse(document()).construction;
    const huge = Array.from({ length: 5001 }, () => ({ from: 'q0', to: 'q1' }));
    expect(failure(document({ construction: { ...base, links: huge } }))).toBe('Ce fichier est trop complexe.');
  });

  it('ramène les positions hors du canevas à l’intérieur', () => {
    const base = JSON.parse(document()).construction;
    const result = parsed(document({ construction: { ...base, positions: [{ state: 'q0', x: -500, y: 99999 }] } }));
    expect(result.construction.positions.get('q0')).toEqual({ x: 60, y: 520 });
  });
});

describe('isDirty', () => {
  it('considère propre un projet fraîchement créé', () => {
    expect(isDirty(definition, ConstructionState.start(definition), null)).toBe(false);
  });

  it('détecte toute modification depuis la création ou la dernière sauvegarde', () => {
    const start = ConstructionState.start(definition);
    expect(isDirty(definition, start.placeState('q0', { x: 100, y: 200 }), null)).toBe(true);
    const saved = serializeProject(definition, sampleConstruction());
    expect(isDirty(definition, sampleConstruction(), saved)).toBe(false);
    expect(isDirty(definition, sampleConstruction().addSymbol('q1', 'q1', 'a'), saved)).toBe(true);
    expect(isDirty(definition, sampleConstruction().placeState('q0', { x: 300, y: 300 }), saved)).toBe(true);
  });

  it('ignore les écarts de décimales invisibles dans le fichier', () => {
    const saved = serializeProject(definition, sampleConstruction());
    expect(isDirty(definition, sampleConstruction().placeState('q0', { x: 240.2, y: 310.9 }), saved)).toBe(false);
  });
});

describe('fileNameOf', () => {
  it.each([
    ['C:\\Users\\moi\\a.automate.json', 'a.automate.json'],
    ['/home/moi/a.json', 'a.json'],
    ['a.json', 'a.json'],
    ['/dossier/', '/dossier/'],
  ])('%s → %s', (location, expected) => {
    expect(fileNameOf(location)).toBe(expected);
  });
});
