import { imageFileName } from '../../application';
import type { ConstructionState, ImageFiles, ImageFormat, SaveResult } from '../../application';
import { buildAutomatonSvg } from './automatonSvg';
import { svgToPngBytes } from './rasterize';

/**
 * Exporte l'automate en SVG ou PNG. Les états pas encore placés sont disposés pour l'image
 * seulement (le projet n'est pas modifié). Ne lève jamais d'exception : renvoie un résultat.
 */
export async function exportAutomatonImage(
  images: ImageFiles,
  construction: ConstructionState,
  format: ImageFormat,
  projectFileName: string | null,
  title?: string,
): Promise<SaveResult> {
  try {
    const layout = construction.completeLayout();
    const drawing = buildAutomatonSvg({ nodes: layout.placedStates, links: layout.links, title });
    const data = format === 'svg' ? new TextEncoder().encode(drawing.svg) : await svgToPngBytes(drawing);
    return await images.save(imageFileName(projectFileName, format), format, data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { kind: 'failed', message: `Export impossible : ${reason}` };
  }
}
