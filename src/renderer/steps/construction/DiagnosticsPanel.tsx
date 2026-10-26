import type { Diagnostic } from '../../../application';

export function DiagnosticsPanel({ diagnostics }: { readonly diagnostics: readonly Diagnostic[] }) {
  return (
    <section className="card">
      <h2>Diagnostic</h2>
      {diagnostics.length === 0 ? (
        <p className="ok">Aucun problème détecté.</p>
      ) : (
        <ul className="diagnostics">
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${diagnostic.stateId ?? ''}-${diagnostic.symbol ?? ''}-${index}`}>
              <strong className={`diag diag--${diagnostic.severity}`}>
                {diagnostic.severity === 'warning' ? 'Attention' : 'Info'}
              </strong>{' '}
              {diagnostic.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
