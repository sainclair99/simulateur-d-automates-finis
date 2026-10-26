import type { TapeCell } from '../../../application';

/** Le mot, symbole par symbole : lus, prochain à lire, restants, et symbole fautif en cas de rejet. */
export function Tape({ cells }: { readonly cells: readonly TapeCell[] }) {
  if (cells.length === 0) {
    return <p className="hint">Mot vide (ε) : rien à lire.</p>;
  }
  return (
    <ol className="tape" aria-label="Mot en cours de lecture">
      {cells.map((cell, index) => (
        <li key={index} className={`cell cell--${cell.status}`}>
          {cell.symbol === ' ' ? '␣' : cell.symbol}
        </li>
      ))}
    </ol>
  );
}
