import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { selectImageFiles } from './files/selectImageFiles';
import { selectProjectFiles } from './files/selectProjectFiles';
import './styles.css';

const files = selectProjectFiles();
const images = selectImageFiles();
const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App files={files} images={images} />
    </ErrorBoundary>
  </StrictMode>,
);
