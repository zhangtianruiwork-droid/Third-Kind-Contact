import { useCallback, useEffect, useRef, useState } from 'react';
import { Square, X } from 'lucide-react';
import { callDeepSeek } from '../lib/api';
import { AppConfig, CharacterStore } from '../lib/store';
import type { Character, Message } from '../lib/types';

interface Props {
  character: Character;
  onClose: () => void;
}

function greeting(character: Character) {
  const title = character.title ? `, ${character.title}` : '';
  return `Hello, I am ${character.name}${title}.\n\nAsk me anything, or describe the situation you want to explore.`;
}

export function SoulChatOverlay({ character, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = CharacterStore.getConversation(character.id);
    setMessages(saved.length ? saved : [{
      id: 'init',
      role: 'assistant',
      content: greeting(character),
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
    setError('');
  }, [character]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveMessages = useCallback((next: Message[]) => {
    CharacterStore.saveConversation(character.id, next.filter(message => message.id !== 'init'));
  }, [character.id]);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMessage, assistantMessage];

    setMessages(next);
    setInput('');
    setError('');
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      let answer = '';
      const { modelChat } = AppConfig.get();
      const history = next
        .filter(message => message.id !== 'init' && message.id !== assistantId)
        .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content }));

      await callDeepSeek(
        [{ role: 'system', content: character.systemPrompt }, ...history],
        modelChat,
        chunk => {
          answer += chunk;
          setMessages(current => current.map(message => (
            message.id === assistantId ? { ...message, content: answer } : message
          )));
        },
        abortRef.current.signal,
      );

      const finalMessages = next.map(message => (
        message.id === assistantId ? { ...message, content: answer } : message
      ));
      saveMessages(finalMessages);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('abort')) {
        setError(message);
        setMessages(current => current.filter(item => item.id !== assistantId));
      }
    } finally {
      setStreaming(false);
    }
  }, [character.systemPrompt, input, messages, saveMessages, streaming]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(245,245,247,0.96)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 64, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{character.name}</div>
          <div style={{ color: '#6e6e73', fontSize: 12 }}>{streaming ? 'Replying...' : character.title}</div>
        </div>
        <button onClick={onClose} aria-label="Close chat" style={{ border: '1px solid rgba(0,0,0,0.12)', background: '#fff', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(message => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: 'min(720px, 82%)' }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? '#0071e3' : '#fff',
                color: isUser ? '#fff' : '#1d1d1f',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.65,
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              }}>
                {message.content || (streaming ? '...' : '')}
              </div>
            </div>
          );
        })}
        {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
      </div>

      <footer style={{ padding: 16, borderTop: '1px solid rgba(0,0,0,0.08)', background: '#fff', display: 'flex', gap: 10 }}>
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={`Ask ${character.name}...`}
          disabled={streaming}
          rows={1}
          style={{ flex: 1, resize: 'none', borderRadius: 10, border: '1px solid rgba(0,0,0,0.14)', padding: '10px 12px', fontSize: 14, lineHeight: 1.5 }}
        />
        {streaming ? (
          <button onClick={() => abortRef.current?.abort()} style={{ width: 42, border: 'none', borderRadius: 10, background: '#ff3b30', color: '#fff', cursor: 'pointer' }}>
            <Square size={14} />
          </button>
        ) : (
          <button onClick={send} disabled={!input.trim()} style={{ minWidth: 86, border: 'none', borderRadius: 10, background: input.trim() ? '#0071e3' : '#c7c7cc', color: '#fff', fontWeight: 700, cursor: input.trim() ? 'pointer' : 'default' }}>
            Send
          </button>
        )}
      </footer>
    </div>
  );
}
