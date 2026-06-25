import { useState, useRef, useEffect, useCallback } from 'react';
import { Square } from 'lucide-react';
import { callDeepSeek } from '../../lib/api';
import { CharacterStore, AppConfig } from '../../lib/store';
import type { Character, Message } from '../../lib/types';
import { inferActionFromText, type PetState } from '../../lib/petActions';
import { inferSceneKindFromDialogue } from '../../lib/scenePlanner';
import type { CompanionSceneKind } from '../../lib/sceneTypes';

const F      = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM     = `'SF Mono','Roboto Mono',ui-monospace,monospace`;
const ACCENT = '#0071E3';

interface Props {
  character: Character;
  width: number;
  onClose: () => void;
  onStreamingChange: (streaming: boolean) => void;
  onActionDetected: (action: PetState) => void;
  onSceneDetected?: (scene: CompanionSceneKind) => void;
}

function getGreeting(char: Character): string {
  const title = char.title ? ` ? ${char.title}` : '';
  return `${char.name}${title}\n\n??????????????????????????`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// ── Message Row ────────────────────────────────────────────
function MessageRow({ message, character, isStreaming }: {
  message: Message; character: Character; isStreaming: boolean;
}) {
  const isAssistant = message.role === 'assistant';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isAssistant ? 'row' : 'row-reverse',
      alignItems: 'flex-end',
      gap: 8,
      padding: '2px 0 10px',
    }}>
      {/* Avatar */}
      {isAssistant && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#F0F0F0',
          border: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0, fontFamily: F, fontWeight: 600, color: '#6E6E73',
        }}>
          {character.name.slice(0, 1)}
        </div>
      )}

      <div style={{ maxWidth: '80%', minWidth: 0 }}>
        {/* Sender label */}
        {isAssistant && (
          <div style={{
            fontSize: 10, fontFamily: FM,
            color: '#AEAEB2', marginBottom: 3, letterSpacing: '0.04em',
          }}>
            {character.name}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isAssistant ? '#F1F1F3' : ACCENT,
          color: isAssistant ? '#1D1D1F' : '#FFFFFF',
          borderRadius: isAssistant ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
          padding: '10px 14px',
          fontSize: 13.5,
          lineHeight: 1.7,
          fontFamily: F,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content || (isStreaming
            ? <span style={{ fontFamily: FM, fontSize: 12, opacity: 0.5 }}>···</span>
            : null
          )}
          {isStreaming && message.content && (
            <span style={{
              display: 'inline-block',
              width: 2, height: 13,
              background: isAssistant ? '#6E6E73' : 'rgba(255,255,255,0.75)',
              marginLeft: 2,
              verticalAlign: 'text-bottom',
              animation: 'blink 0.9s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Timestamp */}
        <div style={{
          fontSize: 9, fontFamily: FM, color: '#C7C7CC',
          marginTop: 3,
          textAlign: isAssistant ? 'left' : 'right',
          letterSpacing: '0.04em',
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────
export function PetChatPanel({ character, width, onClose, onStreamingChange, onActionDetected, onSceneDetected }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError]         = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = CharacterStore.getConversation(character.id);
    setMessages(saved.length === 0
      ? [{ id: 'init', role: 'assistant', content: getGreeting(character), timestamp: new Date().toISOString() }]
      : saved
    );
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [character.id, character]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { onStreamingChange(streaming); }, [streaming, onStreamingChange]);

  const saveMessages = useCallback((msgs: Message[]) => {
    CharacterStore.saveConversation(character.id, msgs.filter(m => m.id !== 'init'));
  }, [character.id]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput('');
    setError('');
    onSceneDetected?.(inferSceneKindFromDialogue(content));

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date().toISOString() };
    const aId = (Date.now() + 1).toString();
    const aMsg: Message = { id: aId, role: 'assistant', content: '', timestamp: new Date().toISOString() };

    const next = [...messages, userMsg, aMsg];
    setMessages(next);
    setStreaming(true);

    const history = next
      .filter(m => m.id !== 'init' && m.id !== aId)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    abortRef.current = new AbortController();
    const { modelChat } = AppConfig.get();

    try {
      let acc = '';
      await callDeepSeek(
        [{ role: 'system', content: character.systemPrompt }, ...history],
        modelChat,
        chunk => {
          acc += chunk;
          const snap = acc;
          setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: snap } : m));
        },
        abortRef.current.signal,
      );
      const final = next.map(m => m.id === aId ? { ...m, content: acc } : m);
      saveMessages(final);
      if (acc) onActionDetected(inferActionFromText(acc));
      if (acc) onSceneDetected?.(inferSceneKindFromDialogue(`${content}\n${acc}`));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('abort')) {
        setError(msg);
        setMessages(prev => prev.filter(m => m.id !== aId));
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, character, saveMessages, onActionDetected, onSceneDetected]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') onClose();
  };

  const handleClear = () => {
    if (!confirm(`清除与${character.name}的全部对话记录？`)) return;
    CharacterStore.clearConversation(character.id);
    setMessages([{ id: 'init', role: 'assistant', content: getGreeting(character), timestamp: new Date().toISOString() }]);
    setError('');
  };

  return (
    <div style={{
      width, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#FFFFFF',
      borderLeft: '1px solid rgba(0,0,0,0.07)',
      overflow: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F5F5F7',
      }}>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 600, fontFamily: F,
            color: '#1D1D1F', letterSpacing: '-0.01em',
          }}>
            {character.name}
          </div>
          <div style={{
            fontSize: 10, fontFamily: FM, marginTop: 1, letterSpacing: '0.06em',
            color: streaming ? '#34C759' : '#AEAEB2',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: streaming ? '#34C759' : '#AEAEB2',
              display: 'inline-block',
            }} />
            {streaming ? '正在回复…' : character.era}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'CLR', onClick: handleClear, muted: true },
            { label: '✕',   onClick: onClose,     muted: false },
          ].map(({ label, onClick, muted }) => (
            <button key={label} onClick={onClick} style={{
              padding: '3px 10px', height: 26,
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 6,
              color: muted ? '#C7C7CC' : '#6E6E73',
              fontFamily: FM, fontSize: 10, letterSpacing: '0.06em',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1D1D1F'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted ? '#C7C7CC' : '#6E6E73'; }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Messages ────────────────────────────── */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 14px 6px',
        display: 'flex', flexDirection: 'column',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent',
      }}>
        {messages.map((msg, i) => (
          <MessageRow
            key={msg.id}
            message={msg}
            character={character}
            isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {error && (
          <div style={{
            fontSize: 12, fontFamily: FM, color: '#FF3B30',
            border: '1px solid rgba(255,59,48,0.15)',
            borderRadius: 8, padding: '8px 12px',
            background: 'rgba(255,59,48,0.04)', marginTop: 4,
          }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* ── Input ───────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(0,0,0,0.06)',
        background: '#F5F5F7',
        padding: '10px 12px 10px',
        flexShrink: 0,
      }}>
        <div
          style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            background: '#FFFFFF',
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: 14,
            padding: '8px 8px 8px 14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = `${ACCENT}70`)}
          onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`向${character.name}提问…`}
            disabled={streaming}
            rows={1}
            style={{
              flex: 1, resize: 'none',
              background: 'transparent', border: 'none', outline: 'none',
              color: '#1D1D1F', padding: 0,
              fontSize: 13.5, fontFamily: F, lineHeight: 1.6,
              minHeight: 22, maxHeight: 110,
            }}
          />

          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              title="中止"
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'rgba(255,59,48,0.08)',
                border: '1px solid rgba(255,59,48,0.18)',
                color: '#FF3B30', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,59,48,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,59,48,0.08)')}
            >
              <Square style={{ width: 11, height: 11 }} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              title="发送 (Enter)"
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: input.trim() ? ACCENT : '#E5E5EA',
                border: 'none',
                color: input.trim() ? '#FFFFFF' : '#AEAEB2',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (input.trim()) e.currentTarget.style.background = '#0077ED'; }}
              onMouseLeave={e => { if (input.trim()) e.currentTarget.style.background = ACCENT; }}
            >
              ↑
            </button>
          )}
        </div>

        <div style={{
          fontSize: 9, fontFamily: FM, color: '#D1D1D6',
          textAlign: 'center', marginTop: 6, letterSpacing: '0.1em',
        }}>
          ENTER 发送 · SHIFT+ENTER 换行 · ESC 关闭
        </div>
      </div>
    </div>
  );
}
