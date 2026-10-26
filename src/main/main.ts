import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_CHANNELS } from '../shared/projectIpc';
import { createProjectFileHandlers } from './projectFiles';
import { isTrustedUrl } from './trustedSender';

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const rendererIndex = path.join(__dirname, '../renderer/index.html');

/** Canaux IPC « fichiers de projet » : le renderer ne fournit jamais de chemin, seulement un nom proposé. */
function registerProjectFileHandlers(): void {
  const handlersFor = (event: IpcMainInvokeEvent) => {
    const url = event.senderFrame?.url ?? '';
    if (!isTrustedUrl(url, { devServerUrl, indexFileUrl: pathToFileURL(rendererIndex).href })) {
      throw new Error('Appelant non autorisé');
    }
    const window = BrowserWindow.fromWebContents(event.sender);
    return createProjectFileHandlers(
      {
        showSaveDialog: (options) => (window ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options)),
        showOpenDialog: (options) => (window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)),
      },
      { writeFile, writeBinary: (file, data) => writeFile(file, data), readFile, stat },
      app.getPath('documents'),
    );
  };
  ipcMain.handle(PROJECT_CHANNELS.save, (event, name: unknown, content: unknown) =>
    handlersFor(event).save(name, content),
  );
  ipcMain.handle(PROJECT_CHANNELS.open, (event) => handlersFor(event).open());
  ipcMain.handle(PROJECT_CHANNELS.exportImage, (event, name: unknown, format: unknown, data: unknown) =>
    handlersFor(event).exportImage(name, format, data),
  );
}

/** Relaie dans le terminal ce qui rend d'ordinaire un écran blanc impossible à diagnostiquer. */
function reportRendererProblems(window: BrowserWindow): void {
  const { webContents } = window;
  webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[renderer] ${message} (${sourceId}:${line})`);
  });
  webContents.on('did-fail-load', (_event, code, description, url) => {
    if (code !== -3) console.error(`[renderer] chargement impossible : ${description} (${code}) ${url}`);
  });
  webContents.on('render-process-gone', (_event, details) => {
    console.error(`[renderer] processus arrêté : ${details.reason}`);
  });
  webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[preload] ${preloadPath} : ${error.message}`);
  });
  // F12, Ctrl+Maj+I (ou Cmd+Option+I) : outils de développement, même en version packagée.
  webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();
    const toggle = key === 'f12' || (key === 'i' && input.shift && input.control) || (key === 'i' && input.alt && input.meta);
    if (input.type === 'keyDown' && toggle) {
      webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Aucune ouverture de nouvelle fenêtre depuis le renderer.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  reportRendererProblems(window);

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(rendererIndex);
  }
  return window;
}

app.whenReady().then(async () => {
  // En développement, le cache disque d'Electron peut garder une copie périmée ou corrompue des
  // dépendances préparées par Vite (servies « immutables ») : on repart d'un cache vide.
  if (devServerUrl) await session.defaultSession.clearCache();
  registerProjectFileHandlers();
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
