import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { CompanionScene, SeedanceRenderSettings } from './sceneTypes';

export interface ArkConfigStatus {
  configured: boolean;
  apiKeyName: string;
  keyTail: string;
  model: string;
}

export interface CreateSeedanceTaskInput {
  model: string;
  prompt: string;
  referenceImages?: string[];
  firstFrameImage?: string;
  lastFrameImage?: string;
  ratio: SeedanceRenderSettings['ratio'];
  duration: number;
  resolution: SeedanceRenderSettings['resolution'];
  watermark: boolean;
  generateAudio: boolean;
  seed?: number;
  returnLastFrame: boolean;
}

export interface SeedanceTaskCreated {
  id: string;
  raw: unknown;
}

export interface SeedanceTaskStatus {
  id: string;
  status: 'queued' | 'running' | 'cancelled' | 'succeeded' | 'failed' | 'expired' | 'unknown';
  content?: {
    video_url?: string;
    last_frame_url?: string;
  };
  error?: {
    code?: string;
    message?: string;
  } | null;
  raw: unknown;
}

export interface DownloadedVideo {
  localPath: string;
  bytes: number;
}

export interface DownloadedFrame {
  localPath: string;
  dataUrl: string;
  bytes: number;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
}

export async function getArkConfigStatus(): Promise<ArkConfigStatus> {
  if (!isTauriRuntime()) {
    return { configured: false, apiKeyName: '', keyTail: '', model: 'doubao-seedance-2-0-fast-260128' };
  }
  return invoke<ArkConfigStatus>('get_ark_config_status');
}

export async function saveArkConfig(input: {
  apiKeyName: string;
  apiKey: string;
  model: string;
}): Promise<ArkConfigStatus> {
  if (!isTauriRuntime()) throw new Error('Seedance needs the Tauri desktop runtime.');
  return invoke<ArkConfigStatus>('save_ark_config', input);
}

export async function createSeedanceTask(input: CreateSeedanceTaskInput): Promise<SeedanceTaskCreated> {
  if (!isTauriRuntime()) throw new Error('Seedance needs the Tauri desktop runtime.');
  return invoke<SeedanceTaskCreated>('create_seedance_task', { request: input });
}

export async function getSeedanceTask(taskId: string): Promise<SeedanceTaskStatus> {
  if (!isTauriRuntime()) throw new Error('Seedance needs the Tauri desktop runtime.');
  return invoke<SeedanceTaskStatus>('get_seedance_task', { taskId });
}

export async function downloadSeedanceVideo(input: {
  characterId: string;
  sceneId: string;
  taskId: string;
  videoUrl: string;
}): Promise<DownloadedVideo> {
  if (!isTauriRuntime()) throw new Error('Seedance needs the Tauri desktop runtime.');
  return invoke<DownloadedVideo>('download_seedance_video', input);
}

export async function downloadSeedanceFrame(input: {
  characterId: string;
  sceneId: string;
  taskId: string;
  imageUrl: string;
}): Promise<DownloadedFrame> {
  if (!isTauriRuntime()) throw new Error('Seedance needs the Tauri desktop runtime.');
  return invoke<DownloadedFrame>('download_seedance_frame', input);
}

export function sceneToSeedanceInput(
  scene: CompanionScene,
  settings: SeedanceRenderSettings,
  referenceImages: string[] = [],
  identityReferenceImage?: string,
): CreateSeedanceTaskInput {
  const identityImage = identityReferenceImage?.trim();
  const manualRef = referenceImages.find(Boolean)?.trim();
  const refs = [
    manualRef || identityImage || '',
  ].filter(Boolean).slice(0, 1);
  const strictReferenceRule = manualRef
    ? [
        'Strict single reference image rule: the only supplied reference image is the character identity reference, not a mood board or style reference.',
        'Generate the same character shown in that single reference image as faithfully as possible.',
        'Preserve the reference character face shape, facial features, hairstyle, hair color, eye color, outfit design, accessories, age impression, body proportions, and core color palette.',
        'The scene, pose, action, hands, props, and background may change widely, but the character design must remain locked to the uploaded reference.',
        'Do not blend multiple identities, do not redesign the character, do not invent a different outfit, do not change the face, and do not use the uploaded image as style-only inspiration.',
      ].join(' ')
    : '';
  const identityRule = [
    'Identity reference rule: the first supplied image is captured from the approved idle animation and must be used only as the character design reference.',
    'Preserve the same face, hairstyle, hair color, eye color, outfit, accessories, body proportions, age impression, and overall color palette.',
    'Do not copy the idle pose, facial expression, hand position, prop layout, camera angle, lighting, background, or exact motion rhythm.',
    'Keep the camera locked like a desktop miniature stage: no random camera movement, no pan, tilt, orbit, dolly, shake, fast zoom, cuts, or sudden framing changes.',
    'Show state changes through the character performance, facial expression, gestures, props, and small environment details instead of camera motion.',
    `For this ${scene.kind} state, create a visibly different companion action and situation that matches the scene prompt while keeping only the character identity consistent.`,
  ].join(' ');

  return {
    model: scene.model || settings.model,
    prompt: [scene.prompt, strictReferenceRule, !manualRef && identityImage ? identityRule : ''].filter(Boolean).join('\n\n'),
    referenceImages: refs,
    firstFrameImage: undefined,
    lastFrameImage: undefined,
    ratio: scene.ratio || settings.ratio,
    duration: scene.duration || settings.duration,
    resolution: scene.resolution || settings.resolution,
    watermark: settings.watermark,
    generateAudio: settings.generateAudio,
    returnLastFrame: settings.returnLastFrame,
  };
}

export function toVideoAssetSrc(localPath?: string): string {
  if (!localPath) return '';
  if (!isTauriRuntime()) return localPath;
  return convertFileSrc(localPath);
}
