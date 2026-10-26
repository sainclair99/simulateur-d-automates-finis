import type { Link } from '../../application';
import type { DropHandlers } from './handlers';
import type { LinkGeometry } from './geometry';

export interface MarkerIds {
  readonly normal: string;
  readonly selected: string;
  readonly pending: string;
}

interface Props {
  readonly link: Link;
  readonly geometry: LinkGeometry;
  readonly selected: boolean;
  /** Flèche empruntée au pas courant de la simulation. */
  readonly active: boolean;
  readonly dropHover: boolean;
  readonly markers: MarkerIds;
  readonly onSelect: () => void;
  readonly dropHandlers: DropHandlers;
}

export function LinkShape({ link, geometry, selected, active, dropHover, markers, onSelect, dropHandlers }: Props) {
  const pending = link.symbols.length === 0;
  const marker = selected || active || dropHover ? markers.selected : pending ? markers.pending : markers.normal;
  const classes = [
    'link',
    pending ? 'link--pending' : '',
    selected ? 'link--selected' : '',
    active ? 'link--active' : '',
    dropHover ? 'link--drop' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={classes}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      {...dropHandlers}
    >
      <path className="link-line" d={geometry.path} markerEnd={`url(#${marker})`} />
      <path className="link-hit" d={geometry.path} />
      <text className="link-label" x={geometry.label.x} y={geometry.label.y} textAnchor="middle">
        {pending ? '＋' : link.symbols.join(', ')}
        {pending && <title>Dépose un symbole sur cette flèche</title>}
      </text>
    </g>
  );
}
