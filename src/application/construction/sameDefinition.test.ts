import { describe, expect, it } from 'vitest';
import { LanguageDefinition } from '../../core';
import type { LanguageDefinitionInput } from '../../core';
import { sameDefinition } from './sameDefinition';

const base: LanguageDefinitionInput = {
  regex: '(a|b)*ab',
  alphabet: ['a', 'b'],
  states: [
    { id: 'q0', isInitial: true, isFinal: false },
    { id: 'q1', isInitial: false, isFinal: true },
  ],
};
const make = (override: Partial<LanguageDefinitionInput> = {}): LanguageDefinition =>
  LanguageDefinition.create({ ...base, ...override });

describe('sameDefinition', () => {
  it('reconnaît deux définitions identiques créées séparément', () => {
    expect(sameDefinition(make(), make())).toBe(true);
  });

  it.each([
    ['regex différente', { regex: 'a*' }],
    ['alphabet différent', { alphabet: ['a', 'b', 'c'] }],
    ['alphabet dans un autre ordre', { alphabet: ['b', 'a'] }],
    [
      'rôle d’état différent',
      {
        states: [
          { id: 'q0', isInitial: true, isFinal: true },
          { id: 'q1', isInitial: false, isFinal: true },
        ],
      },
    ],
    [
      'état renommé',
      {
        states: [
          { id: 'q0', isInitial: true, isFinal: false },
          { id: 'q9', isInitial: false, isFinal: true },
        ],
      },
    ],
  ] as Array<[string, Partial<LanguageDefinitionInput>]>)('détecte : %s', (_label, override) => {
    expect(sameDefinition(make(), make(override))).toBe(false);
  });
});
