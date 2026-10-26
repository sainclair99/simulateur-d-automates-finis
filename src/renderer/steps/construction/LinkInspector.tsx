import { useId, useState } from 'react';
import type { Link, LinkRef } from '../../../application';

interface Props {
  readonly alphabet: readonly string[];
  /** États déjà placés sur le canevas (les seuls entre lesquels on peut créer une liaison au clavier). */
  readonly placed: readonly string[];
  readonly selected: Link | null;
  readonly onToggleSymbol: (link: LinkRef, symbol: string) => void;
  readonly onRemoveLink: (link: LinkRef) => void;
  readonly onCreateLink: (from: string, to: string) => void;
}

export function LinkInspector({ alphabet, placed, selected, onToggleSymbol, onRemoveLink, onCreateLink }: Props) {
  return (
    <section className="card">
      <h2>Liaison</h2>
      {selected === null ? (
        <p className="hint">Clique sur une flèche pour modifier ses symboles.</p>
      ) : (
        <>
          <p>
            <code>{selected.from}</code> → <code>{selected.to}</code>
          </p>
          <p className="hint">Clique sur un symbole pour l'ajouter ou le retirer :</p>
          <div className="toggles">
            {alphabet.map((symbol) => (
              <button
                key={symbol}
                type="button"
                className="toggle mono"
                aria-pressed={selected.symbols.includes(symbol)}
                onClick={() => onToggleSymbol(selected, symbol)}
              >
                {symbol}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onRemoveLink(selected)}>
            Supprimer la liaison
          </button>
        </>
      )}
      <NewLinkForm placed={placed} onCreate={onCreateLink} />
    </section>
  );
}

function NewLinkForm({
  placed,
  onCreate,
}: {
  readonly placed: readonly string[];
  readonly onCreate: (from: string, to: string) => void;
}) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const fromSelectId = useId();
  const toSelectId = useId();
  const from = placed.includes(fromId) ? fromId : (placed[0] ?? '');
  const to = placed.includes(toId) ? toId : (placed[0] ?? '');

  return (
    <div className="new-link">
      <h3>Nouvelle liaison</h3>
      <div className="row">
        <label htmlFor={fromSelectId}>De</label>
        <select id={fromSelectId} value={from} onChange={(event) => setFromId(event.target.value)}>
          {placed.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <label htmlFor={toSelectId}>vers</label>
        <select id={toSelectId} value={to} onChange={(event) => setToId(event.target.value)}>
          {placed.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>
      <button type="button" disabled={placed.length === 0} onClick={() => onCreate(from, to)}>
        Créer la liaison
      </button>
      {placed.length === 0 && <p className="hint">Place d'abord au moins un état.</p>}
    </div>
  );
}
