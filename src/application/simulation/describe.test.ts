import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, buildNfaEndsWithAbAutomaton } from '../../core/endsWithAb.fixture';
import { runWord } from '../RunWord';
import { describeStep, describeVerdict } from './describe';

const dfa = buildEndsWithAbAutomaton();
const end = (word: string, automaton = dfa) => runWord(automaton, word).toEnd();

describe('describeVerdict', () => {
  it('ne donne aucun verdict avant la fin de la lecture', () => {
    expect(describeVerdict(runWord(dfa, 'ab'))).toBe(null);
    expect(describeVerdict(runWord(dfa, 'ab').next())).toBe(null);
  });

  it('décrit un mot accepté', () => {
    const verdict = describeVerdict(end('ab'));
    expect(verdict?.accepted).toBe(true);
    expect(verdict?.title).toBe('Mot accepté');
    expect(verdict?.detail).toBe("Le mot est lu en entier et l'automate s'arrête sur l'état final q2.");
  });

  it('décrit un mot lu en entier mais rejeté', () => {
    const verdict = describeVerdict(end('abb'));
    expect(verdict?.accepted).toBe(false);
    expect(verdict?.detail).toBe("Le mot est lu en entier mais l'automate s'arrête sur l'état q0, qui n'est pas final.");
  });

  it('décrit le rejet du mot vide', () => {
    expect(describeVerdict(end(''))?.detail).toBe("Le mot vide est rejeté : l'état initial q0 n'est pas final.");
  });

  it('décrit une lecture bloquée', () => {
    const blocked = dfa.withoutTransition({ from: 'q1', to: 'q2', symbol: 'b' });
    expect(describeVerdict(end('ab', blocked))?.detail).toBe(
      "Lecture bloquée à la position 2 : aucune transition depuis l'état q1 sur le symbole « b ».",
    );
  });

  it('décrit un symbole hors alphabet', () => {
    expect(describeVerdict(end('abc'))?.detail).toBe(
      "Le symbole « c » (position 3) n'appartient pas à l'alphabet.",
    );
  });

  it('accorde le texte quand plusieurs états sont en jeu (automate non déterministe)', () => {
    const nfa = buildNfaEndsWithAbAutomaton();
    expect(describeVerdict(end('aab', nfa))?.detail).toContain("l'état final q2");
    expect(describeVerdict(end('aba', nfa))?.detail).toBe(
      "Le mot est lu en entier mais l'automate s'arrête sur les états q0, q1, dont aucun n'est final.",
    );
  });
});

describe('describeStep', () => {
  it('décrit le départ puis chaque symbole lu', () => {
    const playback = runWord(dfa, 'ab');
    expect(describeStep(playback)).toBe("Départ : l'automate est dans l'état q0.");
    expect(describeStep(playback.next())).toBe('Lit « a » (1 sur 2) : q0 → q1.');
    expect(describeStep(playback.toEnd())).toBe('Lit « b » (2 sur 2) : q1 → q2.');
  });

  it('liste toutes les transitions empruntées en non déterministe', () => {
    const playback = runWord(buildNfaEndsWithAbAutomaton(), 'a').next();
    expect(describeStep(playback)).toBe('Lit « a » (1 sur 1) : q0 → q0, q0 → q1.');
  });
});
