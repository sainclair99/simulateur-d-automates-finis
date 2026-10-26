import { useEffect, useState } from 'react';
import { describeAgreement, describeStep, describeVerdict, runWord } from '../../application';
import type { ConstructionState, LanguageDefinition, SimulationPlayback } from '../../application';
import { AutomatonCanvas } from '../canvas/AutomatonCanvas';
import { PlaybackControls } from './simulation/PlaybackControls';
import type { SpeedOption } from './simulation/PlaybackControls';
import { Tape } from './simulation/Tape';
import { TraceList } from './simulation/TraceList';
import { VerdictBanner } from './simulation/VerdictBanner';
import { WordForm } from './simulation/WordForm';

const SPEEDS: readonly SpeedOption[] = [
  { label: 'Lente', ms: 1400 },
  { label: 'Normale', ms: 800 },
  { label: 'Rapide', ms: 350 },
];

interface Props {
  readonly definition: LanguageDefinition;
  readonly construction: ConstructionState;
  readonly onBack: () => void;
  /** Mot à lancer dès l'ouverture (contre-exemple venu de la vérification) ; null sinon. */
  readonly initialWord: string | null;
}

export function SimulationStep({ definition, construction, onBack, initialWord }: Props) {
  const [word, setWord] = useState(initialWord ?? '');
  const [playback, setPlayback] = useState<SimulationPlayback | null>(() =>
    initialWord === null ? null : runWord(construction.automaton, initialWord),
  );
  const [playing, setPlaying] = useState(initialWord !== null);
  const [speed, setSpeed] = useState(800);

  // Lecture automatique : un pas après l'autre, arrêt à la fin de la trace.
  useEffect(() => {
    if (!playing || playback === null) return undefined;
    if (playback.isAtEnd) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setPlayback(playback.next()), speed);
    return () => window.clearTimeout(timer);
  }, [playing, playback, speed]);

  // Flèches gauche / droite : pas précédent / suivant (hors champs de saisie).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (playback === null) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPlaying(false);
        setPlayback(playback.next());
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPlaying(false);
        setPlayback(playback.previous());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playback]);

  const run = () => {
    setPlayback(runWord(construction.automaton, word));
    setPlaying(true);
  };

  const manual = (change: (current: SimulationPlayback) => SimulationPlayback) => {
    if (playback === null) return;
    setPlaying(false);
    setPlayback(change(playback));
  };

  const togglePlay = () => {
    if (playback === null) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (playback.isAtEnd) setPlayback(playback.toStart());
    setPlaying(true);
  };

  const activeLinks = playback === null ? [] : playback.step.firedTransitions.map(({ from, to }) => ({ from, to }));

  return (
    <main className="screen screen--wide">
      <header className="step-header">
        <div>
          <h1>3. Simulation</h1>
          <p className="hint">
            Langage : <code>{definition.regexSource}</code>
          </p>
        </div>
        <div className="toolbar">
          <button type="button" onClick={onBack}>
            ← Construction
          </button>
        </div>
      </header>

      <div className="sim-layout">
        <div>
          <div className="canvas-wrap">
            <AutomatonCanvas
              nodes={construction.placedStates}
              links={construction.links}
              visualOf={playback === null ? undefined : (id) => playback.visualOf(id)}
              activeLinks={activeLinks}
            />
          </div>
          <p className="step-description" aria-live="polite">
            {playback === null ? 'Saisis un mot puis clique sur « Lancer ».' : describeStep(playback)}
          </p>
        </div>

        <aside className="side" aria-label="Simulation">
          <WordForm word={word} alphabet={definition.alphabet.toArray()} onWordChange={setWord} onRun={run} />
          {playback !== null && (
            <>
              <section className="card">
                <h2>Mot</h2>
                <Tape cells={playback.tape} />
                <VerdictBanner
                  verdict={describeVerdict(playback)}
                  agreement={describeAgreement(definition, playback)}
                />
              </section>
              <PlaybackControls
                playback={playback}
                playing={playing}
                speed={speed}
                speeds={SPEEDS}
                onToStart={() => manual((current) => current.toStart())}
                onPrevious={() => manual((current) => current.previous())}
                onTogglePlay={togglePlay}
                onNext={() => manual((current) => current.next())}
                onToEnd={() => manual((current) => current.toEnd())}
                onSpeedChange={setSpeed}
              />
              <TraceList playback={playback} onGoTo={(index) => manual((current) => current.goTo(index))} />
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
