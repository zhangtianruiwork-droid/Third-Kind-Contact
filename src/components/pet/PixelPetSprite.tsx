import { useState, useEffect } from 'react';
import { SpriteStore } from '../../lib/spriteStore';
import { ALL_POSES, POSE_INFO, type PetState } from '../../lib/petActions';
import type { Character } from '../../lib/types';

const RENDER_H = 200;

const POSE_ANIM: Record<PetState, string> = {
  idle:     'pixelIdle 2.4s ease-in-out infinite',
  idle2:    'pixelIdle 2.8s ease-in-out infinite',
  idle3:    'pixelIdle 3.1s ease-in-out infinite',
  thinking: 'pixelThink 3s ease-in-out infinite',
  talking:  'pixelTalk 0.4s ease-in-out infinite',
  running:  'pixelRun 0.28s linear infinite alternate',
  jumping:  'pixelJump 0.7s ease-in-out infinite',
  waving:   'pixelWave 0.32s ease-in-out infinite alternate',
  violin:   'pixelHero 2.2s ease-in-out infinite',
};

interface Props {
  character: Character;
  state: PetState;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function b64ToSrc(b64: string): string {
  return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

export function PixelPetSprite({ character, state, onMouseDown, onContextMenu }: Props) {
  const [sprites, setSprites] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    SpriteStore.getAll(character.id, ALL_POSES).then(s => {
      setSprites(s);
      setLoaded(true);
    });
  }, [character.id]);

  const currentB64 = sprites[state];
  const fallbackB64 = sprites['idle'] ?? Object.values(sprites).find(v => v != null) ?? null;
  const activeSrc = currentB64 ? b64ToSrc(currentB64) : (fallbackB64 ? b64ToSrc(fallbackB64) : null);

  if (!loaded || !activeSrc) {
    return (
      <div onMouseDown={onMouseDown} onContextMenu={onContextMenu}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, cursor: 'grab' }}>
        <div style={{ fontSize: 80, filter: 'drop-shadow(0 8px 20px rgba(212,175,55,0.4))', userSelect: 'none', animation: 'petFloat 3.5s ease-in-out infinite' }}>
          {character.avatar}
        </div>
      </div>
    );
  }

  const poseName = POSE_INFO[state]?.label ?? state;

  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab' }}
    >
      <img
        src={activeSrc}
        draggable={false}
        title={poseName}
        style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          height: RENDER_H,
          width: 'auto',
          maxWidth: 200,
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 6px 22px rgba(0,113,227,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          userSelect: 'none',
          pointerEvents: 'none',
          animation: POSE_ANIM[state],
        }}
      />
    </div>
  );
}

/** Checks if all 9 pixel sprites exist in IndexedDB for this character */
export async function hasPixelSprites(characterId: string): Promise<boolean> {
  return SpriteStore.hasAllSprites(characterId, ALL_POSES);
}
