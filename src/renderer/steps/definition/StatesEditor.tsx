import type { StateDraft } from '../../../application';

interface Props {
  readonly states: readonly StateDraft[];
  readonly rowErrors: Readonly<Record<number, string>>;
  readonly error: string | null;
  readonly onAdd: () => void;
  readonly onRemove: (key: number) => void;
  readonly onRename: (key: number, name: string) => void;
  readonly onSelectInitial: (key: number) => void;
  readonly onToggleFinal: (key: number) => void;
}

function roleOf(state: StateDraft): string {
  if (state.isInitial && state.isFinal) return 'Initial et final';
  if (state.isInitial) return 'Initial';
  if (state.isFinal) return 'Final';
  return 'Intermédiaire';
}

export function StatesEditor({
  states,
  rowErrors,
  error,
  onAdd,
  onRemove,
  onRename,
  onSelectInitial,
  onToggleFinal,
}: Props) {
  return (
    <section className="card">
      <h2>États</h2>
      <p className="hint">
        Un seul état initial, au moins un état final. Un état ni initial ni final est intermédiaire.
      </p>
      <table className="states">
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Initial</th>
            <th scope="col">Final</th>
            <th scope="col">Rôle</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const label = state.name.trim() === '' ? `n° ${index + 1}` : state.name.trim();
            const rowError = rowErrors[state.key];
            return (
              <tr key={state.key}>
                <td>
                  <input
                    className="mono"
                    value={state.name}
                    onChange={(event) => onRename(state.key, event.target.value)}
                    aria-label={`Nom de l'état ${index + 1}`}
                    aria-invalid={rowError !== undefined}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {rowError !== undefined && <p className="error">{rowError}</p>}
                </td>
                <td>
                  <input
                    type="radio"
                    name="initial-state"
                    checked={state.isInitial}
                    onChange={() => onSelectInitial(state.key)}
                    aria-label={`${label} est l'état initial`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={state.isFinal}
                    onChange={() => onToggleFinal(state.key)}
                    aria-label={`${label} est un état final`}
                  />
                </td>
                <td>{roleOf(state)}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(state.key)}
                    disabled={states.length === 1}
                    aria-label={`Supprimer l'état ${label}`}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {error !== null && <p className="error">{error}</p>}
      <button type="button" onClick={onAdd}>
        + Ajouter un état
      </button>
    </section>
  );
}
