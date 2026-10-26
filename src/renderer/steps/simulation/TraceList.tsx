import type { SimulationPlayback } from '../../../application';

interface Props {
  readonly playback: SimulationPlayback;
  readonly onGoTo: (index: number) => void;
}

/** Trace complète de la lecture ; cliquer sur une ligne s'y place. */
export function TraceList({ playback, onGoTo }: Props) {
  return (
    <section className="card">
      <h2>Trace</h2>
      <ol className="trace-list">
        {playback.result.steps.map((step, index) => {
          const label = step.symbol === null ? 'Départ' : `« ${step.symbol} »`;
          const classes = ['trace-item', index === playback.cursor ? 'trace-item--current' : '', index > playback.cursor ? 'trace-item--future' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <li key={step.index}>
              <button
                type="button"
                className={classes}
                aria-current={index === playback.cursor ? 'step' : undefined}
                onClick={() => onGoTo(index)}
              >
                <span>{label}</span>
                <span className="mono">→ {step.activeStates.join(', ')}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
