import { useEffect, useRef } from 'react';
import type { Character } from '../../lib/types';

interface Props {
  x: number;
  y: number;
  character: Character;
  onOpenChat: () => void;
  onSwitchCharacter: () => void;
  onClose: () => void;
  onQuit: () => void;
}

function MenuItem({ children, onClick, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <div
      onMouseDown={onClick}
      style={{
        padding: '7px 12px',
        fontSize: 13,
        color: danger ? '#ff3b30' : '#1d1d1f',
        cursor: 'pointer',
        borderRadius: 6,
        margin: '1px 4px',
      }}
      onMouseEnter={event => (event.currentTarget.style.background = danger ? 'rgba(255,59,48,0.08)' : '#f5f5f7')}
      onMouseLeave={event => (event.currentTarget.style.background = 'transparent')}
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
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.09)',
        borderRadius: 12,
        padding: '4px 0',
        zIndex: 9999,
        minWidth: 190,
        boxShadow: '0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
      }}
    >
      <div style={{ padding: '6px 12px 8px', fontSize: 11, color: '#8e8e93', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 2 }}>
        {character.name} / {character.era.slice(0, 18)}
      </div>
      <MenuItem onClick={() => { onClose(); onOpenChat(); }}>Open chat</MenuItem>
      <Divider />
      <MenuItem onClick={() => { onClose(); onSwitchCharacter(); }}>Switch companion</MenuItem>
      <Divider />
      <MenuItem onClick={() => { onClose(); onQuit(); }} danger>Quit desktop mode</MenuItem>
    </div>
  );
}
