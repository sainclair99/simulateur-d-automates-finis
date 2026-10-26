import type { AutomatonDrawing } from './automatonSvg';

/** Plus grande dimension autorisée du PNG (pixels), pour ne jamais produire une image démesurée. */
const MAX_SIDE = 8192;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("le dessin n'a pas pu être converti en image"));
    image.src = source;
  });
}

/**
 * SVG → PNG (octets). `scale` = 2 donne une image nette sur écran haute densité.
 * Le SVG est chargé via une URL `data:` : la politique de sécurité de l'application l'autorise pour les images.
 */
export async function svgToPngBytes(drawing: AutomatonDrawing, scale = 2): Promise<Uint8Array> {
  const factor = Math.min(scale, MAX_SIDE / Math.max(drawing.width, drawing.height));
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.svg)}`);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(drawing.width * factor));
  canvas.height = Math.max(1, Math.ceil(drawing.height * factor));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('le dessin 2D du navigateur est indisponible');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('la conversion en PNG a échoué');
  return new Uint8Array(await blob.arrayBuffer());
}
