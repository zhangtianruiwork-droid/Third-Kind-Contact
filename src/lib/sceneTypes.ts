export type CompanionSceneKind =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'talking'
  | 'greeting'
  | 'comfort'
  | 'focus'
  | 'standup';

export type SceneGenerationStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'expired';

export interface SeedanceRenderSettings {
  model: string;
  ratio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | 'adaptive';
  duration: number;
  resolution: '480p' | '720p' | '1080p';
  watermark: boolean;
  generateAudio: boolean;
  returnLastFrame: boolean;
}

export interface CompanionScene {
  id: string;
  characterId: string;
  kind: CompanionSceneKind;
  title: string;
  triggerHint: string;
  prompt: string;
  status: SceneGenerationStatus;
  model: string;
  ratio: SeedanceRenderSettings['ratio'];
  duration: number;
  resolution: SeedanceRenderSettings['resolution'];
  taskId?: string;
  remoteVideoUrl?: string;
  remoteLastFrameUrl?: string;
  localLastFramePath?: string;
  lastFrameDataUrl?: string;
  generationMode?: 'reference' | 'identityReference' | 'frameLock';
  anchorSceneId?: string;
  localPath?: string;
  error?: string;
  bytes?: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SEEDANCE_SETTINGS: SeedanceRenderSettings = {
  model: 'doubao-seedance-2-0-fast-260128',
  ratio: '3:4',
  duration: 5,
  resolution: '720p',
  watermark: false,
  generateAudio: false,
  returnLastFrame: true,
};

export const SCENE_KIND_LABELS: Record<CompanionSceneKind, string> = {
  idle: '待机陪伴',
  listening: '认真倾听',
  thinking: '思考回应',
  talking: '轻声回应',
  greeting: '招手问候',
  comfort: '安抚陪伴',
  focus: '专注共处',
  standup: '起身行动',
};
