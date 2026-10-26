import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton } from '../core/endsWithAb.fixture';
import { runWord } from './RunWord';

const dfa = buildEndsWithAbAutomaton();

describe('SimulationPlayback : navigation', () => {
  it('démarre sur la configuration initiale, sans verdict', () => {
    const playback = runWord(dfa, 'ab');
    expect(playback.isAtStart).toBe(true);
    expect(playback.isAtEnd).toBe(false);
    expect(playback.verdict).toBe(null);
    expect(playback.readSymbols).toEqual([]);
    expect(playback.remainingSymbols).toEqual(['a', 'b']);
  });

  it('avance et recule pas à pas, sans dépasser les bornes', () => {
    const start = runWord(dfa, 'ab');
    const one = start.next();
    expect(one.cursor).toBe(1);
    expect(one.readSymbols).toEqual(['a']);
    expect(one.previous().cursor).toBe(0);
    expect(start.previous()).toBe(start);
    const end = start.toEnd();
    expect(end.cursor).toBe(2);
    expect(end.next()).toBe(end);
    expect(end.toStart().cursor).toBe(0);
  });

  it('est immuable : next() ne modifie pas l’instance d’origine', () => {
    const start = runWord(dfa, 'ab');
    start.next();
    expect(start.cursor).toBe(0);
  });

  it('gère le mot vide : début et fin coïncident', () => {
    const playback = runWord(dfa, '');
    expect(playback.isAtStart).toBe(true);
    expect(playback.isAtEnd).toBe(true);
    expect(playback.verdict).toBe('rejected');
  });
});

describe('SimulationPlayback : couleurs des états', () => {
  it('met en évidence l’état courant pendant la lecture', () => {
    const playback = runWord(dfa, 'ab').next();
    expect(playback.visualOf('q1')).toBe('active');
    expect(playback.visualOf('q0')).toBe('idle');
    expect(playback.verdict).toBe(null);
  });

  it('passe l’état final en vert quand le mot est accepté', () => {
    const end = runWord(dfa, 'ab').toEnd();
    expect(end.verdict).toBe('accepted');
    expect(end.visualOf('q2')).toBe('accepted');
    expect(end.visualOf('q0')).toBe('idle');
  });

  it('passe l’état d’arrêt en rouge quand le mot est rejeté', () => {
    const end = runWord(dfa, 'abb').toEnd();
    expect(end.verdict).toBe('rejected');
    expect(end.visualOf('q0')).toBe('rejected');
    expect(end.visualOf('q2')).toBe('idle');
  });

  it('passe en rouge même si l’arrêt a lieu sur un état final (symbole invalide)', () => {
    const end = runWord(dfa, 'abc').toEnd();
    expect(end.verdict).toBe('rejected');
    expect(end.visualOf('q2')).toBe('rejected');
  });

  it('automate non déterministe : seul l’état final atteint est vert', () => {
    const end = runWord(buildNfaEndsWithAbAutomaton(), 'aab').toEnd();
    expect(end.verdict).toBe('accepted');
    expect(end.visualOf('q2')).toBe('accepted');
    expect(end.visualOf('q0')).toBe('idle');
  });
});

describe('SimulationPlayback : ruban et accès direct', () => {
  const statuses = (playback: ReturnType<typeof runWord>): string[] => playback.tape.map((cell) => cell.status);

  it('marque la case courante puis les cases lues', () => {
    const start = runWord(dfa, 'ab');
    expect(statuses(start)).toEqual(['current', 'pending']);
    expect(statuses(start.next())).toEqual(['read', 'current']);
    expect(statuses(start.toEnd())).toEqual(['read', 'read']);
    expect(start.tape.map((cell) => cell.symbol)).toEqual(['a', 'b']);
  });

  it('marque le symbole fautif à la fin, les suivants restent non lus', () => {
    const end = runWord(dfa, 'abcab').toEnd();
    expect(statuses(end)).toEqual(['read', 'read', 'failed', 'pending', 'pending']);
  });

  it('marque le symbole bloquant d’une lecture sans transition', () => {
    const blocked = dfa.withoutTransition({ from: 'q1', to: 'q2', symbol: 'b' });
    expect(statuses(runWord(blocked, 'ab').toEnd())).toEqual(['read', 'failed']);
  });

  it('a un ruban vide pour le mot vide', () => {
    expect(runWord(dfa, '').tape).toEqual([]);
  });

  it('se place directement sur un pas, borné à la trace', () => {
    const playback = runWord(dfa, 'abab');
    expect(playback.goTo(2).cursor).toBe(2);
    expect(playback.goTo(99).cursor).toBe(4);
    expect(playback.goTo(-5).cursor).toBe(0);
    expect(playback.lastIndex).toBe(4);
  });
});
