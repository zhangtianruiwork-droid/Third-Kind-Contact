import { useMemo, useState } from 'react';
import { CharacterStore } from '../lib/store';
import type { Character } from '../lib/types';

interface SummonPageProps {
  onComplete: (characterId: string) => void;
  onBack: () => void;
}

interface FormState {
  name: string;
  title: string;
  era: string;
  avatar: string;
  tags: string;
  description: string;
  corpus: string;
}

const initialForm: FormState = {
  name: '',
  title: '',
  era: '',
  avatar: 'T',
  tags: '',
  description: '',
  corpus: '',
};

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f5f5f7',
  color: '#1d1d1f',
  padding: '56px 20px 72px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const shellStyle: React.CSSProperties = {
  width: 'min(920px, 100%)',
  margin: '0 auto',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(0,0,0,0.16)',
  borderRadius: 8,
  padding: '11px 12px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#1d1d1f',
  boxSizing: 'border-box',
};

function fieldLabel(text: string, required = false) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6e6e73', marginBottom: 7 }}>
      {text}{required ? ' *' : ''}
    </label>
  );
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || `character-${Date.now()}`;
}

export function SummonPage({ onComplete, onBack }: SummonPageProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');

  const canCreate = useMemo(
    () => form.name.trim().length > 0 && form.description.trim().length >= 40,
    [form.name, form.description],
  );

  const update = (key: keyof FormState, value: string) => {
    setError('');
    setForm(current => ({ ...current, [key]: value }));
  };

  const createCharacter = () => {
    if (!canCreate) {
      setError('Please provide a name and at least 40 characters of description.');
      return;
    }

    const tags = form.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const id = `${slugify(form.name)}-${Date.now().toString(36)}`;
    const systemPrompt = [
      `You are ${form.name}.`,
      form.title ? `Identity: ${form.title}.` : '',
      form.era ? `Era or setting: ${form.era}.` : '',
      `Character description: ${form.description.trim()}`,
      form.corpus.trim() ? `Reference corpus:\n${form.corpus.trim()}` : '',
      'Stay in character, answer with the style implied by the supplied material, and be transparent when the material is insufficient.',
    ].filter(Boolean).join('\n\n');

    const character: Character = {
      id,
      name: form.name.trim(),
      title: form.title.trim() || 'User-created companion',
      era: form.era.trim() || 'User-defined setting',
      avatar: form.avatar.trim().slice(0, 2) || form.name.trim().slice(0, 1).toUpperCase(),
      tags,
      description: form.description.trim(),
      systemPrompt,
      createdAt: new Date().toISOString(),
    };

    CharacterStore.save(character);
    onComplete(id);
  };

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.28em', color: '#8e8e93', fontWeight: 700 }}>
            SUMMONING RITUAL
          </div>
          <h1 style={{ fontSize: 40, margin: '14px 0 8px', letterSpacing: '-0.03em' }}>Create A Companion</h1>
          <p style={{ margin: 0, color: '#6e6e73' }}>
            Describe a character, add source material, and start a clean local profile.
          </p>
        </div>

        <section style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16 }}>
            <div>
              {fieldLabel('Name', true)}
              <input style={inputStyle} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Example: Ada / Orion" />
            </div>
            <div>
              {fieldLabel('Avatar')}
              <input style={{ ...inputStyle, textAlign: 'center', fontSize: 20 }} value={form.avatar} onChange={e => update('avatar', e.target.value)} placeholder="T" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              {fieldLabel('Title')}
              <input style={inputStyle} value={form.title} onChange={e => update('title', e.target.value)} placeholder="Research partner, fictional mentor, historical analyst..." />
            </div>
            <div>
              {fieldLabel('Era / Setting')}
              <input style={inputStyle} value={form.era} onChange={e => update('era', e.target.value)} placeholder="Near future, 19th century, your story world..." />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {fieldLabel('Tags')}
            <input style={inputStyle} value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="strategy, writing, research" />
          </div>

          <div style={{ marginTop: 16 }}>
            {fieldLabel('Description', true)}
            <textarea
              style={{ ...inputStyle, minHeight: 130, resize: 'vertical', lineHeight: 1.6 }}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Describe the character background, personality, speaking style, goals, boundaries and useful context."
            />
          </div>

          <div style={{ marginTop: 16 }}>
            {fieldLabel('Optional Corpus')}
            <textarea
              style={{ ...inputStyle, minHeight: 160, resize: 'vertical', lineHeight: 1.6 }}
              value={form.corpus}
              onChange={e => update('corpus', e.target.value)}
              placeholder="Paste notes, documents, quotes, style samples or worldbuilding references. Keep only material you have the right to use."
            />
          </div>

          {error && <p style={{ color: '#ff3b30', fontSize: 13, margin: '14px 0 0' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
            <button
              onClick={onBack}
              style={{ padding: '12px 18px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              onClick={createCharacter}
              disabled={!canCreate}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 8,
                border: 'none',
                background: canCreate ? '#0071e3' : '#c7c7cc',
                color: '#fff',
                fontWeight: 700,
                cursor: canCreate ? 'pointer' : 'default',
              }}
            >
              Create Companion
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
