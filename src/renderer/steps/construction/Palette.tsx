import type { DragEvent } from 'react';
import type { DragPayload } from '../../canvas/dragPayload';

interface Props {
  readonly unplaced: readonly string[];
  readonly alphabet: readonly string[];
  readonly onDragStart: (payload: DragPayload) => void;
  readonly onDragEnd: () => void;
  readonly onAutoLayout: () => void;
}

export function Palette({ unplaced, alphabet, onDragStart, onDragEnd, onAutoLayout }: Props) {
  const start = (event: DragEvent<HTMLElement>, payload: DragPayload) => {
    event.dataTransfer.setData('text/plain', payload.kind === 'symbol' ? payload.symbol : payload.id);
    event.dataTransfer.effectAllowed = 'copy';
    onDragStart(payload);
  };

  return (
    <aside className="palette" aria-label="Palette">
      <section className="card">
        <h2>États à placer</h2>
        {unplaced.length === 0 ? (
          <p className="hint">Tous les états sont placés.</p>
        ) : (
          <ul className="chips" aria-label="États non placés">
            {unplaced.map((id) => (
              <li key={id}>
                <span
                  className="chip chip--drag chip--state mono"
                  draggable
                  onDragStart={(event) => start(event, { kind: 'state', id })}
                  onDragEnd={onDragEnd}
                >
                  {id}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={onAutoLayout}>
          Disposer automatiquement
        </button>
      </section>

      <section className="card">
        <h2>Symboles</h2>
        <p className="hint">
          Glisse un symbole sur une flèche, ou sur un état pour créer une boucle.
        </p>
        <ul className="chips" aria-label="Symboles de l'alphabet">
          {alphabet.map((symbol) => (
            <li key={symbol}>
              <span
                className="chip chip--drag mono"
                draggable
                onDragStart={(event) => start(event, { kind: 'symbol', symbol })}
                onDragEnd={onDragEnd}
              >
                {symbol}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Liaisons</h2>
        <p className="hint">
          Tire depuis le point <strong>●</strong> sous un état jusqu'à un autre état (ou le même, pour une boucle).
        </p>
      </section>
    </aside>
  );
}
