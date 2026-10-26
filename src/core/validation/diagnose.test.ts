import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, endsWithAbDefinition } from '../endsWithAb.fixture';
import { diagnose } from './diagnose';

describe('diagnose', () => {
  it('ne signale rien sur un AFD complet et cohérent', () => {
    expect(diagnose(buildEndsWithAbAutomaton())).toEqual([]);
  });

  it('signale tout sur un automate sans transition', () => {
    const codes = diagnose(endsWithAbDefinition().createAutomaton()).map((d) => d.code);
    expect(codes).toEqual([
      'UNREACHABLE_STATE',
      'UNREACHABLE_STATE',
      'NO_REACHABLE_FINAL_STATE',
      'MISSING_TRANSITION',
      'MISSING_TRANSITION',
    ]);
  });

  it('signale le non-déterminisme avec l’état et le symbole concernés', () => {
    const automaton = buildEndsWithAbAutomaton().withTransition({ from: 'q0', to: 'q0', symbol: 'a' });
    const diagnostics = diagnose(automaton);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('NON_DETERMINISTIC');
    expect(diagnostics[0]?.stateId).toBe('q0');
    expect(diagnostics[0]?.symbol).toBe('a');
  });

  it('signale une transition manquante comme simple information', () => {
    const automaton = buildEndsWithAbAutomaton().withoutTransition({ from: 'q2', to: 'q0', symbol: 'b' });
    const diagnostics = diagnose(automaton);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('MISSING_TRANSITION');
    expect(diagnostics[0]?.severity).toBe('info');
    expect(diagnostics[0]?.stateId).toBe('q2');
    expect(diagnostics[0]?.symbol).toBe('b');
  });
});
