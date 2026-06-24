import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { checkAndImportSeed } from './lib/seedManager.ts';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (isTauri) document.documentElement.classList.add('tauri-mode');

async function init() {
  if (isTauri) {
    // On fresh install: auto-import seed data if present next to exe
    await checkAndImportSeed();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

init();
