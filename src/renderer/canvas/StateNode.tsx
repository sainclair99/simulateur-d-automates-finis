import { NODE_RADIUS } from '../../application';
import type { PlacedState, Point, StateVisual } from '../../application';
import type { DropHandlers, PointerHandlers } from './handlers';
import { fitLabel } from './label';

interface Props {
  readonly node: PlacedState;
  readonly position: Point;
  readonly visual: StateVisual;
  readonly dropHover: boolean;
  readonly editable: boolean;
  readonly markerId: string;
  readonly moveHandlers: PointerHandlers;
  readonly linkHandlers: PointerHandlers;
  readonly dropHandlers: DropHandlers;
}

export function StateNode({
  node,
  position,
  visual,
  dropHover,
  editable,
  markerId,
  moveHandlers,
  linkHandlers,
  dropHandlers,
}: Props) {
  const label = fitLabel(node.id, node.isFinal);
  const classes = ['node', `node--${visual}`, editable ? 'node--editable' : '', dropHover ? 'node--drop' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <g className={classes} transform={`translate(${position.x} ${position.y})`} {...dropHandlers}>
      {node.isInitial && (
        <path
          className="initial-arrow"
          d={`M ${-NODE_RADIUS - 44} 0 L ${-NODE_RADIUS} 0`}
          markerEnd={`url(#${markerId})`}
        />
      )}
      <g className="node-body" {...moveHandlers}>
        <circle className="node-disc" r={NODE_RADIUS} />
        {node.isFinal && <circle className="final-ring" r={NODE_RADIUS - 6} />}
        <text className="node-label" textAnchor="middle" dominantBaseline="central" fontSize={label.fontSize}>
          {label.text}
          {label.truncated && <title>{node.id}</title>}
        </text>
      </g>
      {editable && (
        <circle className="handle" cx={0} cy={NODE_RADIUS + 14} r={7} {...linkHandlers}>
          <title>Tirer vers un autre état pour créer une liaison</title>
        </circle>
      )}
    </g>
  );
}
