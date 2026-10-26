import type { Automaton } from '../model/Automaton';
import type { StateId } from '../model/State';

export type DiagnosticSeverity = 'warning' | 'info';

export type DiagnosticCode =
  | 'UNREACHABLE_STATE'
  | 'NO_REACHABLE_FINAL_STATE'
  | 'NON_DETERMINISTIC'
  | 'MISSING_TRANSITION';

export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly stateId?: StateId;
  readonly symbol?: string;
}

/** Aide à la construction : ne bloque jamais, signale seulement ce qui mérite l'attention. */
export function diagnose(automaton: Automaton): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const reachable = automaton.reachableStates();

  for (const state of automaton.states) {
    if (!reachable.has(state.id)) {
      diagnostics.push({
        code: 'UNREACHABLE_STATE',
        severity: 'warning',
        stateId: state.id,
        message: `L'état « ${state.id} » est inaccessible depuis l'état initial`,
      });
    }
  }

  if (!automaton.finalStates.some((id) => reachable.has(id))) {
    diagnostics.push({
      code: 'NO_REACHABLE_FINAL_STATE',
      severity: 'warning',
      message: "Aucun état final n'est accessible : l'automate n'accepte aucun mot",
    });
  }

  for (const state of automaton.states) {
    if (!reachable.has(state.id)) continue;
    for (const symbol of automaton.alphabet.toArray()) {
      const targets = automaton.next(state.id, symbol);
      if (targets.length > 1) {
        diagnostics.push({
          code: 'NON_DETERMINISTIC',
          severity: 'warning',
          stateId: state.id,
          symbol,
          message: `Depuis « ${state.id} », le symbole « ${symbol} » mène à plusieurs états (${targets.join(', ')})`,
        });
      } else if (targets.length === 0) {
        diagnostics.push({
          code: 'MISSING_TRANSITION',
          severity: 'info',
          stateId: state.id,
          symbol,
          message: `Aucune transition depuis « ${state.id} » sur « ${symbol} » : le mot sera rejeté si ce cas se présente`,
        });
      }
    }
  }
  return diagnostics;
}
