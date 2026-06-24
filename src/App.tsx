import { useState, useCallback } from 'react';
import { GoldRain } from './components/GoldRain';
import { HallPage } from './pages/HallPage';
import { SummonPage } from './pages/SummonPage';
import { SettingsPage } from './pages/SettingsPage';
import { SoulChatOverlay } from './components/SoulChatOverlay';
import { CharacterStore } from './lib/store';

type AppView = 'hall' | 'summon' | 'settings';

function App() {
  const [view, setView] = useState<AppView>('hall');
  const [chatCharId, setChatCharId] = useState<string | null>(null);

  const openChat = useCallback((id: string) => setChatCharId(id), []);
  const closeChat = useCallback(() => setChatCharId(null), []);
  const goHall = useCallback(() => setView('hall'), []);

  const chatCharacter = chatCharId ? (CharacterStore.get(chatCharId) ?? null) : null;

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      overflow: 'hidden', background: 'var(--page-bg)',
    }}>
      <GoldRain />

      <div style={{
        position: 'absolute', inset: 0,
        overflowY: view === 'hall' ? 'hidden' : 'auto',
      }}>
        {view === 'hall' && (
          <HallPage
            onOpenChat={openChat}
            onOpenSummon={() => setView('summon')}
            onOpenSettings={() => setView('settings')}
          />
        )}
        {view === 'summon' && (
          <SummonPage
            onComplete={id => { openChat(id); goHall(); }}
            onBack={goHall}
          />
        )}
        {view === 'settings' && (
          <SettingsPage onBack={goHall} />
        )}
      </div>

      {chatCharacter && (
        <SoulChatOverlay character={chatCharacter} onClose={closeChat} />
      )}
    </div>
  );
}

export default App;
