import { useId, useState } from 'react';

interface Props {
  readonly symbols: readonly string[];
  readonly error: string | null;
  readonly onAdd: (text: string) => void;
  readonly onRemove: (symbol: string) => void;
}

export function AlphabetField({ symbols, error, onAdd, onRemove }: Props) {
  const [text, setText] = useState('');
  const errorId = useId();

  const add = () => {
    if (text.trim() === '') return;
    onAdd(text);
    setText('');
  };

  return (
    <section className="card">
      <h2>Alphabet</h2>
      <p className="hint">
        Chaque caractère saisi devient un symbole (ex. : <code>ab</code> ajoute <code>a</code> et <code>b</code>).
      </p>
      <ul className="chips" aria-label="Symboles de l'alphabet">
        {symbols.map((symbol) => (
          <li key={symbol} className="chip">
            <code>{symbol}</code>
            <button type="button" onClick={() => onRemove(symbol)} aria-label={`Retirer le symbole ${symbol}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input
          className="mono"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          aria-label="Symboles à ajouter"
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" onClick={add}>
          Ajouter
        </button>
      </div>
      {error !== null && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
    </section>
  );
}
