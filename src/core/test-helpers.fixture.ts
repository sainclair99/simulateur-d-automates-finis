import { expect } from 'vitest';
import { DomainError } from './model/errors';
import type { DomainErrorCode } from './model/errors';

export function expectDomainError(action: () => unknown, code: DomainErrorCode): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  expect.unreachable(`Une DomainError « ${code} » était attendue`);
}
