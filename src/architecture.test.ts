import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

function violations(layer: string, forbidden: RegExp): string[] {
  return listFiles(join(process.cwd(), 'src', layer))
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|fixture)\.tsx?$/.test(file))
    .filter((file) => forbidden.test(readFileSync(file, 'utf8')));
}

const PLATFORM = 'electron|node:[^\'"]+';
const UI_LIBS = 'react|react-dom';
const rel = (layers: string): string => `(?:\\.\\.\\/)+(?:${layers})(?:\\/[^'"]*)?`;
const forbiddenImport = (...alternatives: string[]): RegExp =>
  new RegExp(`from\\s+['"](?:${alternatives.join('|')})['"]`);

describe('Règle de dépendance (renderer → application → core)', () => {
  it('core est pur : ni plateforme, ni UI, ni couches externes', () => {
    const forbidden = forbiddenImport(PLATFORM, UI_LIBS, rel('application|infrastructure|main|preload|renderer'));
    expect(violations('core', forbidden)).toEqual([]);
  });

  it('application ne dépend que de core : ni plateforme, ni UI, ni infrastructure', () => {
    const forbidden = forbiddenImport(PLATFORM, UI_LIBS, rel('infrastructure|main|preload|renderer'));
    expect(violations('application', forbidden)).toEqual([]);
  });

  it('renderer passe par application : jamais core, Electron/Node, main, preload ni infrastructure', () => {
    const forbidden = forbiddenImport(PLATFORM, rel('core|infrastructure|main|preload'));
    expect(violations('renderer', forbidden)).toEqual([]);
  });

  it('shared (contrat IPC) ne contient que des types et constantes : aucune importation', () => {
    expect(violations('shared', /^\s*(import|export)[^;]*from\s+['"]/m)).toEqual([]);
  });
});
