import { describe, expect, it } from 'vitest';
import { imageFileName } from './ImageFiles';

describe('imageFileName', () => {
  it.each([
    [null, 'svg', 'automate.svg'],
    [null, 'png', 'automate.png'],
    ['ab.automate.json', 'png', 'ab.png'],
    ['AB.AUTOMATE.JSON', 'svg', 'AB.svg'],
    ['notes.json', 'svg', 'notes.svg'],
    ['.automate.json', 'png', 'automate.png'],
    ['sans-extension', 'png', 'sans-extension.png'],
  ] as const)('%s (%s) → %s', (projectName, format, expected) => {
    expect(imageFileName(projectName, format)).toBe(expected);
  });
});
