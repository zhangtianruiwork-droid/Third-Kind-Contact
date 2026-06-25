import { useState, useRef, useEffect, useCallback } from 'react';
import { Square } from 'lucide-react';
import { callDeepSeek } from '../lib/api';
import { CharacterStore, AppConfig } from '../lib/store';
import type { Character, Message } from '../lib/types';

interface Props {
  character: Character;
  onClose: () => void;
}

function getGreeting(char: Character): string {
  const title = char.title ? ` ? ${char.title}` : '';
  return `${char.name}${title}\n\n??????????????????????????`;
}

export function SoulChatOverlay({ character, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load or init conversation
  useEffect(() => {
    const saved = CharacterStore.getConversation(character.id);
    if (saved.length === 0) {
      setMessages([{
        id: 'init',
        role: 'assistant',
        content: getGreeting(character),
        timestamp: new Date().toISOString(),
      }]);
    } else {
      setMessages(saved);
    }
    textareaRef.current?.focus();
  }, [character.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveMessages = useCallback((msgs: Message[]) => {
    CharacterStore.saveConversation(character.id, msgs.filter(m => m.id !== 'init'));
  }, [character.id]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userContent = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setError('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date().toISOString(),
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg, assistantMsg];
    setMessages(nextMessages);
    setStreaming(true);

    const history = nextMessages
      .filter(m => m.id !== 'init' && m.id !== assistantId)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const { modelChat } = AppConfig.get();
    abortRef.current = new AbortController();

    try {
      let accumulated = '';
      await callDeepSeek(
        [{ role: 'system' as const, content: character.systemPrompt }, ...history],
        modelChat,
        chunk => {
          accumulated += chunk;
          const snap = accumulated;
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: snap } : m));
        },
        abortRef.current.signal,
      );
      const final = nextMessages.map(m => m.id === assistantId ? { ...m, content: accumulated } : m);
      saveMessages(final);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('abort')) {
        setError(`请求失败：${msg}`);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, character, saveMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    if (!confirm('确认清除与该英灵的全部对话记录？')) return;
    CharacterStore.clearConversation(character.id);
    setMessages([{ id: 'init', role: 'assistant', content: getGreeting(character), timestamp: new Date().toISOString() }]);
    setError('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(2, 2, 10, 0.97)',
      backdropFilter: 'blur(10px)',
      zIndex: 500,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: '1px solid rgba(212,175,55,0.18)',
        background: 'rgba(212,175,55,0.025)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 42, height: 42,
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 0 12px rgba(212,175,55,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            {character.avatar}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 16, fontWeight: 700,
              color: 'var(--text-gold)',
              textShadow: '0 0 8px rgba(212,175,55,0.4)',
              letterSpacing: '0.06em',
            }}>
              {character.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(212,175,55,0.45)',
              letterSpacing: '0.05em',
            }}>
              {character.title} · {streaming ? '思考中…' : '在线'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleClear}
            className="soul-btn"
            style={{ fontSize: 12, padding: '5px 12px', opacity: 0.6 }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            [ 清除记录 ]
          </button>
          <button
            onClick={onClose}
            className="soul-btn"
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.7)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)';
            }}
          >
            [ 结束对话 ]
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '24px 48px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        {messages.map(msg => (
          <MessageRow key={msg.id} message={msg} character={character}
            isStreaming={streaming && msg === messages[messages.length - 1] && msg.role === 'assistant'}
          />
        ))}

        {streaming && messages[messages.length - 1]?.content === '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {character.avatar}
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'rgba(212,175,55,0.5)',
              animation: 'goldPulse 1.2s ease-in-out infinite',
            }}>
              ▌ 正在凝神思虑……
            </span>
          </div>
        )}

        {error && (
          <div style={{
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.06)',
            padding: '8px 14px',
            color: '#f87171',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}>
            ✗ {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '14px 48px 20px',
        borderTop: '1px solid rgba(212,175,55,0.14)',
        background: 'rgba(212,175,55,0.015)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 900, margin: '0 auto' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`向 ${character.name} 发问…`}
            className="soul-input"
            rows={2}
            style={{
              flex: 1, resize: 'none',
              minHeight: 44, maxHeight: 160,
              borderRadius: 0,
            }}
            disabled={streaming}
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              style={{
                flexShrink: 0, width: 44, height: 44,
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'}
            >
              <Square style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="soul-btn"
              style={{
                flexShrink: 0, width: 44, height: 44,
                padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
                opacity: input.trim() ? 1 : 0.3,
                background: input.trim() ? 'rgba(212,175,55,0.1)' : 'transparent',
              }}
            >
              ▶
            </button>
          )}
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'rgba(212,175,55,0.25)',
          textAlign: 'center', marginTop: 8,
          letterSpacing: '0.12em',
        }}>
          ENTER 发送 · SHIFT+ENTER 换行 · ESC 退出 · {AppConfig.get().modelChat}
        </p>
      </div>
    </div>
  );
}

function MessageRow({
  message, character, isStreaming,
}: {
  message: Message; character: Character; isStreaming: boolean;
}) {
  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, marginTop: 2,
        }}>
          {character.avatar}
        </div>
        <div style={{ flex: 1, maxWidth: '82%' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'rgba(212,175,55,0.45)',
            marginBottom: 5, letterSpacing: '0.06em',
          }}>
            {character.name}
          </p>
          <div style={{
            background: 'rgba(212,175,55,0.045)',
            border: '1px solid rgba(212,175,55,0.16)',
            padding: '11px 16px',
            fontFamily: 'var(--font-zh)',
            fontSize: 14, lineHeight: 1.75,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {message.content}
            {isStreaming && message.content && (
              <span style={{
                display: 'inline-block',
                width: 7, height: 16,
                background: 'rgba(212,175,55,0.65)',
                marginLeft: 3,
                animation: 'goldPulse 0.8s ease-in-out infinite',
                verticalAlign: 'text-bottom',
              }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
      <div style={{
        width: 32, height: 32, flexShrink: 0,
        border: '1px solid rgba(212,175,55,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: 'rgba(212,175,55,0.6)',
        fontFamily: 'var(--font-mono)',
        marginTop: 2,
      }}>
        人
      </div>
      <div style={{ flex: 1, maxWidth: '82%', textAlign: 'right' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'rgba(212,175,55,0.3)',
          marginBottom: 5, letterSpacing: '0.06em',
        }}>
          来访者
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '11px 16px',
          fontFamily: 'var(--font-zh)',
          fontSize: 14, lineHeight: 1.75,
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          display: 'inline-block',
          textAlign: 'left',
          maxWidth: '100%',
        }}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
