import { describe, expect, it } from 'vitest';
import { buildEndsWithAbAutomaton, endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { runWord } from '../RunWord';
import { describeAgreement } from './agreement';

const definition = endsWithAbDefinition();
const dfa = buildEndsWithAbAutomaton();

describe('describeAgreement', () => {
  it('ne révèle rien avant la fin de la lecture', () => {
    expect(describeAgreement(definition, runWord(dfa, 'ab'))).toBe(null);
  });

  it('confirme un mot accepté par les deux', () => {
    expect(describeAgreement(definition, runWord(dfa, 'ab').toEnd())).toEqual({
      agrees: true,
      text: 'La regex confirme : ce mot appartient au langage.',
    });
  });

  it('confirme un mot rejeté par les deux (y compris avec un symbole inconnu)', () => {
    expect(describeAgreement(definition, runWord(dfa, 'abb').toEnd())?.agrees).toBe(true);
    expect(describeAgreement(definition, runWord(dfa, 'abc').toEnd())?.text).toBe(
      "La regex confirme : ce mot n'appartient pas au langage.",
    );
  });

  it('signale un désaccord : la regex accepte, l’automate rejette', () => {
    const broken = dfa.withoutTransition({ from: 'q2', to: 'q0', symbol: 'b' });
    expect(describeAgreement(definition, runWord(broken, 'abbab').toEnd())).toEqual({
      agrees: false,
      text: "La regex n'est pas d'accord : ce mot appartient au langage, mais l'automate le rejette.",
    });
  });

  it('signale un désaccord : l’automate accepte, la regex rejette', () => {
    const tooMuch = dfa.withTransition({ from: 'q0', to: 'q2', symbol: 'a' });
    expect(describeAgreement(definition, runWord(tooMuch, 'a').toEnd())?.text).toBe(
      "La regex n'est pas d'accord : ce mot n'appartient pas au langage, mais l'automate l'accepte.",
    );
  });
});
