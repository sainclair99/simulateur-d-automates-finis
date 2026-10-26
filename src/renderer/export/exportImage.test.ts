import { describe, expect, it } from 'vitest';
import { ConstructionState } from '../../application';
import type { ImageFiles, ImageFormat, SaveResult } from '../../application';
import { endsWithAbDefinition } from '../../core/endsWithAb.fixture';
import { exportAutomatonImage } from './exportImage';

function recorder(result: SaveResult | Error = { kind: 'saved', location: '/img/x' }) {
  const calls: Array<{ name: string; format: ImageFormat; text: string }> = [];
  const images: ImageFiles = {
    async save(name, format, data) {
      if (result instanceof Error) throw result;
      calls.push({ name, format, text: new TextDecoder().decode(data) });
      return result;
    },
  };
  return { images, calls };
}

const construction = ConstructionState.start(endsWithAbDefinition()).addSymbol('q0', 'q1', 'a').addSymbol('q1', 'q2', 'b');

describe('exportAutomatonImage (SVG)', () => {
  it('envoie un SVG complet, y compris pour des états pas encore placés, sans modifier le projet', async () => {
    const { images, calls } = recorder();
    const result = await exportAutomatonImage(images, construction, 'svg', 'ab.automate.json', '(a|b)*ab');
    expect(result).toEqual({ kind: 'saved', location: '/img/x' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.name).toBe('ab.svg');
    expect(calls[0]?.format).toBe('svg');
    expect(calls[0]?.text.startsWith('<?xml')).toBe(true);
    expect(calls[0]?.text.match(/<g class="state">/g)).toHaveLength(3);
    expect(construction.unplacedStates).toEqual(['q0', 'q1', 'q2']);
  });

  it('transmet l’annulation et les échecs, et capture les exceptions', async () => {
    expect(await exportAutomatonImage(recorder({ kind: 'cancelled' }).images, construction, 'svg', null)).toEqual({ kind: 'cancelled' });
    expect(await exportAutomatonImage(recorder({ kind: 'failed', message: 'disque plein' }).images, construction, 'svg', null)).toEqual({
      kind: 'failed',
      message: 'disque plein',
    });
    expect(await exportAutomatonImage(recorder(new Error('boum')).images, construction, 'svg', null)).toEqual({
      kind: 'failed',
      message: 'Export impossible : boum',
    });
  });

  it('propose un nom par défaut quand le projet n’a pas de nom', async () => {
    const { images, calls } = recorder();
    await exportAutomatonImage(images, construction, 'svg', null);
    expect(calls[0]?.name).toBe('automate.svg');
  });
});
