import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";

/**
 * Build uniquement : injecte la CSP et retire l'attribut `crossorigin` (inutile sous file://
 * et source de blocages). Le serveur de dev a besoin de scripts inline : aucune CSP n'y est ajoutée.
 */
const electronHtml = (): Plugin => ({
  name: 'electron-html',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replace(/\scrossorigin(?:=("|')[^"']*\1)?/g, '')
        .replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  },
});

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  plugins: [react(), electronHtml()],
  build: { outDir: resolve(__dirname, 'dist/renderer'), emptyOutDir: true },
  server: { port: 5173, strictPort: true },
  test: { root: __dirname, include: ['src/**/*.test.ts'], environment: 'node' },
});
