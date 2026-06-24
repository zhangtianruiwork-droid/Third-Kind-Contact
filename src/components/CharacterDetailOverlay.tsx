import { useEffect, useCallback } from 'react';
import type { Character } from '../lib/types';

interface Props {
  character: Character | null;
  onClose: () => void;
  onOpenChat: () => void;
}

function SectionBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        marginBottom: '8px',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        paddingBottom: '4px',
      }}>
        ◆ {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            fontSize: '13px',
            lineHeight: 1.55,
            color: 'rgba(212,175,55,0.82)',
            paddingLeft: '13px',
            position: 'relative',
            fontFamily: 'var(--font-zh)',
          }}>
            <span style={{
              position: 'absolute', left: 0, top: '7px',
              width: '4px', height: '4px',
              background: 'rgba(212,175,55,0.45)',
              borderRadius: '50%',
            }} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteBlock({ quotes }: { quotes: string[] }) {
  if (!quotes.length) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--text-dim)',
        marginBottom: '8px',
        borderBottom: '1px solid rgba(212,175,55,0.1)',
        paddingBottom: '4px',
      }}>
        ◆ 灵魂印记 · 经典语录
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {quotes.map((q, i) => (
          <div key={i} style={{
            fontSize: '13px',
            lineHeight: 1.65,
            color: 'rgba(212,175,55,0.75)',
            fontStyle: 'italic',
            padding: '8px 12px',
            background: 'rgba(212,175,55,0.04)',
            borderLeft: '2px solid rgba(212,175,55,0.3)',
            fontFamily: 'var(--font-zh)',
          }}>
            「{q}」
          </div>
        ))}
      </div>
    </div>
  );
}

export function CharacterDetailOverlay({ character, onClose, onOpenChat }: Props) {
  const open = !!character;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleStart = useCallback(() => {
    onClose();
    setTimeout(onOpenChat, 60);
  }, [onClose, onOpenChat]);

  if (!character) return null;

  const sp = character.soulProfile;
  const coreTraits = sp?.coreTraits.map(t => t.name) ?? [];
  const methodology = sp?.methodology.map(m => `${m.name} — ${m.description}`) ?? [];
  const mentalModels = sp?.mentalModels.map(m => m.name) ?? [];
  const signatures = sp?.dialogueProtocols.signature ?? [];
  const quotes = sp?.quotes ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2, 2, 10, 0.94)',
        backdropFilter: 'blur(14px)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 48px',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Close [×] */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: '24px', right: '32px',
          background: 'transparent', border: 'none',
          color: 'rgba(212,175,55,0.5)',
          fontSize: '26px', lineHeight: 1, cursor: 'pointer',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          transition: 'color 0.2s',
          zIndex: 301,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.5)')}
      >
        [×]
      </button>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 300px) minmax(0, 1fr)',
          gap: '52px',
          maxWidth: '1100px',
          width: '100%',
          maxHeight: '90vh',
          alignItems: 'start',
          transform: open ? 'scale(1)' : 'scale(0.97)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* LEFT — portrait frame + meta + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Portrait frame */}
          <div style={{
            position: 'relative',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 0 40px rgba(212,175,55,0.1), inset 0 0 40px rgba(212,175,55,0.03)',
            padding: '28px 44px',
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Corner brackets */}
            <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid var(--gold)', borderLeft: '2px solid var(--gold)' }} />
            <div style={{ position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTop: '2px solid var(--gold)', borderRight: '2px solid var(--gold)' }} />
            <div style={{ position: 'absolute', bottom: -1, left: -1, width: 14, height: 14, borderBottom: '2px solid var(--gold)', borderLeft: '2px solid var(--gold)' }} />
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '2px solid var(--gold)', borderRight: '2px solid var(--gold)' }} />
            <div style={{
              fontSize: '96px',
              filter: 'drop-shadow(0 0 24px rgba(212,175,55,0.55))',
              lineHeight: 1,
              textAlign: 'center',
            }}>
              {character.avatar}
            </div>
          </div>

          {/* Basic meta below frame */}
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(212,175,55,0.6)', letterSpacing: '0.05em' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--text-gold)', marginBottom: '4px', textShadow: '0 0 16px rgba(212,175,55,0.35)' }}>
              {character.name} · {character.title}
            </div>
            <div>{character.era}</div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
            {character.tags.map(tag => (
              <span key={tag} style={{
                background: 'rgba(212,175,55,0.07)',
                border: '1px solid rgba(212,175,55,0.18)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '2px 8px',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex', gap: '10px', marginTop: '4px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(212,175,55,0.12)',
            width: '100%', justifyContent: 'center',
          }}>
            <button onClick={handleStart} className="btn-gold" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.08em' }}>
              ▶ 开始对话
            </button>
            <button onClick={onClose} className="btn-ghost" style={{ fontSize: '13px' }}>
              关闭
            </button>
          </div>
        </div>

        {/* RIGHT — soul profile panel */}
        <div style={{
          color: 'var(--text-primary)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '86vh', overflowY: 'auto',
          paddingRight: '6px',
        }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: '0 0 12px',
          }}>
            {character.tags[0] ?? '英灵'} — 灵魂档案
          </p>

          {/* Title */}
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(20px, 2.2vw, 30px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '0.02em',
            margin: '0 0 14px',
            color: 'var(--text-gold)',
            textShadow: '0 0 12px rgba(212,175,55,0.25)',
          }}>
            {character.title}
          </h2>

          {/* Description */}
          <p style={{
            fontFamily: 'var(--font-zh)',
            fontSize: '13px',
            lineHeight: 1.75,
            color: 'rgba(212,175,55,0.7)',
            margin: '0 0 20px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(212,175,55,0.12)',
          }}>
            {character.description}
          </p>

          {/* Profile sections */}
          {sp ? (
            <>
              <SectionBlock title="核心特性" items={coreTraits} />
              <SectionBlock title="方法论内核" items={methodology} />
              <SectionBlock title="阶段对话协议" items={signatures} />
              <SectionBlock title="核心心智模型" items={mentalModels} />
              <QuoteBlock quotes={quotes} />
            </>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px', paddingTop: '32px' }}>
              此英灵尚无详细档案
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
