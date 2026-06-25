import { useEffect, useRef } from 'react';
import type { Character } from '../../lib/types';

const F  = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM = `'SF Mono','Roboto Mono',ui-monospace,monospace`;

interface Props {
  x: number; y: number;
  character: Character;
  onOpenChat: () => void;
  onSwitchCharacter: () => void;
  onClose: () => void;
  onQuit: () => void;
}

function MenuItem({ children, onClick, danger }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <div
      onMouseDown={onClick}
      style={{
        padding: '7px 12px',
        fontSize: 13,
        fontFamily: F,
        color: danger ? '#FF3B30' : '#1D1D1F',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        borderRadius: 6,
        margin: '1px 4px',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(255,59,48,0.08)' : '#F5F5F7')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '3px 0' }} />;
}

export function PetContextMenu({ x, y, character, onOpenChat, onSwitchCharacter, onClose, onQuit }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'fixed', left: x, top: y,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.09)',
      borderRadius: 12,
      padding: '4px 0',
      zIndex: 9999,
      minWidth: 190,
      boxShadow: '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
    }}>
      <div style={{
        padding: '6px 12px 8px',
        fontSize: 11, fontFamily: FM,
        color: '#AEAEB2',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        marginBottom: 2,
        letterSpacing: '0.02em',
      }}>
        {character.name} · {character.era.slice(0, 14)}
      </div>

      <MenuItem onClick={() => { onClose(); onOpenChat(); }}>
        <span style={{ fontSize: 15 }}>💬</span>
        与{character.name}对话
      </MenuItem>

      <Divider />

      <MenuItem onClick={() => { onClose(); onSwitchCharacter(); }}>
        <span style={{ fontSize: 13, fontFamily: FM, color: '#6E6E73' }}>⇄</span>
        切换英灵
      </MenuItem>

      <Divider />

      <MenuItem onClick={() => { onClose(); onQuit(); }} danger>
        <span style={{ fontSize: 11, fontFamily: FM }}>✕</span>
        退出英灵殿
      </MenuItem>
    </div>
  );
}
