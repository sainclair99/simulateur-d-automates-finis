import { describe, expect, it } from 'vitest';
import { installUnloadGuard } from './unloadGuard';

const closing = (): Event => new Event('beforeunload', { cancelable: true });

describe('installUnloadGuard', () => {
  it('empêche la fermeture tant qu’il est installé', () => {
    const target = new EventTarget();
    installUnloadGuard(target);
    const event = closing();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('laisse fermer une fois retiré', () => {
    const target = new EventTarget();
    const uninstall = installUnloadGuard(target);
    uninstall();
    const event = closing();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ne fait rien sans installation', () => {
    const target = new EventTarget();
    const event = closing();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('peut être installé, retiré puis réinstallé sans s’empiler', () => {
    const target = new EventTarget();
    const first = installUnloadGuard(target);
    first();
    installUnloadGuard(target);
    let calls = 0;
    target.addEventListener('beforeunload', () => {
      calls += 1;
    });
    const event = closing();
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(calls).toBe(1);
  });
});
