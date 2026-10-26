import { useEffect, useState } from 'react';
import { Verification } from '../../application';
import type { ConstructionHistory, ConstructionState, LanguageDefinition, LinkRef } from '../../application';
import { AutomatonCanvas } from '../canvas/AutomatonCanvas';
import type { DragPayload } from '../canvas/dragPayload';
import { DiagnosticsPanel } from './construction/DiagnosticsPanel';
import { LinkInspector } from './construction/LinkInspector';
import { ConversionPanel } from './construction/ConversionPanel';
import type { ConversionNotice } from './construction/ConversionPanel';
import { Palette } from './construction/Palette';
import { VerificationPanel } from './construction/VerificationPanel';

interface Props {
  readonly definition: LanguageDefinition;
  readonly history: ConstructionHistory;
  readonly onHistoryChange: (history: ConstructionHistory) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  /** Ouvre la simulation et y lance ce mot (utilisé pour rejouer un contre-exemple). */
  readonly onTestWord: (word: string) => void;
  /** Remplace le projet par l'AFD équivalent ; renvoie le message à afficher. */
  readonly onConvertToDfa: (complete: boolean) => ConversionNotice;
  readonly canRevertConversion: boolean;
  readonly onRevertConversion: () => void;
}

export function ConstructionStep({
  definition,
  history,
  onHistoryChange,
  onBack,
  onContinue,
  onTestWord,
  onConvertToDfa,
  canRevertConversion,
  onRevertConversion,
}: Props) {
  const [dragged, setDragged] = useState<DragPayload | null>(null);
  const [selection, setSelection] = useState<LinkRef | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [conversionNotice, setConversionNotice] = useState<ConversionNotice | null>(null);
  const present = history.present;

  const selectedLink =
    selection === null
      ? null
      : (present.links.find((link) => link.from === selection.from && link.to === selection.to) ?? null);

  /** Toute modification passe par l'historique ; une règle du domaine violée devient un message. */
  const edit = (change: (state: ConstructionState) => ConstructionState) => {
    const result = history.edit(change);
    setNotice(result.error);
    if (result.history !== history) setConversionNotice(null);
    if (result.history !== history) onHistoryChange(result.history);
  };

  const undo = () => {
    setNotice(null);
    onHistoryChange(history.undo());
  };
  const redo = () => {
    setNotice(null);
    onHistoryChange(history.redo());
  };

  // Raccourcis : Ctrl/Cmd+Z annuler, Ctrl/Cmd+Y ou Ctrl/Cmd+Maj+Z rétablir.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        setNotice(null);
        onHistoryChange(history.undo());
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        setNotice(null);
        onHistoryChange(history.redo());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history, onHistoryChange]);

  const handleContinue = () => {
    onHistoryChange(history.commit(present.completeLayout()));
    onContinue();
  };

  const handleTestWord = (word: string) => {
    onHistoryChange(history.commit(present.completeLayout()));
    onTestWord(word);
  };

  return (
    <main className="screen screen--wide">
      <header className="step-header">
        <div>
          <h1>2. Construction de l'automate</h1>
          <p className="hint">
            Langage : <code>{definition.regexSource}</code>
          </p>
        </div>
        <div className="toolbar">
          <button type="button" onClick={onBack}>
            ← Définition
          </button>
          <button type="button" onClick={undo} disabled={!history.canUndo}>
            Annuler
          </button>
          <button type="button" onClick={redo} disabled={!history.canRedo}>
            Rétablir
          </button>
          <button type="button" className="primary" onClick={handleContinue}>
            Continuer vers la simulation →
          </button>
        </div>
      </header>

      <p className="error notice" role="status">
        {notice}
      </p>

      <div className="workspace">
        <Palette
          unplaced={present.unplacedStates}
          alphabet={definition.alphabet.toArray()}
          onDragStart={setDragged}
          onDragEnd={() => setDragged(null)}
          onAutoLayout={() => edit((state) => state.autoLayout())}
        />

        <div className="canvas-wrap">
          <AutomatonCanvas
            nodes={present.placedStates}
            links={present.links}
            selectedLink={selection}
            dragged={dragged}
            onSelectLink={setSelection}
            onMoveState={(id, point) => edit((state) => state.placeState(id, point))}
            onDropState={(id, point) => {
              setDragged(null);
              edit((state) => state.placeState(id, point));
            }}
            onCreateLink={(from, point) => {
              const target = present.stateAt(point);
              if (target === null) return;
              setSelection({ from, to: target });
              edit((state) => state.addLink(from, target));
            }}
            onDropSymbolOnLink={(link, symbol) => {
              setDragged(null);
              setSelection(link);
              edit((state) => state.addSymbol(link.from, link.to, symbol));
            }}
            onDropSymbolOnState={(id, symbol) => {
              setDragged(null);
              setSelection({ from: id, to: id });
              edit((state) => state.addSymbol(id, id, symbol));
            }}
          />
        </div>

        <aside className="side" aria-label="Inspecteur">
          <LinkInspector
            alphabet={definition.alphabet.toArray()}
            placed={present.placedStates.map((placed) => placed.id)}
            selected={selectedLink}
            onToggleSymbol={(link, symbol) => edit((state) => state.toggleSymbol(link.from, link.to, symbol))}
            onRemoveLink={(link) => {
              setSelection(null);
              edit((state) => state.removeLink(link.from, link.to));
            }}
            onCreateLink={(from, to) => {
              setSelection({ from, to });
              edit((state) => state.addLink(from, to));
            }}
          />
          <ConversionPanel
            deterministic={present.isDeterministic}
            canRevert={canRevertConversion}
            notice={conversionNotice}
            onConvert={(complete) => setConversionNotice(onConvertToDfa(complete))}
            onRevert={() => {
              setConversionNotice(null);
              onRevertConversion();
            }}
          />
          <VerificationPanel
            verification={verification}
            construction={present}
            onVerify={() => setVerification(Verification.run(definition, present))}
            onTestWord={handleTestWord}
          />
          <DiagnosticsPanel diagnostics={present.diagnostics()} />
        </aside>
      </div>
    </main>
  );
}
