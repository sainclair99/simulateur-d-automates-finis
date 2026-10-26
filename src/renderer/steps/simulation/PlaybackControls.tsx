import type { SimulationPlayback } from '../../../application';

export interface SpeedOption {
  readonly label: string;
  readonly ms: number;
}

interface Props {
  readonly playback: SimulationPlayback;
  readonly playing: boolean;
  readonly speed: number;
  readonly speeds: readonly SpeedOption[];
  readonly onToStart: () => void;
  readonly onPrevious: () => void;
  readonly onTogglePlay: () => void;
  readonly onNext: () => void;
  readonly onToEnd: () => void;
  readonly onSpeedChange: (ms: number) => void;
}

export function PlaybackControls({
  playback,
  playing,
  speed,
  speeds,
  onToStart,
  onPrevious,
  onTogglePlay,
  onNext,
  onToEnd,
  onSpeedChange,
}: Props) {
  return (
    <section className="card" aria-label="Lecture">
      <h2>Lecture</h2>
      <p className="hint">
        Étape {playback.cursor} sur {playback.lastIndex}
      </p>
      <div className="controls">
        <button type="button" onClick={onToStart} disabled={playback.isAtStart}>
          ⏮ Début
        </button>
        <button type="button" onClick={onPrevious} disabled={playback.isAtStart}>
          ◀ Précédent
        </button>
        <button type="button" className="primary" onClick={onTogglePlay}>
          {playing ? '⏸ Pause' : '▶ Lecture'}
        </button>
        <button type="button" onClick={onNext} disabled={playback.isAtEnd}>
          Suivant ▶
        </button>
        <button type="button" onClick={onToEnd} disabled={playback.isAtEnd}>
          Fin ⏭
        </button>
      </div>
      <div className="row speed">
        <label htmlFor="speed-select">Vitesse</label>
        <select id="speed-select" value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))}>
          {speeds.map((option) => (
            <option key={option.ms} value={option.ms}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
