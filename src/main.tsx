import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { SelectionApp } from './SelectionApp.tsx';
import { PetApp } from './PetApp.tsx';
import type { Character } from './lib/types.ts';
import { checkAndImportSeed } from './lib/seedManager.ts';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (isTauri) document.documentElement.classList.add('tauri-mode');

function TauriRoot() {
  const [mode, setMode] = useState<'selection' | 'pet'>('selection');
  const [character, setCharacter] = useState<Character | null>(null);

  const handleEnterPet = (char: Character) => {
    setCharacter(char);
    setMode('pet');
  };

  const handleExitPet = () => {
    setMode('selection');
  };

  if (mode === 'pet' && character) {
    return <PetApp character={character} onExit={handleExitPet} />;
  }
  return <SelectionApp onEnterPet={handleEnterPet} />;
}

async function init() {
  if (isTauri) {
    // On fresh install: auto-import seed data if present next to exe
    await checkAndImportSeed();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <TauriRoot />
    </StrictMode>,
  );
}

init();
