import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { Clapperboard, Download, Image, Plus, Settings } from 'lucide-react';
import { CharacterStore, AppConfig } from './lib/store';
import { PREBUILT_CHARACTERS } from './data/prebuilt';
import { SummonPage } from './pages/SummonPage';
import { SpriteGenPage } from './pages/SpriteGenPage';
import { SpriteStore } from './lib/spriteStore';
import { SceneGenPage } from './pages/SceneGenPage';
import { SceneStore } from './lib/sceneStore';
import { exportSeed } from './lib/seedManager';
import type { Character } from './lib/types';
import { CHARACTER_SPRITES } from './lib/petActions';

interface Props {
  onEnterPet: (character: Character) => void;
}

const F      = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM     = `'SF Mono','Roboto Mono',ui-monospace,monospace`;
const ACCENT = '#0071E3';
const CARD_RADIUS = 8;
const MAIN_WINDOW_SIZE = { width: 1280, height: 820 };
const MAIN_WINDOW_MIN_SIZE = { width: 900, height: 620 };

const appFrameStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  background: '#F5F5F7',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  border: '1.5px solid rgba(0,0,0,0.18)',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.88), inset 0 0 0 2px rgba(0,113,227,0.05)',
};

const twoLineClamp: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

function loadCharacters(): Character[] {
  // Merge prebuilt data while preserving user-set flags (hasPixelSprites, soulProfile etc.)
  PREBUILT_CHARACTERS.forEach(c => {
    const existing = CharacterStore.get(c.id);
    CharacterStore.save(existing
      ? { ...c, hasPixelSprites: existing.hasPixelSprites, soulProfile: existing.soulProfile ?? c.soulProfile }
      : c
    );
  });
  const priority = new Map(PREBUILT_CHARACTERS.map((c, i) => [c.id, i]));
  return CharacterStore.getAll().sort((a, b) => {
    const ai = priority.get(a.id) ?? 999, bi = priority.get(b.id) ?? 999;
    return ai !== bi ? ai - bi : a.createdAt.localeCompare(b.createdAt);
  });
}

