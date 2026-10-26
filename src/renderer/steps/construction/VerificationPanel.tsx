import type { ConstructionState, Verification } from '../../../application';

interface Props {
  readonly verification: Verification | null;
  readonly construction: ConstructionState;
  readonly onVerify: () => void;
  readonly onTestWord: (word: string) => void;
}

export function VerificationPanel({ verification, construction, onVerify, onTestWord }: Props) {
  const current = verification !== null && verification.appliesTo(construction);
  const view = verification !== null && current ? verification.view : null;

  return (
    <section className="card">
      <h2>Vérification</h2>
      <p className="hint">Compare l'automate au langage de la regex et cherche le plus petit mot qui les distingue.</p>
      <button type="button" onClick={onVerify}>
        {verification === null ? "Vérifier l'automate" : 'Vérifier à nouveau'}
      </button>

      {verification !== null && !current && (
        <p className="hint">L'automate a changé depuis la dernière vérification.</p>
      )}

      {view !== null && (
        <div role="status" className={`check check--${view.status}`}>
          <strong>
            {view.status === 'equivalent' ? '✓' : view.status === 'different' ? '✗' : '?'} {view.title}
          </strong>
          <p>{view.detail}</p>
          {view.counterexample !== null && (
            <button type="button" onClick={() => onTestWord(view.counterexample ?? '')}>
              Tester ce mot en simulation →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
