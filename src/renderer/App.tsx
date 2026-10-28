import { useEffect, useState } from 'react';
import {
  ConstructionHistory,
  convertToDfa,
  DefinitionDraft,
  isDirty,
  openProject,
  sameDefinition,
  saveProject,
} from '../application';
import type { ConstructionState, ImageFiles, ImageFormat, LanguageDefinition, ProjectFiles } from '../application';
import { exportAutomatonImage } from './export/exportImage';
import { FileBar } from './FileBar';
import type { FileStatus } from './FileBar';
import { ConstructionStep } from './steps/ConstructionStep';
import type { ConversionNotice } from './steps/construction/ConversionPanel';
import { DefinitionStep } from './steps/DefinitionStep';
import { SimulationStep } from './steps/SimulationStep';
import { installUnloadGuard } from './unloadGuard';

type Step = 'definition' | 'construction' | 'simulation';

const APP_TITLE = "Simulateur d'automates finis";

/** Ce qu'il faut pour revenir à l'AFN d'origine après une conversion. */
interface ConversionBackup {
  readonly definition: LanguageDefinition;
  readonly history: ConstructionHistory;
  readonly draft: DefinitionDraft;
  /** L'AFD produit : tant qu'il n'a pas été modifié, le retour à l'AFN est proposé. */
  readonly converted: ConstructionState;
}