// ─── Title Bar ──────────────────────────────────────────────
function TitleBar({ onMinimize, onClose }: { onMinimize: () => void; onClose: () => void }) {
  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0, userSelect: 'none',
      }}
    >
      <span style={{
        fontSize: 10, fontFamily: FM, color: '#C7C7CC',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        VALHALLA · HERALD REGISTRY
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          { label: '–', action: onMinimize, danger: false },
          { label: '✕', action: onClose,    danger: true  },
        ] as const).map(({ label, action, danger }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 24, height: 22,
              background: 'transparent', border: 'none',
              color: danger ? '#FF3B30' : '#AEAEB2',
              fontSize: 11, fontFamily: FM, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Character Avatar ────────────────────────────────────────
function CharacterAvatar({ character, selected }: { character: Character; selected: boolean }) {
  const [idleSprite, setIdleSprite] = useState<string | null>(null);

  useEffect(() => {
    if (!character.hasPixelSprites) { setIdleSprite(null); return; }
    SpriteStore.get(character.id, 'idle').then(b64 => {
      if (b64) setIdleSprite(b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`);
    });
  }, [character.id, character.hasPixelSprites]);

  if (idleSprite) {
    return (
      <img
        alt={character.name}
        src={idleSprite}
        style={{
          height: 72, width: 72,
          imageRendering: 'pixelated',
          objectFit: 'contain',
          filter: selected ? `drop-shadow(0 2px 8px ${ACCENT}40)` : 'none',
          transition: 'filter 0.3s',
        }}
      />
    );
  }

  return (
    <span style={{
      fontSize: 58,
      filter: selected ? `drop-shadow(0 2px 8px ${ACCENT}40)` : 'none',
      transition: 'filter 0.3s',
    }}>
      {character.avatar}
    </span>
  );
}

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'blue' | 'green' | 'purple' }) {
  const color = tone === 'blue' ? ACCENT : tone === 'green' ? '#1F9D55' : tone === 'purple' ? '#8E44AD' : '#6E6E73';
  const background = tone === 'blue' ? `${ACCENT}10` : tone === 'green' ? 'rgba(52,199,89,0.12)' : tone === 'purple' ? 'rgba(175,82,222,0.12)' : '#F5F5F7';
  const border = tone === 'blue' ? `${ACCENT}24` : tone === 'green' ? 'rgba(52,199,89,0.22)' : tone === 'purple' ? 'rgba(175,82,222,0.24)' : 'rgba(0,0,0,0.06)';
  return (
    <span style={{
      height: 22,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '0 7px',
      borderRadius: 999,
      border: `1px solid ${border}`,
      background,
      color,
      fontFamily: FM,
      fontSize: 10,
      whiteSpace: 'nowrap',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {children}
    </span>
  );
}

function IconToolButton({
  title,
  active,
  color,
  children,
  onClick,
}: {
  title: string;
  active?: boolean;
  color: string;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${active ? `${color}44` : 'rgba(0,0,0,0.1)'}`,
        background: active ? `${color}10` : '#FFFFFF',
        color: active ? color : '#8E8E93',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}66`;
        e.currentTarget.style.color = color;
        e.currentTarget.style.background = `${color}10`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = active ? `${color}44` : 'rgba(0,0,0,0.1)';
        e.currentTarget.style.color = active ? color : '#8E8E93';
        e.currentTarget.style.background = active ? `${color}10` : '#FFFFFF';
      }}
    >
      {children}
    </button>
  );
}

// ─── Character Card ──────────────────────────────────────────
function CharacterCard({ character, selected, onClick, onSpriteGen, onSceneGen }: {
  character: Character; selected: boolean; onClick: () => void;
  onSpriteGen: (c: Character) => void;
  onSceneGen: (c: Character) => void;
}) {
  const hasSprite = character.id in CHARACTER_SPRITES || !!character.hasPixelSprites;
  const sceneCount = SceneStore.countPlayable(character.id);
  const statusItems = [
    selected ? <StatusPill key="selected" tone="blue">已选中</StatusPill> : null,
    hasSprite ? <StatusPill key="pixel" tone="green">像素</StatusPill> : null,
    sceneCount > 0 ? <StatusPill key="stage" tone="purple">舞台 {sceneCount}</StatusPill> : null,
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: selected ? `${ACCENT}09` : '#FFFFFF',
        border: `1.5px solid ${selected ? ACCENT : 'rgba(0,0,0,0.08)'}`,
        borderRadius: CARD_RADIUS,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.18s',
        boxShadow: selected
          ? `0 0 0 3px ${ACCENT}18, 0 2px 10px rgba(0,0,0,0.07)`
          : '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 342,
        overflow: 'hidden',
        alignItems: 'stretch',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.10)';
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.16)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)';
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
        }
      }}
    >
      <div style={{
        height: 112,
        minHeight: 112,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: CARD_RADIUS,
        background: selected ? 'rgba(0,113,227,0.06)' : '#FAFAFA',
        border: '1px solid rgba(0,0,0,0.04)',
      }}>
        <CharacterAvatar character={character} selected={selected} />
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12, flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            fontFamily: FM,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: selected ? ACCENT : '#C7C7CC',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 8,
            paddingRight: 72,
          }}>
            {selected ? 'SELECTED' : `ID·${character.id.toUpperCase()}`}
          </div>

          <div style={{
            fontSize: 20,
            lineHeight: 1.22,
            fontFamily: F,
            fontWeight: 800,
            color: selected ? ACCENT : '#1D1D1F',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 7,
            paddingRight: 48,
          }}>
            {character.name}
          </div>

          <div style={{
            minHeight: 38,
            fontSize: 13,
            fontFamily: F,
            color: '#4F555C',
            lineHeight: 1.5,
            marginBottom: 10,
            ...twoLineClamp,
          }}>
            {character.title}
          </div>

          <div style={{
            fontSize: 11,
            fontFamily: FM,
            color: '#A4A6AC',
            letterSpacing: '0.06em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: 48,
          }}>
            {character.era}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignContent: 'flex-start', overflow: 'hidden', maxHeight: 58 }}>
          {statusItems.length > 0 ? statusItems : <StatusPill>未配置</StatusPill>}
          {character.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              fontSize: 11,
              fontFamily: FM,
              color: selected ? ACCENT : '#6E6E73',
              background: selected ? `${ACCENT}0F` : '#F5F5F7',
              border: `1px solid ${selected ? `${ACCENT}28` : 'rgba(0,0,0,0.06)'}`,
              padding: '3px 8px',
              borderRadius: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <IconToolButton
            active={hasSprite}
            color="#1F9D55"
            title={hasSprite ? '重新生成像素形象' : '生成像素形象'}
            onClick={e => { e.stopPropagation(); onSpriteGen(character); }}
          >
            <Image size={15} />
          </IconToolButton>
          <IconToolButton
            active={sceneCount > 0}
            color="#8E44AD"
            title={sceneCount > 0 ? '查看或重新生成小舞台' : '生成桌面小舞台'}
            onClick={e => { e.stopPropagation(); onSceneGen(character); }}
          >
            <Clapperboard size={15} />
          </IconToolButton>
        </div>

        <div style={{
          display: 'none',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          maxWidth: 92,
        }}>
          {statusItems.length > 0 ? statusItems : <StatusPill>未配置</StatusPill>}
        </div>
      </div>
    </div>
  );
}

// ─── Summon New Card ─────────────────────────────────────────
function SummonNewCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: '1.5px dashed rgba(0,0,0,0.12)',
        background: '#FAFAFA',
        borderRadius: CARD_RADIUS,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, minHeight: 342,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${ACCENT}55`;
        e.currentTarget.style.background = `${ACCENT}05`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
        e.currentTarget.style.background = '#FAFAFA';
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: '#F0F0F0', border: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8E8E93', transition: 'all 0.18s',
      }}>
        <Plus size={20} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 10, fontFamily: FM, color: '#C7C7CC',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>NEW HERALD</div>
        <div style={{ fontSize: 15, fontFamily: F, fontWeight: 600, color: '#3A3A3C', marginTop: 6 }}>
          召唤新英灵
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────
export function SelectionApp({ onEnterPet }: Props) {
  const [view, setView]         = useState<'hall' | 'summon' | 'sprite' | 'scene'>('hall');
  const [characters, setCharacters] = useState<Character[]>(loadCharacters);
  const [selectedId, setSelectedId] = useState<string | null>(characters[0]?.id ?? null);
  const [spriteTarget, setSpriteTarget] = useState<Character | null>(null);
  const [sceneTarget, setSceneTarget] = useState<Character | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [exportMsg, setExportMsg]   = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const cfg = AppConfig.get();
  const [apiKey, setApiKey]         = useState(cfg.apiKey);
  const [apiBase, setApiBase]       = useState(cfg.apiBase);
  const [imageApiKey, setImageApiKey] = useState(cfg.imageApiKey);
  const [imageApiBase, setImageApiBase] = useState(cfg.imageApiBase);
  const [imageModel, setImageModel] = useState(cfg.imageModel);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const win = useMemo(() => getCurrentWindow(), []);

  const refreshChars = useCallback(() => setCharacters(loadCharacters()), []);

  useEffect(() => {
    refreshChars();

    let disposed = false;

    const restoreMainWindow = async () => {
      await win.setAlwaysOnTop(false);
      await win.setResizable(true);
      await win.setMinSize(new LogicalSize(MAIN_WINDOW_MIN_SIZE.width, MAIN_WINDOW_MIN_SIZE.height));
      await win.setSize(new LogicalSize(MAIN_WINDOW_SIZE.width, MAIN_WINDOW_SIZE.height));
      if (!disposed) await win.center();
    };

    restoreMainWindow().catch(console.error);
    return () => { disposed = true; };
  }, [refreshChars, win]);

  const handleSaveSettings = useCallback(() => {
    AppConfig.save({ apiKey, apiBase, imageApiKey, imageApiBase, imageModel });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }, [apiKey, apiBase, imageApiKey, imageApiBase, imageModel]);

  const handleSummonComplete = useCallback((id: string) => {
    refreshChars(); setSelectedId(id); setView('hall');
  }, [refreshChars]);

  const handleOpenSprite = useCallback((char: Character) => {
    setSpriteTarget(char);
    setView('sprite');
  }, []);

  const handleOpenScene = useCallback((char: Character) => {
    setSceneTarget(char);
    setView('scene');
  }, []);

  const handleSpriteDone = useCallback((updated: Character) => {
    refreshChars();
    setSelectedId(updated.id);
    setView('hall');
  }, [refreshChars]);

  const handleConfirm = useCallback(() => {
    const char = characters.find(c => c.id === selectedId);
    if (char) onEnterPet(char);
  }, [characters, selectedId, onEnterPet]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && selectedId) handleConfirm(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleConfirm, selectedId]);

  if (view === 'summon') {
    return (
      <div style={{ ...appFrameStyle, overflow: 'hidden' }}>
        <TitleBar onMinimize={() => win.minimize()} onClose={() => win.close()} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SummonPage onComplete={handleSummonComplete} onBack={() => setView('hall')} />
        </div>
      </div>
    );
  }

  if (view === 'sprite' && spriteTarget) {
    return (
      <div style={{ ...appFrameStyle, overflow: 'hidden' }}>
        <TitleBar onMinimize={() => win.minimize()} onClose={() => win.close()} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SpriteGenPage
            character={spriteTarget}
            onBack={() => setView('hall')}
            onDone={handleSpriteDone}
          />
        </div>
      </div>
    );
  }

  if (view === 'scene' && sceneTarget) {
    return (
      <div style={{ ...appFrameStyle, overflow: 'hidden' }}>
        <TitleBar onMinimize={() => win.minimize()} onClose={() => win.close()} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SceneGenPage
            character={sceneTarget}
            onBack={() => setView('hall')}
            onDone={(updated) => {
              refreshChars();
              setSelectedId(updated.id);
              setView('hall');
            }}
          />
        </div>
      </div>
    );
  }

  const selectedChar = characters.find(c => c.id === selectedId);

  return (
    <div style={{ ...appFrameStyle, overflow: 'hidden' }}>
      <TitleBar onMinimize={() => win.minimize()} onClose={() => win.close()} />

      {/* Header */}
      <div style={{
        padding: '20px 30px 18px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: '#FFFFFF',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0, overflow: 'hidden' }}>
            <h1 style={{
              fontFamily: F, fontSize: 28, fontWeight: 800,
              color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em', flexShrink: 0,
            }}>
              英灵殿
            </h1>
            <span style={{
              fontSize: 11, fontFamily: FM, color: '#B8B8BE', letterSpacing: '0.18em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              HERALD SELECTION SYSTEM
            </span>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Settings */}
            <button
              onClick={() => setShowSettings(v => !v)}
              title="API 设置"
              style={{
                width: 40,
                height: 36,
                background: showSettings ? `${ACCENT}12` : 'transparent',
                border: `1px solid ${showSettings ? `${ACCENT}55` : 'rgba(0,0,0,0.1)'}`,
                borderRadius: 8,
                color: showSettings ? ACCENT : '#8E8E93',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={16} />
            </button>
            {/* Export */}
            <button
              onClick={async () => {
                setExporting(true); setExportMsg('');
                const ok = await exportSeed();
                setExporting(false);
                setExportMsg(ok ? '✓ 已导出' : '✗ 失败');
                setTimeout(() => setExportMsg(''), 3000);
              }}
              disabled={exporting}
              title="导出所有数据到 yingling_seed.json，与 exe 一起打包分发"
              style={{
                height: 36,
                background: 'transparent',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8, padding: '0 12px',
                fontSize: 11, fontFamily: FM, letterSpacing: '0.06em',
                color: exportMsg.startsWith('✓') ? '#34C759' : exportMsg.startsWith('✗') ? '#FF3B30' : '#AEAEB2',
                cursor: exporting ? 'default' : 'pointer',
                transition: 'all 0.15s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
              onMouseEnter={e => { if (!exporting) { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = '#6E6E73'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = exportMsg.startsWith('✓') ? '#34C759' : exportMsg.startsWith('✗') ? '#FF3B30' : '#AEAEB2'; }}
            >
              <Download size={14} />
              {exporting ? 'EXPORTING…' : exportMsg || 'EXPORT DATA'}
            </button>
          </div>
        </div>
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, ${ACCENT}55 0%, transparent 65%)`,
        }} />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{
          background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '18px 30px 20px', flexShrink: 0,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px 18px',
        }}>
          {[
            { label: 'DeepSeek API Key', placeholder: 'sk-...（对话 + 灵魂蒸馏）', value: apiKey, onChange: setApiKey, type: 'password' as const },
            { label: 'Chat API Base URL', placeholder: 'https://api.deepseek.com', value: apiBase, onChange: setApiBase, type: 'text' as const },
            { label: 'Image API Key', placeholder: 'sk-...（像素形象生成）', value: imageApiKey, onChange: setImageApiKey, type: 'password' as const },
            { label: 'Image API Base URL', placeholder: 'https://api.openai.com/v1', value: imageApiBase, onChange: setImageApiBase, type: 'text' as const },
            { label: 'Image Model', placeholder: 'gpt-image-1', value: imageModel, onChange: setImageModel, type: 'text' as const },
          ].map(({ label, placeholder, value, onChange, type }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontFamily: FM, color: '#AEAEB2', letterSpacing: '0.08em', marginBottom: 4 }}>{label.toUpperCase()}</div>
              <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6,
                  height: 34,
                  padding: '0 10px', fontSize: 12, fontFamily: FM,
                  background: '#FAFAFA', color: '#1D1D1F', outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = `${ACCENT}70`)}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
              />
            </div>
          ))}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={handleSaveSettings}
              style={{
                padding: '5px 18px', background: settingsSaved ? '#34C759' : ACCENT,
                border: 'none', borderRadius: 6, color: '#FFF',
                fontSize: 12, fontFamily: FM, cursor: 'pointer', transition: 'background 0.2s',
              }}
            >{settingsSaved ? '已保存 ✓' : '保存'}</button>
          </div>
          <div style={{ gridColumn: '1 / -1', fontSize: 10, fontFamily: FM, color: '#C7C7CC', lineHeight: 1.6 }}>
            DeepSeek: <a href="https://platform.deepseek.com" style={{ color: ACCENT }}>platform.deepseek.com</a>
            {'  ·  '}Image API 支持任何 OpenAI 兼容接口（gpt-image-1, dall-e-3, 等）
          </div>
        </div>
      )}

      {/* Character Grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 30px 44px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16, alignContent: 'start',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.1) transparent',
      }}>
        {characters.map(char => (
          <CharacterCard
            key={char.id}
            character={char}
            selected={char.id === selectedId}
            onClick={() => setSelectedId(char.id)}
            onSpriteGen={handleOpenSprite}
            onSceneGen={handleOpenScene}
          />
        ))}
        <SummonNewCard onClick={() => setView('summon')} />
      </div>

      {/* Action Bar */}
      <div style={{
        minHeight: 72, borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '10px 30px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FFFFFF', flexShrink: 0,
        gap: 18,
      }}>
        <div style={{
          minWidth: 0, flex: 1, marginRight: 12,
        }}>
          {selectedChar ? (
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: F,
                fontSize: 15,
                fontWeight: 700,
                color: '#1D1D1F',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedChar.name}
              </div>
              <div style={{
                marginTop: 3,
                fontSize: 12,
                fontFamily: FM,
                color: '#6E6E73',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedChar.title} · {selectedChar.era}
              </div>
            </div>
          ) : '请选择英灵'}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!selectedChar}
          style={{
            padding: '0 24px', height: 42,
            background: selectedChar ? ACCENT : '#E5E5EA',
            border: 'none', borderRadius: 8,
            color: selectedChar ? '#FFFFFF' : '#AEAEB2',
            fontFamily: F, fontSize: 15, fontWeight: 700,
            cursor: selectedChar ? 'pointer' : 'default',
            transition: 'background 0.15s',
            letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', gap: 4,
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (selectedChar) e.currentTarget.style.background = '#0077ED'; }}
          onMouseLeave={e => { if (selectedChar) e.currentTarget.style.background = ACCENT; }}
        >
          确认降临 ›
        </button>
      </div>
    </div>
  );
}
