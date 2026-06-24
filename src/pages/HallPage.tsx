import { useMemo, useState } from 'react';
import { Activity, MessageCircle, Plus, Settings, Sparkles } from 'lucide-react';
import { CharacterStore } from '../lib/store';
import { CharacterDetailOverlay } from '../components/CharacterDetailOverlay';
import type { Character } from '../lib/types';

interface HallPageProps {
  onOpenChat: (characterId: string) => void;
  onOpenSummon: () => void;
  onOpenSettings: () => void;
}

function loadCharacters() {
  return CharacterStore.getAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function HallPage({ onOpenChat, onOpenSummon, onOpenSettings }: HallPageProps) {
  const [characters, setCharacters] = useState<Character[]>(loadCharacters);
  const [selected, setSelected] = useState<Character | null>(null);
  const active = selected ?? characters[0] ?? null;

  const stats = useMemo(() => ({
    characters: characters.length,
    custom: characters.filter(character => !character.isPrebuilt).length,
    ready: characters.filter(character => character.systemPrompt).length,
  }), [characters]);

  const refresh = () => setCharacters(loadCharacters());

  return (
    <main className="hall-page sci-shell">
      <div className="sci-grid" />
      <div className="hall-scan-line" />

      <header className="sci-topbar">
        <button className="brand-lockup" onClick={refresh}>
          <span className="brand-mark">TK</span>
          <span>
            <span className="brand-title">Third Kind Contact</span>
            <span className="brand-subtitle">Companion Studio</span>
          </span>
        </button>

        <div className="sci-status-row">
          <div className="sci-status"><span>LOCAL</span><strong>FIRST</strong></div>
          <div className="sci-status"><span>KEYS</span><strong>USER</strong></div>
          <div className="sci-status"><span>ROLES</span><strong>{stats.characters}</strong></div>
        </div>

        <div className="sci-actions">
          <button className="sci-icon-btn" onClick={onOpenSummon} title="Create companion">
            <Plus className="w-4 h-4" />
            <span>Create</span>
          </button>
          <button className="sci-icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      <section className="hall-layout">
        <aside className="soul-index-panel">
          <div className="panel-heading">
            <span>Companions</span>
            <strong>{characters.length.toString().padStart(2, '0')}</strong>
          </div>

          <div className="soul-index-list">
            {characters.map((character, index) => (
              <button
                key={character.id}
                className={`soul-index-item ${active?.id === character.id ? 'active' : ''}`}
                onClick={() => setSelected(character)}
              >
                <span className="index-code">{String(index + 1).padStart(2, '0')}</span>
                <span className="index-main">
                  <strong>{character.name}</strong>
                  <small>{character.tags[0] ?? 'custom'} / local profile</small>
                </span>
                <span className="index-avatar">{character.avatar}</span>
              </button>
            ))}
          </div>

          <button className="summon-strip" onClick={onOpenSummon}>
            <Sparkles className="w-4 h-4" />
            <span>Create New Companion</span>
          </button>
        </aside>

        <section className="hero-console" aria-live="polite">
          {active ? (
            <>
              <div className="hero-art-panel">
                <div className="art-shade" />
                <div className="holo-stage">
                  <div className="holo-ring ring-a" />
                  <div className="holo-ring ring-b" />
                  <div className="holo-avatar">{active.avatar}</div>
                  <div className="holo-platform" />
                </div>
              </div>

              <div className="hero-copy">
                <div className="section-marker">ACTIVE COMPANION PROFILE</div>
                <h1>{active.name}</h1>
                <p className="hero-title">{active.title}</p>
                <p className="hero-era">{active.era}</p>
                <p className="hero-description">{active.description}</p>

                <div className="tag-row">
                  {(active.tags.length ? active.tags : ['custom']).slice(0, 4).map(tag => (
                    <span className="sci-tag" key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="hero-actions">
                  <button className="btn-primary-sci" onClick={() => onOpenChat(active.id)}>
                    <MessageCircle className="w-4 h-4" />
                    Start Chat
                  </button>
                  <button className="btn-secondary-sci" onClick={() => setSelected(active)}>
                    <Activity className="w-4 h-4" />
                    Inspect Profile
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-console">
              <Sparkles className="w-8 h-8" />
              <p>No companions yet. Create your first profile to begin.</p>
              <button className="btn-primary-sci" onClick={onOpenSummon}>
                <Plus className="w-4 h-4" />
                Create Companion
              </button>
            </div>
          )}
        </section>

        <aside className="intel-panel">
          <div className="panel-heading">
            <span>Studio Status</span>
            <Activity className="w-4 h-4" />
          </div>

          <div className="stat-grid">
            <div className="stat-card"><span>Total</span><strong>{stats.characters}</strong></div>
            <div className="stat-card"><span>Custom</span><strong>{stats.custom}</strong></div>
            <div className="stat-card"><span>Ready</span><strong>{stats.ready}</strong></div>
          </div>

          <div className="intel-block">
            <span className="intel-label">Privacy</span>
            <p>No bundled keys or cloned characters. Your profiles stay local unless you export them.</p>
          </div>

          <div className="intel-block">
            <span className="intel-label">Next Step</span>
            <p>Create a companion, add your own model keys in settings, then start a conversation.</p>
          </div>
        </aside>
      </section>

      <footer className="sci-footer">
        <span>(c) 2026 Third Kind Contact</span>
        <span>Clean AI companion template</span>
        <span>{characters.length} local profile(s)</span>
      </footer>

      <CharacterDetailOverlay
        character={selected}
        onClose={() => setSelected(null)}
        onOpenChat={() => {
          if (selected) {
            onOpenChat(selected.id);
            setSelected(null);
          }
        }}
      />
    </main>
  );
}
