import type { CompanionScene } from './sceneTypes';

const KEY = 'third_kind_contact_companion_scenes_v1';

type SceneIndex = Record<string, CompanionScene[]>;

function readIndex(): SceneIndex {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function writeIndex(index: SceneIndex): void {
  localStorage.setItem(KEY, JSON.stringify(index));
}

function sortScenes(scenes: CompanionScene[]): CompanionScene[] {
  const order = ['idle', 'listening', 'thinking', 'talking', 'comfort', 'focus'];
  return [...scenes].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export const SceneStore = {
  get(characterId: string): CompanionScene[] {
    return sortScenes(readIndex()[characterId] || []);
  },

  getPlayable(characterId: string): CompanionScene[] {
    return this.get(characterId).filter(scene => scene.status === 'succeeded' && !!scene.localPath);
  },

  hasPlayable(characterId: string): boolean {
    return this.getPlayable(characterId).length > 0;
  },

  saveForCharacter(characterId: string, scenes: CompanionScene[]): void {
    const index = readIndex();
    index[characterId] = sortScenes(scenes);
    writeIndex(index);
  },

  upsert(scene: CompanionScene): void {
    const index = readIndex();
    const scenes = index[scene.characterId] || [];
    const idx = scenes.findIndex(item => item.id === scene.id);
    if (idx >= 0) scenes[idx] = scene;
    else scenes.push(scene);
    index[scene.characterId] = sortScenes(scenes);
    writeIndex(index);
  },

  update(characterId: string, sceneId: string, patch: Partial<CompanionScene>): CompanionScene | null {
    const scenes = this.get(characterId);
    const scene = scenes.find(item => item.id === sceneId);
    if (!scene) return null;
    const updated: CompanionScene = {
      ...scene,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.upsert(updated);
    return updated;
  },

  clear(characterId: string): void {
    const index = readIndex();
    delete index[characterId];
    writeIndex(index);
  },

  countPlayable(characterId: string): number {
    return this.getPlayable(characterId).length;
  },
};