/** Parcours : Définition → Construction → Simulation, avec ouverture / enregistrement de projets. */
export function App({ files, images }: { readonly files: ProjectFiles; readonly images: ImageFiles }) {
  const [step, setStep] = useState<Step>('definition');
  const [draft, setDraft] = useState(DefinitionDraft.empty());
  const [definition, setDefinition] = useState<LanguageDefinition | null>(null);
  const [history, setHistory] = useState<ConstructionHistory | null>(null);
  const [testWord, setTestWord] = useState<string | null>(null);
  const [conversionBackup, setConversionBackup] = useState<ConversionBackup | null>(null);
  // Fichier : nom courant, contenu au dernier enregistrement / ouverture, opération en cours, dernier message.
  const [fileName, setFileName] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FileStatus | null>(null);

  const hasProject = definition !== null && history !== null;
  const dirty = hasProject && isDirty(definition, history.present, savedSnapshot);

  const submitDefinition = (next: LanguageDefinition) => {
    // Une définition inchangée conserve le travail de construction déjà fait.
    if (definition === null || history === null || !sameDefinition(definition, next)) {
      setHistory(ConstructionHistory.start(next));
    }
    setDefinition(next);
    setStep('construction');
  };

  const canRevertConversion =
    conversionBackup !== null && history !== null && history.present === conversionBackup.converted;

  const convertToDeterministic = (complete: boolean): ConversionNotice => {
    if (definition === null || history === null) return { kind: 'error', text: 'Aucun projet à convertir.' };
    const outcome = convertToDfa(definition, history.present, { complete });
    if (outcome.kind === 'failed') return { kind: 'error', text: outcome.message };
    setConversionBackup({ definition, history, draft, converted: outcome.construction });
    setDraft(DefinitionDraft.fromDefinition(outcome.definition));
    setDefinition(outcome.definition);
    setHistory(ConstructionHistory.from(outcome.construction));
    return { kind: 'info', text: outcome.message };
  };

  const revertConversion = () => {
    if (conversionBackup === null) return;
    setDraft(conversionBackup.draft);
    setDefinition(conversionBackup.definition);
    setHistory(conversionBackup.history);
    setConversionBackup(null);
  };

  const confirmDiscard = (): boolean =>
    !dirty || window.confirm('Le projet contient des modifications non enregistrées. Les abandonner ?');

  const startNew = () => {
    if (busy || !confirmDiscard()) return;
    setStep('definition');
    setDraft(DefinitionDraft.empty());
    setDefinition(null);
    setHistory(null);
    setTestWord(null);
    setConversionBackup(null);
    setFileName(null);
    setSavedSnapshot(null);
    setStatus(null);
  };

  const save = async () => {
    if (busy || definition === null || history === null) return;
    setBusy(true);
    const outcome = await saveProject(files, definition, history.present, fileName ?? undefined);
    setBusy(false);
    if (outcome.kind === 'saved') {
      setFileName(outcome.fileName);
      setSavedSnapshot(outcome.snapshot);
      setStatus({ kind: 'info', text: `Enregistré : ${outcome.location}` });
    } else if (outcome.kind === 'failed') {
      setStatus({ kind: 'error', text: outcome.message });
    } else {
      setStatus(null); // annulé : on n'affiche plus l'ancien message
    }
  };

  const exportImage = async (format: ImageFormat) => {
    if (busy || definition === null || history === null) return;
    setBusy(true);
    const result = await exportAutomatonImage(images, history.present, format, fileName, definition.regexSource);
    setBusy(false);
    if (result.kind === 'saved') setStatus({ kind: 'info', text: `Image exportée : ${result.location}` });
    else if (result.kind === 'failed') setStatus({ kind: 'error', text: result.message });
    else setStatus(null);
  };

  const open = async () => {
    if (busy || !confirmDiscard()) return;
    setBusy(true);
    const outcome = await openProject(files);
    setBusy(false);
    if (outcome.kind === 'opened') {
      setDraft(DefinitionDraft.fromDefinition(outcome.definition));
      setDefinition(outcome.definition);
      setHistory(ConstructionHistory.from(outcome.construction));
      setTestWord(null);
      setConversionBackup(null);
      setFileName(outcome.fileName);
      setSavedSnapshot(outcome.snapshot);
      setStatus({ kind: 'info', text: `Ouvert : ${outcome.fileName}` });
      setStep('construction');
    } else if (outcome.kind === 'failed') {
      setStatus({ kind: 'error', text: outcome.message });
    } else {
      setStatus(null);
    }
  };

  // Ctrl/Cmd+S enregistre, Ctrl/Cmd+O ouvre (même depuis un champ de saisie).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        void save();
      } else if (key === 'o') {
        event.preventDefault();
        void open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Fermer la fenêtre (ou recharger la page) avec des modifications non enregistrées demande confirmation.
  useEffect(() => (dirty ? installUnloadGuard(window) : undefined), [dirty]);

  // Titre de la fenêtre : nom du fichier, et « • » tant que des modifications ne sont pas enregistrées.
  useEffect(() => {
    document.title = `${dirty ? '• ' : ''}${fileName ?? 'Sans titre'} - ${APP_TITLE}`;
  }, [dirty, fileName]);

  const fileBar = (
    <FileBar
      fileName={fileName}
      dirty={dirty}
      canSave={hasProject}
      canExport={hasProject}
      busy={busy}
      status={status}
      onNew={startNew}
      onOpen={() => void open()}
      onSave={() => void save()}
      onExportSvg={() => void exportImage('svg')}
      onExportPng={() => void exportImage('png')}
    />
  );

  if (step === 'definition' || definition === null || history === null) {
    return (
      <>
        {fileBar}
        <DefinitionStep draft={draft} onDraftChange={setDraft} onSubmit={submitDefinition} />
      </>
    );
  }

  if (step === 'construction') {
    return (
      <>
        {fileBar}
        <ConstructionStep
          definition={definition}
          history={history}
          onHistoryChange={setHistory}
          onBack={() => setStep('definition')}
          onContinue={() => {
            setTestWord(null);
            setStep('simulation');
          }}
          onTestWord={(word) => {
            setTestWord(word);
            setStep('simulation');
          }}
          onConvertToDfa={convertToDeterministic}
          canRevertConversion={canRevertConversion}
          onRevertConversion={revertConversion}
        />
      </>
    );
  }

  return (
    <>
      {fileBar}
      <SimulationStep
        definition={definition}
        construction={history.present}
        initialWord={testWord}
        onBack={() => setStep('construction')}
      />
    </>
  );
}
