import { describe, expect, it } from 'vitest';
import { DefinitionDraft } from './DefinitionDraft';
import { validateDefinitionDraft } from './validateDefinitionDraft';
import type { DefinitionErrors } from './validateDefinitionDraft';

const valid = (): DefinitionDraft => DefinitionDraft.empty().withSymbolsAdded('ab').withRegex('(a|b)*ab');

function errorsOf(draft: DefinitionDraft): DefinitionErrors {
  const result = validateDefinitionDraft(draft);
  if (result.ok) throw new Error('Des erreurs de validation étaient attendues');
  return result.errors;
}

describe('validateDefinitionDraft : cas valide', () => {
  it('crée la LanguageDefinition', () => {
    const result = validateDefinitionDraft(valid());
    if (!result.ok) throw new Error('Une définition valide était attendue');
    expect(result.definition.alphabet.toArray()).toEqual(['a', 'b']);
    expect(result.definition.regexSource).toBe('(a|b)*ab');
    expect(result.definition.states.map((state) => state.id)).toEqual(['q0', 'q1']);
  });

  it('retire les espaces autour des noms d’états', () => {
    const result = validateDefinitionDraft(valid().withStateRenamed(0, '  q0 '));
    if (!result.ok) throw new Error('Une définition valide était attendue');
    expect(result.definition.states[0]?.id).toBe('q0');
  });
});

describe('validateDefinitionDraft : alphabet et regex', () => {
  it('signale un brouillon vide', () => {
    const errors = errorsOf(DefinitionDraft.empty());
    expect(errors.alphabet).toContain('au moins un symbole');
    expect(errors.regex?.position).toBe(null);
    expect(errors.states).toBe(null);
  });

  it('signale la position d’une erreur de syntaxe', () => {
    const errors = errorsOf(valid().withRegex('(a'));
    expect(errors.alphabet).toBe(null);
    expect(errors.regex?.message).toContain('Parenthèse fermante');
    expect(errors.regex?.position).toBe(2);
  });

  it('signale un symbole hors alphabet', () => {
    expect(errorsOf(valid().withRegex('ac')).regex?.message).toContain('« c »');
  });

  it('signale un symbole réservé sans vérifier la regex', () => {
    const errors = errorsOf(valid().withSymbolsAdded('*'));
    expect(errors.alphabet).toContain('« * »');
    expect(errors.regex).toBe(null);
  });
});

describe('validateDefinitionDraft : états', () => {
  it('signale un nom vide', () => {
    const errors = errorsOf(valid().withStateRenamed(0, ' '));
    expect(errors.stateNames[0]).toBe('Le nom ne peut pas être vide');
    expect(errors.stateNames[1]).toBe(undefined);
  });

  it('signale tous les noms en double', () => {
    const errors = errorsOf(valid().withStateRenamed(1, 'q0'));
    expect(errors.stateNames[0]).toContain('« q0 »');
    expect(errors.stateNames[1]).toContain('« q0 »');
  });

  it('signale l’absence d’état initial', () => {
    expect(errorsOf(valid().withoutState(0)).states).toContain('état initial');
  });

  it('signale l’absence d’état final', () => {
    expect(errorsOf(valid().withFinalToggled(1)).states).toContain('état final');
  });

  it('signale l’absence de tout état', () => {
    expect(errorsOf(valid().withoutState(0).withoutState(1)).states).toContain('au moins un état');
  });

  it('n’affiche les règles globales qu’une fois les noms corrigés', () => {
    const errors = errorsOf(valid().withStateRenamed(0, '').withoutState(1));
    expect(errors.stateNames[0]).toBe('Le nom ne peut pas être vide');
    expect(errors.states).toBe(null);
  });
});
