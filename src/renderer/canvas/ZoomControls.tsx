import { MAX_ZOOM, MIN_ZOOM } from './viewport';

interface Props {
  readonly zoom: number;
  readonly canFit: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onReset: () => void;
  readonly onFit: () => void;
}

/** Commandes de zoom superposées au dessin (la molette et le glissement du fond font la même chose). */
export function ZoomControls({ zoom, canFit, onZoomIn, onZoomOut, onReset, onFit }: Props) {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button type="button" onClick={onZoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom arrière" title="Zoom arrière">
        −
      </button>
      <button type="button" className="zoom-level" onClick={onReset} title="Revenir à 100 % (tout le dessin)">
        {Math.round(zoom * 100)} %
      </button>
      <button type="button" onClick={onZoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom avant" title="Zoom avant">
        +
      </button>
      <button type="button" onClick={onFit} disabled={!canFit} title="Cadrer les états">
        Ajuster
      </button>
    </div>
  );
}
