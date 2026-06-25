import type { Character, Message } from './types';

const PREFIX = 'yingling_';
const DEFAULT_DEEPSEEK_BASE = 'https://api.deepseek.com';

export interface Config {
  apiKey: string;       // DeepSeek API key (chat + soul distillation)
  apiBase: string;      // DeepSeek-compatible base URL
  modelCreation: string;
  modelChat: string;
  openaiApiKey: string; // OpenAI key (optional web-search augmentation)
  searchModel: string;
  imageApiKey: string;  // OpenAI-compatible key for sprite generation
  imageApiBase: string; // API base URL (OpenAI-compatible)
  imageModel: string;   // Image model name
}

export function normalizeDeepSeekBase(value?: string): string {
  const trimmed = (value || DEFAULT_DEEPSEEK_BASE).trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_DEEPSEEK_BASE;
  if (/^https:\/\/api\.deepseek\.com\/v1$/i.test(trimmed)) return DEFAULT_DEEPSEEK_BASE;
  if (/^https:\/\/api\.deepseek\.com\/chat\/completions$/i.test(trimmed)) return DEFAULT_DEEPSEEK_BASE;
  return trimmed;
}

export const CharacterStore = {
  getAll(): Character[] {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + 'characters') || '[]');
    } catch {
      return [];
    }
  },

  get(id: string): Character | null {
    return this.getAll().find(c => c.id === id) ?? null;
  },

  save(character: Character): void {
    const all = this.getAll();
    const idx = all.findIndex(c => c.id === character.id);
    if (idx >= 0) all[idx] = character;
    else all.push(character);
    localStorage.setItem(PREFIX + 'characters', JSON.stringify(all));
  },

  delete(id: string): void {
    const all = this.getAll().filter(c => c.id !== id);
    localStorage.setItem(PREFIX + 'characters', JSON.stringify(all));
    localStorage.removeItem(PREFIX + 'conv_' + id);
  },

  getConversation(id: string): Message[] {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + 'conv_' + id) || '[]');
    } catch {
      return [];
    }
  },

  saveConversation(id: string, messages: Message[]): void {
    localStorage.setItem(PREFIX + 'conv_' + id, JSON.stringify(messages.slice(-60)));
  },

  clearConversation(id: string): void {
    localStorage.removeItem(PREFIX + 'conv_' + id);
  },
};

export const AppConfig = {
  get(): Config {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFIX + 'config') || '{}');
      // Migrate outdated model names
      const OUTDATED_MODELS = ['deepseek-v3-0324', 'deepseek-v4-pro-0324'];
      const modelCreation = OUTDATED_MODELS.includes(saved.modelCreation) ? 'deepseek-v4-pro' : (saved.modelCreation || 'deepseek-v4-pro');
      const modelChat     = OUTDATED_MODELS.includes(saved.modelChat)     ? 'deepseek-v4-flash' : (saved.modelChat || 'deepseek-v4-flash');
      return {
        apiKey:        (saved.apiKey || '').trim(),
        apiBase:       normalizeDeepSeekBase(saved.apiBase),
        modelCreation,
        modelChat,
        openaiApiKey:  saved.openaiApiKey  || '',
        searchModel:   saved.searchModel   || 'gpt-4o',
        imageApiKey:   saved.imageApiKey   || '',
        imageApiBase:  saved.imageApiBase  || 'https://api.openai.com/v1',
        imageModel:    (saved.imageModel === 'gpt-image-1' || !saved.imageModel) ? 'gpt-image-2-vip' : saved.imageModel,
      };
    } catch {
      return {
        apiKey: '', apiBase: DEFAULT_DEEPSEEK_BASE,
        modelCreation: 'deepseek-v4-pro', modelChat: 'deepseek-v4-flash',
        openaiApiKey: '', searchModel: 'gpt-4o',
        imageApiKey: '', imageApiBase: 'https://api.openai.com/v1', imageModel: 'gpt-image-2-vip',
      };
    }
  },

  save(updates: Partial<Config>): void {
    const current = this.get();
    const next = { ...current, ...updates };
    next.apiKey = (next.apiKey || '').trim();
    next.apiBase = normalizeDeepSeekBase(next.apiBase);
    next.openaiApiKey = (next.openaiApiKey || '').trim();
    next.imageApiKey = (next.imageApiKey || '').trim();
    next.imageApiBase = (next.imageApiBase || '').trim().replace(/\/+$/, '') || current.imageApiBase;
    localStorage.setItem(PREFIX + 'config', JSON.stringify(next));
  },
};
