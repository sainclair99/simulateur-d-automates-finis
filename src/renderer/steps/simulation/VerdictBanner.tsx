import type { AgreementView, VerdictView } from '../../../application';

interface Props {
  readonly verdict: VerdictView | null;
  readonly agreement: AgreementView | null;
}

/** Verdict affiché uniquement à la fin de la lecture : vert si accepté, rouge sinon (et texte, pas seulement la couleur). */
export function VerdictBanner({ verdict, agreement }: Props) {
  if (verdict === null) {
    return <p className="hint">Le verdict s'affichera à la fin de la lecture.</p>;
  }
  return (
    <>
      <div role="status" className={`verdict ${verdict.accepted ? 'verdict--accepted' : 'verdict--rejected'}`}>
        <strong>
          {verdict.accepted ? '✓' : '✗'} {verdict.title}
        </strong>
        <p>{verdict.detail}</p>
      </div>
      {agreement !== null && (
        <p className={`agreement ${agreement.agrees ? 'agreement--ok' : 'agreement--ko'}`}>
          {agreement.agrees ? '✓' : '⚠'} {agreement.text}
        </p>
      )}
    </>
  );
}
