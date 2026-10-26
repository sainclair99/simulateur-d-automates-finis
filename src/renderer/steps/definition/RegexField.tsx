import { useId } from 'react';
import type { RegexIssue } from '../../../application';

interface Props {
  readonly value: string;
  readonly issue: RegexIssue | null;
  readonly onChange: (value: string) => void;
}

export function RegexField({ value, issue, onChange }: Props) {
  const inputId = useId();
  const errorId = useId();
  const chars = Array.from(value);
  const position = issue?.position ?? null;

  return (
    <section className="card">
      <h2>Langage (expression régulière)</h2>
      <p className="hint">
        <code>|</code> union · <code>*</code> zéro fois ou plus · <code>+</code> une fois ou plus · <code>?</code>{' '}
        optionnel · <code>( )</code> groupe · <code>ε</code> mot vide
      </p>
      <label htmlFor={inputId} className="visually-hidden">
        Expression régulière
      </label>
      <div className="row">
        <input
          id={inputId}
          className="mono"
          value={value}
          placeholder="(a|b)*ab"
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={issue !== null}
          aria-describedby={issue !== null ? errorId : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" onClick={() => onChange(`${value}ε`)} aria-label="Insérer ε (mot vide)">
          ε
        </button>
      </div>
      {issue !== null && (
        <div id={errorId} className="error">
          <p>{issue.message}</p>
          {position !== null && (
            <p className="mono regex-preview" aria-hidden="true">
              {chars.slice(0, position).join('')}
              <mark>{chars[position] ?? '\u00A0'}</mark>
              {chars.slice(position + 1).join('')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
