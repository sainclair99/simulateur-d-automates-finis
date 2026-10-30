import type { TestReport, TestWordSet } from '../../../application';

interface Props {
  readonly words: TestWordSet;
  readonly report: TestReport | null;
  readonly onRunWord: (word: string) => void;
  readonly onTestAll: () => void;
}

const label = (word: string): string => (word === '' ? 'ε' : word);

function WordGroup({
  title,
  words,
  agrees,
  onRunWord,
}: {
  readonly title: string;
  readonly words: readonly string[];
  readonly agrees: (word: string) => boolean | null;
  readonly onRunWord: (word: string) => void;
}) {
  return (
    <div className="test-group">
      <h3>{title}</h3>
      {words.length === 0 ? (
        <p className="hint">Aucun mot trouvé parmi les plus courts.</p>
      ) : (
        <ul className="test-words" aria-label={title}>
          {words.map((word) => {
            const verdict = agrees(word);
            const mark = verdict === null ? '' : verdict ? '✓ ' : '✗ ';
            const state = verdict === null ? '' : verdict ? ' (conforme)' : ' (écart)';
            return (
              <li key={word === '' ? 'ε' : word}>
                <button
                  type="button"
                  className={`test-chip mono${verdict === null ? '' : verdict ? ' test-chip--ok' : ' test-chip--ko'}`}
                  onClick={() => onRunWord(word)}
                  aria-label={`${word === '' ? 'Le mot vide' : `Le mot ${word}`}${state}`}
                  title="Simuler ce mot"
                >
                  {mark}
                  {label(word)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Mots de test tirés de la regex : un clic les simule ; « Tout tester » les confronte à l'automate. */
export function TestWordsPanel({ words, report, onRunWord, onTestAll }: Props) {
  const outcome = new Map(report?.results.map((result) => [result.word, result.expected === result.actual]));
  const agrees = (word: string): boolean | null => (report === null ? null : (outcome.get(word) ?? null));

  return (
    <section className="card">
      <h2>Mots de test</h2>
      <p className="hint">
        Les plus courts mots que la regex accepte et rejette. Clique sur un mot pour le simuler, ou teste-les tous d'un coup.
      </p>
      <WordGroup title="Acceptés par la regex" words={words.accepted} agrees={agrees} onRunWord={onRunWord} />
      <WordGroup title="Rejetés par la regex" words={words.rejected} agrees={agrees} onRunWord={onRunWord} />
      <button type="button" onClick={onTestAll}>
        Tout tester
      </button>

      {report !== null && (
        <div role="status" className={`check ${report.failures.length === 0 ? 'check--equivalent' : 'check--different'}`}>
          <strong>
            {report.failures.length === 0 ? '✓' : '✗'} {report.summary}
          </strong>
          {report.failures.length === 0 && report.total > 0 && (
            <p className="hint">
              Ces mots ne couvrent pas tous les cas : la « Vérification » de l'écran de Construction compare l'automate à la
              regex sur tous les mots possibles.
            </p>
          )}
          {report.failures.length > 0 && (
            <ul className="failures">
              {report.failures.map((failure) => (
                <li key={failure.word === '' ? 'ε' : failure.word}>
                  <button type="button" className="link-button mono" onClick={() => onRunWord(failure.word)}>
                    {label(failure.word)}
                  </button>{' '}
                  {failure.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
