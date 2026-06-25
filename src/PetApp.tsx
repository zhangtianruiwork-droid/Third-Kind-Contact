import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCurrentWindow, currentMonitor, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';
import { PetSprite } from './components/pet/PetSprite';
import { PixelPetSprite } from './components/pet/PixelPetSprite';
import { PetContextMenu } from './components/pet/PetContextMenu';
import { PetChatPanel } from './components/pet/PetChatPanel';
import { type PetState, randomIdleState, ACTION_DURATION, getSpritesForCharacter } from './lib/petActions';
import { CompanionStage } from './components/scene/CompanionStage';
import { SceneStore } from './lib/sceneStore';
import { sceneKindFromPetAction } from './lib/scenePlanner';
import type { CompanionSceneKind } from './lib/sceneTypes';
import type { Character } from './lib/types';

interface Props {
  character: Character;
  onExit: () => void;
}

const SPRITE_W = 180;
const SPRITE_H = 280;
const STAGE_W = 320;
const STAGE_H = 426;
const STAGE_MIN_W = 220;
const STAGE_MAX_W = 900;
const CHAT_H  = 520;
const MENU_W  = 178;
const MENU_H  = 110;
const WINDOW_MARGIN = 20;
const DESKTOP_RIGHT_MARGIN = 60;
const DESKTOP_BOTTOM_MARGIN = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function ratioToNumber(ratio?: string): number {
  switch (ratio) {
    case '16:9': return 16 / 9;
    case '4:3': return 4 / 3;
    case '1:1': return 1;
    case '3:4': return 3 / 4;
    case '9:16': return 9 / 16;
    case '21:9': return 21 / 9;
    default: return STAGE_W / STAGE_H;
  }
}

function stageSizeFromWidth(width: number, ratio: number): { width: number; height: number } {
  const safeRatio = ratio > 0 ? ratio : STAGE_W / STAGE_H;
  const nextWidth = Math.round(clamp(width, STAGE_MIN_W, STAGE_MAX_W));
  return {
    width: nextWidth,
    height: Math.round(nextWidth / safeRatio),
  };
}

async function getLogicalWorkArea() {
  const monitor = await currentMonitor();
  const sf = monitor?.scaleFactor ?? 1;
  const area = monitor?.workArea ?? {
    position: monitor?.position ?? { x: 0, y: 0 },
    size: monitor?.size ?? { width: 1920, height: 1080 },
  };

  return {
    x: Math.round(area.position.x / sf),
    y: Math.round(area.position.y / sf),
    width: Math.round(area.size.width / sf),
    height: Math.round(area.size.height / sf),
    scaleFactor: sf,
  };
}

