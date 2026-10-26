export interface FileStatus {
  readonly kind: 'info' | 'error';
  readonly text: string;
}

interface Props {
  readonly fileName: string | null;
  readonly dirty: boolean;
  readonly canSave: boolean;
  readonly canExport: boolean;
  readonly busy: boolean;
  readonly status: FileStatus | null;
  readonly onNew: () => void;
  readonly onOpen: () => void;
  readonly onSave: () => void;
  readonly onExportSvg: () => void;
  readonly onExportPng: () => void;
}

/** Barre de fichier, visible sur tous les écrans : Nouveau, Ouvrir… (Ctrl+O), Enregistrer… (Ctrl+S), exports d'image. */
export function FileBar({
  fileName,
  dirty,
  canSave,
  canExport,
  busy,
  status,
  onNew,
  onOpen,
  onSave,
  onExportSvg,
  onExportPng,
}: Props) {
  return (
    <nav className="filebar" aria-label="Fichier">
      <button type="button" onClick={onNew} disabled={busy}>
        Nouveau
      </button>
      <button type="button" onClick={onOpen} disabled={busy} title="Ouvrir un projet (Ctrl+O)">
        Ouvrir…
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || !canSave}
        title={canSave ? 'Enregistrer le projet (Ctrl+S)' : "Valide d'abord la définition avec « Continuer »"}
      >
        Enregistrer…
      </button>
      <button type="button" onClick={onExportSvg} disabled={busy || !canExport} title="Image vectorielle, idéale pour un rapport">
        Exporter en SVG
      </button>
      <button type="button" onClick={onExportPng} disabled={busy || !canExport} title="Image à insérer dans un document">
        Exporter en PNG
      </button>
      <span className="filename">
        {fileName ?? 'Sans titre'}
        {dirty ? ' •' : ''}
      </span>
      <span role="status" className={status?.kind === 'error' ? 'error' : 'hint'}>
        {status?.text}
      </span>
    </nav>
  );
}
