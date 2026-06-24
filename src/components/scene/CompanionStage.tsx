import { useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from '../../lib/types';
import type { CompanionScene, CompanionSceneKind } from '../../lib/sceneTypes';
import { SCENE_KIND_LABELS } from '../../lib/sceneTypes';
import { SceneStore } from '../../lib/sceneStore';
import { toVideoAssetSrc } from '../../lib/seedanceApi';

const F = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM = `'SF Mono','Roboto Mono',ui-monospace,monospace`;

interface Props {
  character: Character;
  sceneKind: CompanionSceneKind;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function pickScene(scenes: CompanionScene[], sceneKind: CompanionSceneKind): CompanionScene | undefined {
  return scenes.find(scene => scene.kind === sceneKind)
    || scenes.find(scene => scene.kind === 'idle')
    || scenes[0];
}

export function CompanionStage({ character, sceneKind, onMouseDown, onContextMenu }: Props) {
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const scenes = useMemo(() => SceneStore.getPlayable(character.id), [character.id]);
  const active = pickScene(scenes, sceneKind);

  useEffect(() => {
    if (!active) return;
    const video = videoRefs.current[active.id];
    if (!video) return;
    try {
      video.currentTime = 0;
      void video.play();
    } catch {
      // Autoplay can briefly reject while the webview is restoring focus.
    }
  }, [active?.id, active]);

  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        background: 'rgba(12,16,24,0.01)',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: '0 18px 42px rgba(0,0,0,0.22)',
      }}
    >
      {scenes.length > 0 ? (
        scenes.map(scene => {
          const src = toVideoAssetSrc(scene.localPath);
          const isActive = active?.id === scene.id;
          return (
            <video
              key={scene.id}
              ref={el => { videoRefs.current[scene.id] = el; }}
              src={src}
              muted
              loop
              autoPlay
              playsInline
              preload="auto"
              onCanPlay={() => setVideoErrors(prev => {
                if (!prev[scene.id]) return prev;
                const next = { ...prev };
                delete next[scene.id];
                return next;
              })}
              onError={() => setVideoErrors(prev => ({
                ...prev,
                [scene.id]: '本地视频无法播放，请回到小舞台页检查预览或重新生成。',
              }))}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                pointerEvents: 'none',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 320ms ease',
              }}
            />
          );
        })
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f5f7fb, #e9edf5)',
          color: '#6E6E73',
          fontFamily: F,
          fontSize: 13,
          textAlign: 'center',
          padding: 20,
        }}>
          尚未生成小舞台视频
        </div>
      )}

      {active && videoErrors[active.id] && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 18,
          background: 'rgba(255,255,255,0.88)',
          color: '#FF3B30',
          fontFamily: F,
          fontSize: 12,
          lineHeight: 1.6,
          textAlign: 'center',
        }}>
          {videoErrors[active.id]}
        </div>
      )}

      <div style={{
        position: 'absolute',
        left: 10,
        top: 10,
        maxWidth: 'calc(100% - 20px)',
        padding: '5px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.55)',
        color: '#1D1D1F',
        fontSize: 10,
        fontFamily: FM,
        letterSpacing: '0.04em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        {active?.title || SCENE_KIND_LABELS[sceneKind]} · {character.name}
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 16,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24), inset 0 -60px 80px rgba(0,0,0,0.12)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}
