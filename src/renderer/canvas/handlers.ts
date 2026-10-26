import type { DragEvent, PointerEvent } from 'react';

export interface PointerHandlers {
  readonly onPointerDown: (event: PointerEvent<SVGElement>) => void;
  readonly onPointerMove: (event: PointerEvent<SVGElement>) => void;
  readonly onPointerUp: (event: PointerEvent<SVGElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<SVGElement>) => void;
}

export interface DropHandlers {
  readonly onDragOver: (event: DragEvent<SVGElement>) => void;
  readonly onDragLeave: (event: DragEvent<SVGElement>) => void;
  readonly onDrop: (event: DragEvent<SVGElement>) => void;
}
