import { describe, expect, it } from 'vitest';
import { confirmAbandonChanges, LEAVE, STAY } from './unloadPrompt';
import type { MessageBoxes } from './unloadPrompt';

function boxes(answer: number) {
  const shown: Array<Parameters<MessageBoxes['showMessageBoxSync']>[0]> = [];
  const fake: MessageBoxes = {
    showMessageBoxSync: (options) => {
      shown.push(options);
      return answer;
    },
  };
  return { fake, shown };
}

describe('confirmAbandonChanges', () => {
  it('laisse fermer seulement si l’utilisateur choisit d’abandonner', () => {
    expect(confirmAbandonChanges(boxes(LEAVE).fake)).toBe(true);
    expect(confirmAbandonChanges(boxes(STAY).fake)).toBe(false);
  });

  it('traite toute autre réponse comme « rester »', () => {
    expect(confirmAbandonChanges(boxes(-1).fake)).toBe(false);
    expect(confirmAbandonChanges(boxes(7).fake)).toBe(false);
  });

  it('propose « Rester » par défaut, y compris avec Échap ou en fermant la boîte', () => {
    const { fake, shown } = boxes(STAY);
    confirmAbandonChanges(fake);
    const options = shown[0];
    expect(options?.defaultId).toBe(STAY);
    expect(options?.cancelId).toBe(STAY);
    expect(options?.buttons[STAY]).toBe('Rester');
    expect(options?.buttons[LEAVE]).toBe('Abandonner les modifications');
    expect(options?.type).toBe('warning');
  });
});
