import { describe, expect, it } from 'vitest';
import { endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { DefinitionDraft } from './DefinitionDraft';

const names = (draft: DefinitionDraft): string[] => draft.states.map((state) => state.name);

describe('DefinitionDraft', () => {
  it('propose q0 (initial) et q1 (final) au départ', () => {
    const draft = DefinitionDraft.empty();
    expect(draft.regex).toBe('');
    expect(draft.alphabet).toEqual([]);
    expect(draft.states).toEqual([
      { key: 0, name: 'q0', isInitial: true, isFinal: false },
      { key: 1, name: 'q1', isInitial: false, isFinal: true },
    ]);
  });

  it('ajoute chaque caractère comme symbole, sans doublon ni séparateur', () => {
    const draft = DefinitionDraft.empty().withSymbolsAdded('a, b c').withSymbolsAdded('ab0');
    expect(draft.alphabet).toEqual(['a', 'b', 'c', '0']);
  });

  it('retire un symbole', () => {
    expect(DefinitionDraft.empty().withSymbolsAdded('abc').withoutSymbol('b').alphabet).toEqual(['a', 'c']);
  });

  it('ajoute des états intermédiaires avec le premier nom libre et des clés uniques', () => {
    const added = DefinitionDraft.empty().withStateAdded();
    expect(names(added)).toEqual(['q0', 'q1', 'q2']);
    expect(added.states[2]).toEqual({ key: 2, name: 'q2', isInitial: false, isFinal: false });

    const reused = DefinitionDraft.empty().withoutState(1).withStateAdded();
    expect(names(reused)).toEqual(['q0', 'q1']);
    expect(reused.states[1]?.key).toBe(2);
  });

  it('garantit un seul état initial', () => {
    const draft = DefinitionDraft.empty().withInitialState(1);
    expect(draft.states.map((state) => state.isInitial)).toEqual([false, true]);
  });

  it('bascule le statut final et renomme un état', () => {
    const draft = DefinitionDraft.empty().withFinalToggled(0).withFinalToggled(1).withStateRenamed(0, 'début');
    expect(draft.states.map((state) => state.isFinal)).toEqual([true, false]);
    expect(names(draft)).toEqual(['début', 'q1']);
  });

  it('est immuable', () => {
    const original = DefinitionDraft.empty();
    original.withRegex('a').withStateAdded().withSymbolsAdded('a').withoutState(0);
    expect(original.regex).toBe('');
    expect(original.states).toHaveLength(2);
    expect(original.alphabet).toEqual([]);
  });
});

describe('DefinitionDraft.fromDefinition', () => {
  it('remplit le formulaire avec une définition existante, prête à être modifiée', () => {
    const draft = DefinitionDraft.fromDefinition(endsWithAbDefinition());
    expect(draft.regex).toBe('(a|b)*ab');
    expect(draft.alphabet).toEqual(['a', 'b']);
    expect(draft.states.map((state) => [state.name, state.isInitial, state.isFinal])).toEqual([
      ['q0', true, false],
      ['q1', false, false],
      ['q2', false, true],
    ]);
    expect(new Set(draft.states.map((state) => state.key)).size).toBe(3);
    expect(draft.withStateAdded().states[3]).toEqual({ key: 3, name: 'q3', isInitial: false, isFinal: false });
  });
});
