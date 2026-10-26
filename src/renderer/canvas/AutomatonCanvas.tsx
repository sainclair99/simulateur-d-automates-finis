import { useEffect, useId, useRef, useState } from 'react';
import { CANVAS, clampToBounds } from '../../application';
import type { Link, LinkRef, PlacedState, Point, StateVisual } from '../../application';
import type { DragPayload } from './dragPayload';
import { linkGeometry, loopGeometry } from './geometry';
import type { DropHandlers, PointerHandlers } from './handlers';
import { LinkShape } from './LinkShape';
import { toCanvasPoint } from './pointer';
import { StateNode } from './StateNode';

interface Props {
  readonly nodes: readonly PlacedState[];
  readonly links: readonly Link[];
  /** Aspect de chaque état (utilisé par l'écran de simulation : vert / rouge). */
  readonly visualOf?: (id: string) => StateVisual;
  readonly selectedLink?: LinkRef | null;
  /** Flèches mises en évidence (transitions empruntées au pas courant de la simulation). */
  readonly activeLinks?: readonly LinkRef[];
  readonly dragged?: DragPayload | null;
  // Les callbacks d'édition sont optionnels : sans eux, le canevas est en lecture seule.
  readonly onSelectLink?: (link: LinkRef | null) => void;
  readonly onMoveState?: (id: string, point: Point) => void;
  readonly onDropState?: (id: string, point: Point) => void;
  readonly onCreateLink?: (from: string, point: Point) => void;
  readonly onDropSymbolOnLink?: (link: LinkRef, symbol: string) => void;
  readonly onDropSymbolOnState?: (id: string, symbol: string) => void;
}

const pairKey = (from: string, to: string): string => JSON.stringify([from, to]);