export function PetApp({ character, onExit }: Props) {
  const [chatOpen, setChatOpen]   = useState(false);
  const [petState, setPetState]   = useState<PetState>('idle');
  const [sceneKind, setSceneKind] = useState<CompanionSceneKind>('idle');
  const [menuPos, setMenuPos]     = useState<{ x: number; y: number } | null>(null);
  const [winW, setWinW]           = useState(window.innerWidth);
  const [chatPanelW, setChatPanelW] = useState(420);
  const hasStaticSprites          = !!getSpritesForCharacter(character.id);
  const hasPixelSprites           = !!character.hasPixelSprites;
  const stageScenes               = useMemo(() => SceneStore.getPlayable(character.id), [character.id]);
  const hasStageScenes            = stageScenes.length > 0;
  const stageRatio                = useMemo(() => {
    const stageScene = stageScenes.find(scene => scene.kind === 'idle') || stageScenes[0];
    return ratioToNumber(stageScene?.ratio);
  }, [stageScenes]);
  const [stageSize, setStageSize] = useState(() => stageSizeFromWidth(STAGE_W, STAGE_W / STAGE_H));
  const companionW                = hasStageScenes ? stageSize.width : SPRITE_W;
  const companionH                = hasStageScenes ? stageSize.height : SPRITE_H;
  const appWindow                 = useMemo(() => getCurrentWindow(), []);

  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initializedRef = useRef(false);
  const chatOpenRef    = useRef(false);
  chatOpenRef.current  = chatOpen;

  useEffect(() => {
    if (!hasStageScenes) return;
    setStageSize(prev => stageSizeFromWidth(prev.width, stageRatio));
  }, [hasStageScenes, stageRatio]);

  useEffect(() => {
    if (!initializedRef.current || !hasStageScenes || chatOpen) return;
    void appWindow.setSize(new LogicalSize(stageSize.width, stageSize.height));
  }, [appWindow, chatOpen, hasStageScenes, stageSize.height, stageSize.width]);

  const getWindowLogicalPosition = useCallback(async () => {
    const workArea = await getLogicalWorkArea();
    const pos = await appWindow.outerPosition();
    return {
      x: Math.round(pos.x / workArea.scaleFactor),
      y: Math.round(pos.y / workArea.scaleFactor),
      workArea,
    };
  }, [appWindow]);

  // ── 过渡到桌宠模式 ──────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let disposed = false;
    const init = async () => {
      const workArea = await getLogicalWorkArea();
      if (disposed) return;

      const x = clamp(
        workArea.x + workArea.width - companionW - DESKTOP_RIGHT_MARGIN,
        workArea.x + WINDOW_MARGIN,
        workArea.x + workArea.width - companionW - WINDOW_MARGIN,
      );
      const y = clamp(
        workArea.y + workArea.height - companionH - DESKTOP_BOTTOM_MARGIN,
        workArea.y + WINDOW_MARGIN,
        workArea.y + workArea.height - companionH - WINDOW_MARGIN,
      );

      await appWindow.setAlwaysOnTop(true);
      await appWindow.setResizable(false);
      await appWindow.setMinSize(null);
      await appWindow.setSize(new LogicalSize(companionW, companionH));
      await appWindow.setPosition(new LogicalPosition(x, y));
    };
    init().catch(console.error);

    return () => { disposed = true; };
  }, [appWindow, companionH, companionW]);

  // ── 监听窗口宽度（对话时可拖拽调整） ────────
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── 动作计时器 ──────────────────────────────
  const triggerAction = useCallback((action: PetState) => {
    clearTimeout(actionTimerRef.current);
    setPetState(action);
    const dur = ACTION_DURATION[action];
    if (dur && dur > 0) {
      actionTimerRef.current = setTimeout(() => {
        setPetState(chatOpenRef.current ? 'talking' : 'idle');
      }, dur);
    }
  }, []);

  // ── 待机随机切换 ────────────────────────────
  useEffect(() => {
    if (chatOpen) return;
    const schedule = () => {
      actionTimerRef.current = setTimeout(() => {
        Math.random() < 0.2 ? triggerAction('violin') : setPetState(randomIdleState());
        schedule();
      }, 12000 + Math.random() * 18000);
    };
    schedule();
    return () => clearTimeout(actionTimerRef.current);
  }, [chatOpen, triggerAction]);

  // ── 打开对话 ────────────────────────────────
  const openChat = useCallback(async () => {
    setMenuPos(null);
    setSceneKind('listening');
    triggerAction('waving'); // greet on open
    actionTimerRef.current = setTimeout(() => setPetState('thinking'), 2200);

    const initChatW = Math.min(Math.max(420, winW - companionW), 600);
    const nextW = companionW + initChatW;
    const nextH = Math.max(CHAT_H, companionH);
    setChatPanelW(initChatW);

    try {
      const { x, y, workArea } = await getWindowLogicalPosition();
      const nextX = clamp(
        x - initChatW,
        workArea.x + WINDOW_MARGIN,
        workArea.x + workArea.width - nextW - WINDOW_MARGIN,
      );
      const nextY = clamp(
        y,
        workArea.y + WINDOW_MARGIN,
        workArea.y + workArea.height - nextH - WINDOW_MARGIN,
      );
      await appWindow.setPosition(new LogicalPosition(nextX, nextY));
    } catch (error) {
      console.warn('Failed to reposition chat window', error);
    }

    await appWindow.setResizable(true);
    await appWindow.setMinSize(new LogicalSize(companionW + 300, 400));
    await appWindow.setSize(new LogicalSize(nextW, nextH));
    setChatOpen(true);
  }, [appWindow, companionH, companionW, getWindowLogicalPosition, winW, triggerAction]);

  // ── 关闭对话 ────────────────────────────────
  const closeChat = useCallback(async () => {
    const actualChatW = Math.max(0, window.innerWidth - companionW);
    let nextPosition: { x: number; y: number } | null = null;

    try {
      const { x, y, workArea } = await getWindowLogicalPosition();
      nextPosition = {
        x: clamp(
          x + actualChatW,
          workArea.x + WINDOW_MARGIN,
          workArea.x + workArea.width - companionW - WINDOW_MARGIN,
        ),
        y: clamp(
          y,
          workArea.y + WINDOW_MARGIN,
          workArea.y + workArea.height - companionH - WINDOW_MARGIN,
        ),
      };
    } catch (error) {
      console.warn('Failed to preserve stage position while closing chat', error);
    }

    setChatOpen(false);
    clearTimeout(actionTimerRef.current);
    setPetState('idle');
    setSceneKind('idle');
    await appWindow.setResizable(false);
    await appWindow.setMinSize(null);
    await appWindow.setSize(new LogicalSize(companionW, companionH));
    if (nextPosition) {
      await appWindow.setPosition(new LogicalPosition(nextPosition.x, nextPosition.y));
    }
  }, [appWindow, companionH, companionW, getWindowLogicalPosition]);

  // ── 返回选角界面 ────────────────────────────
  const handleExit = useCallback(async () => {
    setMenuPos(null);
    setChatOpen(false);
    clearTimeout(actionTimerRef.current);
    await appWindow.setAlwaysOnTop(false);
    await appWindow.setResizable(true);
    await appWindow.setMinSize(new LogicalSize(900, 620));
    await appWindow.setSize(new LogicalSize(1280, 820));
    await appWindow.center();
    onExit();
  }, [appWindow, onExit]);

  // ── 拖拽 → 跑步 ─────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      triggerAction('running');
      // Auto-revert to idle after drag (Tauri takes over mouse, so use timer)
      actionTimerRef.current = setTimeout(() => {
        setPetState(chatOpenRef.current ? 'talking' : 'idle');
      }, 3000);
      appWindow.startDragging();
    }
  }, [appWindow, triggerAction]);

  // ── 双击 → 跳跃 ────────────────────────────
  const handleDoubleClick = useCallback(() => {
    triggerAction('jumping');
  }, [triggerAction]);

  // ── 悬停 → idle2 ────────────────────────────
  const handleMouseEnter = useCallback(() => {
    setPetState(prev => (prev === 'idle' || prev === 'idle3') ? 'idle2' : prev);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPetState(prev => prev === 'idle2' ? 'idle' : prev);
  }, []);

  // ── 右键菜单 → idle3 ────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPetState('idle3');
    const ww = window.innerWidth, wh = window.innerHeight;
    setMenuPos({
      x: Math.min(e.clientX, ww - MENU_W - 4),
      y: Math.min(e.clientY, wh - MENU_H - 4),
    });
  }, []);

  const handleStageResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasStageScenes || chatOpenRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.screenX;
    const startY = e.screenY;
    const startW = stageSize.width;
    const ratio = stageRatio;

    const onMove = (event: PointerEvent) => {
      const dx = event.screenX - startX;
      const dy = event.screenY - startY;
      const widthDelta = Math.abs(dx) >= Math.abs(dy) ? dx : dy * ratio;
      const next = stageSizeFromWidth(startW + widthDelta, ratio);
      setStageSize(next);
      void appWindow.setSize(new LogicalSize(next.width, next.height));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }, [appWindow, hasStageScenes, stageRatio, stageSize.width]);

  // ── 流式输出变化 ─────────────────────────────
  const handleStreamingChange = useCallback((streaming: boolean) => {
    if (streaming) {
      clearTimeout(actionTimerRef.current);
      setPetState('thinking');
      setSceneKind('thinking');
    } else {
      // After reply: show talking briefly then return to idle
      setPetState('talking');
      setSceneKind('talking');
      actionTimerRef.current = setTimeout(() => {
        setPetState(chatOpenRef.current ? 'idle2' : 'idle');
        setSceneKind(chatOpenRef.current ? 'listening' : 'idle');
      }, 4000);
    }
  }, []);

  const handleActionDetected = useCallback((action: PetState) => {
    triggerAction(action);
    setSceneKind(sceneKindFromPetAction(action));
  }, [triggerAction]);

  const handleSceneDetected = useCallback((scene: CompanionSceneKind) => {
    setSceneKind(scene);
  }, []);

  const chatW = chatOpen ? Math.max(300, winW > companionW ? winW - companionW : chatPanelW) : chatPanelW;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        display: 'flex',
        flexDirection: chatOpen ? 'row-reverse' : 'row',
        overflow: 'hidden',
      }}
      onClick={() => setMenuPos(null)}
    >
      {/* 精灵区 */}
      <div
        style={{ width: companionW, height: '100%', flexShrink: 0, padding: hasStageScenes ? 8 : 0, boxSizing: 'border-box', position: 'relative' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        {hasStageScenes ? (
          <CompanionStage
            character={character}
            sceneKind={sceneKind}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
          />
        ) : hasPixelSprites ? (
          <PixelPetSprite
            character={character}
            state={petState}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
          />
        ) : hasStaticSprites
            ? <PetSprite
                character={character}
                state={petState}
                onMouseDown={handleMouseDown}
                onContextMenu={handleContextMenu}
              />
            : <EmojiFallback
                character={character}
                onMouseDown={handleMouseDown}
                onContextMenu={handleContextMenu}
              />
        }
        {hasStageScenes && !chatOpen && (
          <div
            title="拖拽缩放舞台"
            onPointerDown={handleStageResizePointerDown}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 22,
              height: 22,
              borderRadius: 8,
              cursor: 'nwse-resize',
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.16)',
              backdropFilter: 'blur(10px)',
              zIndex: 4,
            }}
          >
            <span style={{
              position: 'absolute',
              right: 5,
              bottom: 5,
              width: 8,
              height: 8,
              borderRight: '2px solid rgba(29,29,31,0.55)',
              borderBottom: '2px solid rgba(29,29,31,0.55)',
            }} />
          </div>
        )}
      </div>

      {/* 对话面板（宽度跟随窗口） */}
      {chatOpen && (
        <PetChatPanel
          character={character}
          width={chatW}
          onClose={closeChat}
          onStreamingChange={handleStreamingChange}
          onActionDetected={handleActionDetected}
          onSceneDetected={handleSceneDetected}
        />
      )}

      {/* 右键菜单 */}
      {menuPos && (
        <PetContextMenu
          x={menuPos.x}
          y={menuPos.y}
          character={character}
          onOpenChat={openChat}
          onSwitchCharacter={handleExit}
          onClose={() => setMenuPos(null)}
          onQuit={() => appWindow.close()}
        />
      )}
    </div>
  );
}

// ── 无精灵角色的 emoji 后备 ───────────────────
function EmojiFallback({
  character, onMouseDown, onContextMenu,
}: {
  character: Character;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 8,
        cursor: 'grab',
        animation: 'petFloat 3.5s ease-in-out infinite',
      }}
    >
      <div style={{
        fontSize: 80,
        filter: 'drop-shadow(0 8px 20px rgba(212,175,55,0.4))',
        userSelect: 'none',
        lineHeight: 1,
      }}>
        {character.avatar}
      </div>
    </div>
  );
}
