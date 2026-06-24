import { useCallback, useEffect, useRef, useState } from 'react';
import { Square } from 'lucide-react';
import { callDeepSeek } from '../../lib/api';
import { AppConfig, CharacterStore } from '../../lib/store';
import { inferActionFromText, type PetState } from '../../lib/petActions';
import { inferSceneKindFromDialogue } from '../../lib/scenePlanner';
import type { CompanionSceneKind } from '../../lib/sceneTypes';
import type { Character, Message } from '../../lib/types';

interface Props {
  character: Character;
  width: number;
  onClose: () => void;
  onStreamingChange: (streaming: boolean) => void;
  onActionDetected: (action: PetState) => void;
  onSceneDetected?: (scene: CompanionSceneKind) => void;
}

function greeting(character: Character) {
  const title = character.title ? `, ${character.title}` : '';
  return `Hello, I am ${character.name}${title}.\n\nAsk me anything, or describe the situation you want to explore.`;
}

export function PetChatPanel({ character, width, onClose, onStreamingChange, onActionDetected, onSceneDetected }: Props) {
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
    onStreamingChange(streaming);
  }, [onStreamingChange, streaming]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const saveMessages = useCallback((next: Message[]) => {
    CharacterStore.saveConversation(character.id, next.filter(message => message.id !== 'init'));
  }, [character.id]);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const content = input.trim();
    onSceneDetected?.(inferSceneKindFromDialogue(content));

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date().toISOString() };
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '', timestamp: new Date().toISOString() };
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
      if (answer) onActionDetected(inferActionFromText(answer));
      if (answer) onSceneDetected?.(inferSceneKindFromDialogue(`${content}\n${answer}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('abort')) {
        setError(message);
        setMessages(current => current.filter(item => item.id !== assistantId));
      }
    } finally {
      setStreaming(false);
    }
  }, [character.systemPrompt, input, messages, onActionDetected, onSceneDetected, saveMessages, streaming]);

  const clear = () => {
    CharacterStore.clearConversation(character.id);
    setMessages([{ id: 'init', role: 'assistant', content: greeting(character), timestamp: new Date().toISOString() }]);
    setError('');
  };

  return (
    <aside style={{ width, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid rgba(0,0,0,0.08)' }}>
      <header style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{character.name}</div>
          <div style={{ color: streaming ? '#34c759' : '#8e8e93', fontSize: 11 }}>{streaming ? 'Replying...' : character.era}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clear} style={{ border: '1px solid rgba(0,0,0,0.12)', background: '#fff', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>Clear</button>
          <button onClick={onClose} style={{ border: '1px solid rgba(0,0,0,0.12)', background: '#fff', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>Close</button>
        </div>
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map(message => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
              <div style={{
                padding: '10px 12px',
                borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: isUser ? '#0071e3' : '#f2f2f7',
                color: isUser ? '#fff' : '#1d1d1f',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
                fontSize: 13,
              }}>
                {message.content || (streaming ? '...' : '')}
              </div>
            </div>
          );
        })}
        {error && <div style={{ color: '#ff3b30', fontSize: 12 }}>{error}</div>}
      </div>

      <footer style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
            if (event.key === 'Escape') onClose();
          }}
          placeholder={`Ask ${character.name}...`}
          rows={1}
          disabled={streaming}
          style={{ flex: 1, resize: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 10, padding: '9px 10px', fontSize: 13 }}
        />
        {streaming ? (
          <button onClick={() => abortRef.current?.abort()} style={{ width: 36, border: 'none', borderRadius: 10, background: '#ff3b30', color: '#fff', cursor: 'pointer' }}>
            <Square size={13} />
          </button>
        ) : (
          <button onClick={send} disabled={!input.trim()} style={{ minWidth: 54, border: 'none', borderRadius: 10, background: input.trim() ? '#0071e3' : '#c7c7cc', color: '#fff', cursor: input.trim() ? 'pointer' : 'default' }}>
            Send
          </button>
        )}
      </footer>
    </aside>
  );
}
