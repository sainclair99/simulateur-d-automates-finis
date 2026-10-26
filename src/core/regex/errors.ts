export class RegexSyntaxError extends Error {
  constructor(
    message: string,
    /** Index (en caractères) de l'erreur dans l'expression source. */
    readonly position: number,
  ) {
    super(message);
    this.name = 'RegexSyntaxError';
  }
}
