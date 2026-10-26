import { useId } from 'react';
import type { FormEvent } from 'react';

interface Props {
  readonly word: string;
  readonly alphabet: readonly string[];
  readonly onWordChange: (word: string) => void;
  readonly onRun: () => void;
}

export function WordForm({ word, alphabet, onWordChange, onRun }: Props) {
  const inputId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onRun();
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>Mot à tester</h2>
      <p className="hint">
        Symboles de l'alphabet : <code>{alphabet.join(' ')}</code>. Laisse le champ vide pour tester le mot vide (ε).
      </p>
      <label htmlFor={inputId} className="visually-hidden">
        Mot à tester
      </label>
      <div className="row">
        <input
          id={inputId}
          className="mono"
          value={word}
          onChange={(event) => onWordChange(event.target.value)}
          placeholder="abab"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="primary">
          Lancer
        </button>
      </div>
    </form>
  );
}
