import { useMemo } from 'react';
import { useTransparentSprite } from '../../hooks/useTransparentSprite';
import { type PetState, getSpritesForCharacter } from '../../lib/petActions';
import type { Character } from '../../lib/types';

const RENDER_HEIGHT = 220;

interface Props {
  character: Character;
  state: PetState;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SpriteImage({ src, visible }: { src: string; visible: boolean }) {
  const transparentSrc = useTransparentSprite(src);
  return (
    <img
      src={transparentSrc}
      draggable={false}
      style={{
        position: 'absolute',
        bottom: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        height: RENDER_HEIGHT,
        width: 'auto',
        maxWidth: 200,
        imageRendering: 'pixelated',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.5))',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  );
}

export function PetSprite({ character, state, onMouseDown, onContextMenu }: Props) {
  const sprites = getSpritesForCharacter(character.id);
  const activeSrc = sprites?.[state];
  const uniqueSrcs = useMemo(() => [...new Set(Object.values(sprites ?? {}))], [sprites]);

  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{
        width: '100%', height: '100%',
        position: 'relative',
        cursor: 'grab',
        animation: 'petFloat 3.5s ease-in-out infinite',
      }}
    >
      {sprites && activeSrc ? (
        uniqueSrcs.map(src => (
          <SpriteImage key={src} src={src} visible={src === activeSrc} />
        ))
      ) : (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 30,
          transform: 'translateX(-50%)',
          minWidth: 132,
          padding: '18px 16px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#1D1D1F',
          userSelect: 'none',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{character.avatar || 'T'}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{character.name}</div>
          <div style={{ fontSize: 10, color: '#8E8E93', marginTop: 4 }}>Generate sprite first</div>
        </div>
      )}
    </div>
  );
}

export type { PetState };
