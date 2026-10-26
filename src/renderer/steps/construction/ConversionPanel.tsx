import { useState } from 'react';

export interface ConversionNotice {
  readonly kind: 'info' | 'error';
  readonly text: string;
}

interface Props {
  readonly deterministic: boolean;
  /** Vrai tant que l'AFD obtenu n'a pas été modifié : on peut alors revenir à l'AFN d'origine. */
  readonly canRevert: boolean;
  readonly notice: ConversionNotice | null;
  readonly onConvert: (complete: boolean) => void;
  readonly onRevert: () => void;
}

export function ConversionPanel({ deterministic, canRevert, notice, onConvert, onRevert }: Props) {
  const [complete, setComplete] = useState(false);

  return (
    <section className="card conversion">
      <h2>Déterminisation</h2>
      {deterministic ? (
        <p className="ok">L'automate est un AFD : aucun état n'a plusieurs transitions pour un même symbole.</p>
      ) : (
        <>
          <p className="hint">
            L'automate est un <strong>AFN</strong> : au moins un état a plusieurs transitions pour un même symbole. Tu peux le
            convertir en AFD équivalent (construction par sous-ensembles).
          </p>
          <label className="checkbox">
            <input type="checkbox" checked={complete} onChange={(event) => setComplete(event.target.checked)} />
            Ajouter un état puits ∅ (AFD complet)
          </label>
          <button type="button" onClick={() => onConvert(complete)}>
            Convertir en AFD
          </button>
        </>
      )}
      {canRevert && (
        <button type="button" onClick={onRevert}>
          ↶ Revenir à l'AFN
        </button>
      )}
      {notice !== null && (
        <p role="status" className={`notice-text ${notice.kind === 'error' ? 'error' : 'hint'}`}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
