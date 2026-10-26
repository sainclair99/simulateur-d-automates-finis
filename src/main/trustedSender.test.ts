import { describe, expect, it } from 'vitest';
import { isTrustedUrl } from './trustedSender';

const index = 'file:///app/dist/renderer/index.html';

describe('isTrustedUrl', () => {
  it('en développement, accepte uniquement l’origine du serveur Vite', () => {
    const pages = { devServerUrl: 'http://localhost:5173', indexFileUrl: index };
    expect(isTrustedUrl('http://localhost:5173/', pages)).toBe(true);
    expect(isTrustedUrl('http://localhost:5173/src/page?x=1', pages)).toBe(true);
    expect(isTrustedUrl('http://localhost:5174/', pages)).toBe(false);
    expect(isTrustedUrl('https://evil.example/', pages)).toBe(false);
    expect(isTrustedUrl('file:///etc/passwd', pages)).toBe(false);
    expect(isTrustedUrl('', pages)).toBe(false);
  });

  it('en version construite, accepte uniquement notre page', () => {
    const pages = { devServerUrl: undefined, indexFileUrl: index };
    expect(isTrustedUrl(index, pages)).toBe(true);
    expect(isTrustedUrl(`${index}#/x`, pages)).toBe(true);
    expect(isTrustedUrl('file:///app/dist/renderer/autre.html', pages)).toBe(false);
    expect(isTrustedUrl('file:///app/dist/renderer/index.html.evil', pages)).toBe(false);
    expect(isTrustedUrl('http://localhost:5173/', pages)).toBe(false);
  });
});
