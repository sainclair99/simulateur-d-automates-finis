export type DomainErrorCode =
  | 'EMPTY_STATE_SET'
  | 'EMPTY_STATE_NAME'
  | 'DUPLICATE_STATE'
  | 'NO_INITIAL_STATE'
  | 'MULTIPLE_INITIAL_STATES'
  | 'NO_FINAL_STATE'
  | 'UNKNOWN_STATE'
  | 'SYMBOL_NOT_IN_ALPHABET'
  | 'DUPLICATE_TRANSITION'
  | 'TRANSITION_NOT_FOUND';

/** Violation d'une règle métier. Le `code` permet à l'UI de réagir sans analyser le message. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