export function AutomatonCanvas({
  nodes,
  links,
  visualOf,
  selectedLink = null,
  activeLinks = [],
  dragged = null,
  onSelectLink,
  onMoveState,
  onDropState,
  onCreateLink,
  onDropSymbolOnLink,
  onDropSymbolOnState,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerBase = useId().replace(/:/g, '');
  const markers = {
    normal: `${markerBase}-arrow`,
    selected: `${markerBase}-arrow-selected`,
    pending: `${markerBase}-arrow-pending`,
  };
  const moveRef = useRef<{ id: string; dx: number; dy: number; last: Point | null } | null>(null);
  const linkSourceRef = useRef<string | null>(null);
  const [live, setLive] = useState<{ id: string; point: Point } | null>(null);
  const [linking, setLinking] = useState<{ from: string; current: Point } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const editable = onMoveState !== undefined;

  useEffect(() => {
    if (dragged === null) setHover(null);
  }, [dragged]);

  const positions = new Map<string, Point>(
    nodes.map((node): [string, Point] => [node.id, live?.id === node.id ? live.point : node.position]),
  );
  const linkKeys = new Set(links.map((link) => pairKey(link.from, link.to)));

  const pointerOf = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    return svg ? toCanvasPoint(svg, event.clientX, event.clientY) : null;
  };

  // ----- Déplacer un état -----
  const moveHandlers = (node: PlacedState): PointerHandlers => ({
    onPointerDown: (event) => {
      if (!editable || event.button !== 0) return;
      const pointer = pointerOf(event);
      if (!pointer) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      moveRef.current = { id: node.id, dx: node.position.x - pointer.x, dy: node.position.y - pointer.y, last: null };
    },
    onPointerMove: (event) => {
      const move = moveRef.current;
      const pointer = pointerOf(event);
      if (!move || !pointer || move.id !== node.id) return;
      const point = clampToBounds({ x: pointer.x + move.dx, y: pointer.y + move.dy });
      move.last = point;
      setLive({ id: node.id, point });
    },
    onPointerUp: (event) => {
      const move = moveRef.current;
      moveRef.current = null;
      setLive(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (move?.last) onMoveState?.(node.id, move.last);
    },
    onPointerCancel: () => {
      moveRef.current = null;
      setLive(null);
    },
  });

  // ----- Tirer une liaison depuis la poignée d'un état -----
  const linkHandlers = (node: PlacedState): PointerHandlers => ({
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      const pointer = pointerOf(event);
      if (!pointer) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      linkSourceRef.current = node.id;
      setLinking({ from: node.id, current: pointer });
    },
    onPointerMove: (event) => {
      const pointer = pointerOf(event);
      if (linkSourceRef.current !== node.id || !pointer) return;
      setLinking({ from: node.id, current: pointer });
    },
    onPointerUp: (event) => {
      const pointer = pointerOf(event);
      const source = linkSourceRef.current;
      linkSourceRef.current = null;
      setLinking(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (source === node.id && pointer) onCreateLink?.(node.id, pointer);
    },
    onPointerCancel: () => {
      linkSourceRef.current = null;
      setLinking(null);
    },
  });

  // ----- Déposer un symbole (sur une flèche ou sur un état) -----
  const symbolDropHandlers = (key: string, onSymbol: (symbol: string) => void): DropHandlers => ({
    onDragOver: (event) => {
      if (dragged?.kind !== 'symbol') return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      setHover(key);
    },
    onDragLeave: () => setHover((current) => (current === key ? null : current)),
    onDrop: (event) => {
      if (dragged?.kind !== 'symbol') return;
      event.preventDefault();
      event.stopPropagation();
      setHover(null);
      onSymbol(dragged.symbol);
    },
  });

  const origin = linking ? positions.get(linking.from) : undefined;

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="group"
      aria-label="Zone de construction de l'automate"
      onPointerDown={() => onSelectLink?.(null)}
      onDragOver={(event) => {
        if (dragged?.kind !== 'state') return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(event) => {
        if (dragged?.kind !== 'state') return;
        event.preventDefault();
        const point = pointerOf(event);
        if (point) onDropState?.(dragged.id, point);
      }}
    >
      <defs>
        {(['normal', 'selected', 'pending'] as const).map((kind) => (
          <marker
            key={kind}
            id={markers[kind]}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="12"
            markerHeight="12"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={`arrow-head arrow-head--${kind}`} />
          </marker>
        ))}
      </defs>

      {nodes.length === 0 && (
        <text className="canvas-hint" x={CANVAS.width / 2} y={CANVAS.height / 2} textAnchor="middle">
          Glisse les états depuis la palette pour les placer
        </text>
      )}

      {links.map((link) => {
        const from = positions.get(link.from);
        const to = positions.get(link.to);
        if (!from || !to) return null; // une extrémité n'est pas encore placée
        const key = pairKey(link.from, link.to);
        const curved = link.from !== link.to && linkKeys.has(pairKey(link.to, link.from));
        const geometry = link.from === link.to ? loopGeometry(from) : linkGeometry(from, to, curved);
        const ref = { from: link.from, to: link.to };
        return (
          <LinkShape
            key={key}
            link={link}
            geometry={geometry}
            selected={selectedLink !== null && selectedLink.from === link.from && selectedLink.to === link.to}
            active={activeLinks.some((active) => active.from === link.from && active.to === link.to)}
            dropHover={hover === `link:${key}`}
            markers={markers}
            onSelect={() => onSelectLink?.(ref)}
            dropHandlers={symbolDropHandlers(`link:${key}`, (symbol) => onDropSymbolOnLink?.(ref, symbol))}
          />
        );
      })}

      {linking && origin && (
        <line className="link-draft" x1={origin.x} y1={origin.y} x2={linking.current.x} y2={linking.current.y} />
      )}

      {nodes.map((node) => (
        <StateNode
          key={node.id}
          node={node}
          position={positions.get(node.id) ?? node.position}
          visual={visualOf ? visualOf(node.id) : 'idle'}
          dropHover={hover === `state:${node.id}`}
          editable={editable}
          markerId={markers.normal}
          moveHandlers={moveHandlers(node)}
          linkHandlers={linkHandlers(node)}
          dropHandlers={symbolDropHandlers(`state:${node.id}`, (symbol) => onDropSymbolOnState?.(node.id, symbol))}
        />
      ))}
    </svg>
  );
}
