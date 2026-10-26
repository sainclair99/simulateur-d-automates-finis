import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import { ConstructionHistory } from './ConstructionHistory';

const definition = LanguageDefinition.create({
  regex: '(a|b)*',
  alphabet: ['a', 'b'],
  states: [
    { id: 'q0', isInitial: true, isFinal: false },
    { id: 'q1', isInitial: false, isFinal: true },
  ],
});
const start = (): ConstructionHistory => ConstructionHistory.start(definition);

describe('ConstructionHistory', () => {
  it('démarre sans annulation ni rétablissement possibles', () => {
    const history = start();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toBe(history);
    expect(history.redo()).toBe(history);
  });

  it('enregistre une modification, puis l’annule et la rétablit', () => {
    const edited = start().edit((state) => state.addSymbol('q0', 'q1', 'a'));
    expect(edited.error).toBe(null);
    expect(edited.history.present.links).toHaveLength(1);
    expect(edited.history.canUndo).toBe(true);

    const undone = edited.history.undo();
    expect(undone.present.links).toHaveLength(0);
    expect(undone.canRedo).toBe(true);

    const redone = undone.redo();
    expect(redone.present.links).toHaveLength(1);
    expect(redone.canRedo).toBe(false);
  });

  it('efface le « rétablir » dès qu’une nouvelle modification est faite', () => {
    const first = start().edit((state) => state.addSymbol('q0', 'q1', 'a')).history;
    const branched = first.undo().edit((state) => state.addSymbol('q0', 'q1', 'b')).history;
    expect(branched.canRedo).toBe(false);
    expect(branched.present.automaton.next('q0', 'b')).toEqual(['q1']);
    expect(branched.present.automaton.next('q0', 'a')).toEqual([]);
  });

  it('transforme une violation du domaine en message, sans toucher à l’historique', () => {
    const history = start();
    const result = history.edit((state) => state.addSymbol('q0', 'q1', 'z'));
    expect(result.history).toBe(history);
    expect(result.error).toContain('« z »');
  });

  it('laisse remonter les erreurs imprévues', () => {
    expect(() =>
      start().edit(() => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
  });

  it('n’enregistre pas une modification sans effet', () => {
    const history = start();
    expect(history.edit((state) => state).history).toBe(history);
  });
});

describe('ConstructionHistory.from', () => {
  it('démarre depuis un projet existant, sans annulation possible', () => {
    const state = start().present.addSymbol('q0', 'q1', 'a');
    const history = ConstructionHistory.from(state);
    expect(history.present).toBe(state);
    expect(history.canUndo).toBe(false);
    expect(history.edit((s) => s.addSymbol('q0', 'q1', 'b')).history.undo().present).toBe(state);
  });
});
