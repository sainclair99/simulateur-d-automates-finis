import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

/** Affiche l'erreur au lieu d'un écran blanc quand un composant plante pendant le rendu. */
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  override render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return (
      <main className="screen">
        <h1>Une erreur est survenue</h1>
        <p className="error">{error.message}</p>
        <details>
          <summary>Détails techniques</summary>
          <pre className="trace">{error.stack}</pre>
        </details>
        <button type="button" onClick={() => window.location.reload()}>
          Recharger l'application
        </button>
      </main>
    );
  }
}
