import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROJECT_CHANNELS } from '../shared/projectIpc';

describe('preload ↔ contrat IPC', () => {
  const source = readFileSync(join(process.cwd(), 'src/preload/preload.ts'), 'utf8');

  it('utilise exactement les noms de canaux du contrat partagé', () => {
    expect(source).toContain(`'${PROJECT_CHANNELS.save}'`);
    expect(source).toContain(`'${PROJECT_CHANNELS.open}'`);
    expect(source).toContain(`'${PROJECT_CHANNELS.exportImage}'`);
  });

  it('n’importe aucun module local à l’exécution (interdit dans un preload sandboxé)', () => {
    const runtimeLocalImports = source.split('\n').filter((line) => /^import (?!type)[^;]*from ['"]\./.test(line));
    expect(runtimeLocalImports).toEqual([]);
  });
});
