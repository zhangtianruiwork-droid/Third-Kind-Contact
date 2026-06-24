// Seed data export / import for portable distribution.
// Seed file lives next to Third Kind Contact executable as  third_kind_contact_seed.json.

import { invoke } from '@tauri-apps/api/core';
import { SpriteStore } from './spriteStore';
import { ALL_POSES } from './petActions';
import { normalizeDeepSeekBase } from './store';

const IMPORTED_FLAG = 'third_kind_contact_seed_imported';
const LS_PREFIX     = 'third_kind_contact_';
const CONFIG_KEY    = LS_PREFIX + 'config';
const SCENE_KEY     = LS_PREFIX + 'companion_scenes_v1';
const SCENE_MARKER  = '__SCENE_ASSET__/';

interface InstalledSceneAsset {
  relativePath: string;
  localPath: string;
}

interface SeedData {
  version: 3;
  localStorage: Record<string, string>;
  sprites: Record<string, string>; // "charId::pose" 鈫?base64
}

function emptyConfig(): string {
  return JSON.stringify({
    apiKey: '',
    apiBase: normalizeDeepSeekBase(),
    modelCreation: 'deepseek-v4-pro',
    modelChat: 'deepseek-v4-flash',
    openaiApiKey: '',
    searchModel: 'gpt-4o',
    imageApiKey: '',
    imageApiBase: 'https://api.openai.com/v1',
    imageModel: 'gpt-image-2-vip',
  });
}

function toSceneMarker(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\\/g, '/');
  const needle = '/scene_assets/';
  const idx = normalized.lastIndexOf(needle);
  if (idx < 0) return value;
  return SCENE_MARKER + normalized.slice(idx + needle.length);
}

function sanitizeSceneStorage(value: string): string {
  try {
    const index = JSON.parse(value) as Record<string, Array<Record<string, unknown>>>;
    for (const scenes of Object.values(index)) {
      for (const scene of scenes) {
        scene.localPath = toSceneMarker(scene.localPath);
        scene.localLastFramePath = toSceneMarker(scene.localLastFramePath);
        delete scene.remoteVideoUrl;
        delete scene.remoteLastFrameUrl;
        delete scene.lastFrameDataUrl;
        delete scene.error;
      }
    }
    return JSON.stringify(index);
  } catch {
    return value;
  }
}

function resolveSceneStorage(value: string, assets: Map<string, string>): string {
  try {
    const index = JSON.parse(value) as Record<string, Array<Record<string, unknown>>>;
    for (const scenes of Object.values(index)) {
      for (const scene of scenes) {
        if (typeof scene.localPath === 'string' && scene.localPath.startsWith(SCENE_MARKER)) {
          scene.localPath = assets.get(scene.localPath.slice(SCENE_MARKER.length)) || scene.localPath;
        }
        if (typeof scene.localLastFramePath === 'string' && scene.localLastFramePath.startsWith(SCENE_MARKER)) {
          scene.localLastFramePath = assets.get(scene.localLastFramePath.slice(SCENE_MARKER.length)) || scene.localLastFramePath;
        }
      }
    }
    return JSON.stringify(index);
  } catch {
    return value;
  }
}

// 鈹€鈹€ Export 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function exportSeed(): Promise<boolean> {
  const lsData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LS_PREFIX) && key !== IMPORTED_FLAG) {
      const value = localStorage.getItem(key) ?? '';
      if (key === CONFIG_KEY) {
        lsData[key] = emptyConfig();
      } else if (key === SCENE_KEY) {
        lsData[key] = sanitizeSceneStorage(value);
      } else {
        lsData[key] = value;
      }
    }
  }
  lsData[CONFIG_KEY] = emptyConfig();

  const spriteData: Record<string, string> = {};
  let chars: Array<{ id: string; hasPixelSprites?: boolean }> = [];
  try { chars = JSON.parse(localStorage.getItem(LS_PREFIX + 'characters') ?? '[]'); } catch {}

  for (const char of chars) {
    if (char.hasPixelSprites) {
      const sprites = await SpriteStore.getAll(char.id, ALL_POSES);
      for (const pose of ALL_POSES) {
        if (sprites[pose]) spriteData[`${char.id}::${pose}`] = sprites[pose]!;
      }
    }
  }

  const seed: SeedData = { version: 3, localStorage: lsData, sprites: spriteData };
  try {
    return await invoke<boolean>('write_seed_file', { data: JSON.stringify(seed) });
  } catch {
    return false;
  }
}

// 鈹€鈹€ Import 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

async function importSeed(json: string): Promise<void> {
  const seed = JSON.parse(json) as SeedData;
  let installedAssets = new Map<string, string>();

  try {
    const installed = await invoke<InstalledSceneAsset[]>('install_bundled_scene_assets');
    installedAssets = new Map(installed.map(asset => [asset.relativePath, asset.localPath]));
  } catch {
    installedAssets = new Map();
  }

  for (const [k, v] of Object.entries(seed.localStorage ?? {})) {
    if (k === CONFIG_KEY) {
      localStorage.setItem(k, emptyConfig());
    } else if (k === SCENE_KEY) {
      localStorage.setItem(k, resolveSceneStorage(v, installedAssets));
    } else {
      localStorage.setItem(k, v);
    }
  }

  for (const [key, b64] of Object.entries(seed.sprites ?? {})) {
    const sep = key.indexOf('::');
    if (sep > 0) {
      await SpriteStore.save(key.slice(0, sep), key.slice(sep + 2), b64);
    }
  }

  localStorage.setItem(IMPORTED_FLAG, '1');
}

// 鈹€鈹€ Startup check 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

export async function checkAndImportSeed(): Promise<boolean> {
  if (localStorage.getItem(IMPORTED_FLAG)) return false;
  try {
    const json = await invoke<string | null>('read_seed_file');
    if (!json) return false;
    await importSeed(json);
    return true;
  } catch {
    return false;
  }
}
