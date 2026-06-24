import type { Character } from './types';
import { OTOME_GAME_VISUAL_STYLE_EN } from './visualStyle';

// Nine states — match AI-generated pixel sprite poses one-to-one
export type PetState =
  | 'idle'      // 待机·呼吸
  | 'idle2'     // 待机·环顾
  | 'idle3'     // 待机·沉思
  | 'thinking'  // 思考推演
  | 'talking'   // 慷慨陈词
  | 'running'   // 疾步前行
  | 'jumping'   // 跃然欢腾
  | 'waving'    // 招手问候
  | 'violin';   // 英雄本色 (signature action)

export const ALL_POSES: PetState[] = [
  'idle', 'idle2', 'idle3', 'thinking', 'talking', 'running', 'jumping', 'waving', 'violin',
];

export interface PoseInfo {
  key: PetState;
  label: string;    // Chinese display name
  englishLabel: string;
  desc: string;     // short pose description for AI prompt
  css: string;      // CSS animation name for this pose
}

export const POSE_INFO: Record<PetState, PoseInfo> = {
  idle:     { key: 'idle',     label: '待机·呼吸', englishLabel: 'Idle',      desc: 'standing at rest, arms relaxed at sides, calm peaceful expression, slight breathing',              css: 'pixelIdle' },
  idle2:    { key: 'idle2',    label: '待机·环顾', englishLabel: 'Look',      desc: 'standing, head tilted slightly sideways, curious glance to one side, relaxed posture',            css: 'pixelIdle' },
  idle3:    { key: 'idle3',    label: '待机·沉思', englishLabel: 'Ponder',    desc: 'standing with arms loosely crossed or hands clasped behind back, contemplative neutral expression', css: 'pixelIdle' },
  thinking: { key: 'thinking', label: '思考推演', englishLabel: 'Think',     desc: 'one hand raised to chin in thinking gesture, eyes looking upward, slight forward lean, pondering', css: 'pixelThink' },
  talking:  { key: 'talking',  label: '慷慨陈词', englishLabel: 'Talk',      desc: 'animated mid-speech, one hand gesturing expressively outward, mouth slightly open, engaged',       css: 'pixelTalk' },
  running:  { key: 'running',  label: '疾步前行', englishLabel: 'Run',       desc: 'dynamic sprinting pose, strong forward lean, arms pumping, legs mid-stride, energetic',            css: 'pixelRun' },
  jumping:  { key: 'jumping',  label: '跃然欢腾', englishLabel: 'Jump',      desc: 'leaping in the air, arms spread wide or raised overhead, triumphant joyful expression',            css: 'pixelJump' },
  waving:   { key: 'waving',   label: '招手问候', englishLabel: 'Wave',      desc: 'one arm raised high in a friendly greeting wave, bright warm welcoming smile',                     css: 'pixelWave' },
  violin:   { key: 'violin',   label: '英雄本色', englishLabel: 'Signature', desc: 'heroic signature pose — characteristic action reflecting their historical role and personality',   css: 'pixelHero' },
};

/** Build the full AI prompt for a pose + character */
export function buildSpritePrompt(
  character: Character,
  pose: PetState,
  appearanceAnchor?: string,
): string {
  const info = POSE_INFO[pose];
  const anchor = appearanceAnchor?.trim()
    || `${character.name}, ${character.title}, ${character.era}. ${character.description.slice(0, 160)}`;

  return [
    `Pixel art video game character sprite.`,
    `CRITICAL — you MUST reproduce these EXACT visual characteristics in every single image:`,
    `[${anchor}]`,
    `Do NOT change hair color, skin tone, clothing color or style from this description.`,
    `Style: 32x32 pixel art upscaled, 16-bit aesthetic,`,
    `Art direction adapted from otome game inspired anime character design: elegant silhouette, expressive eyes, memorable accessories, warm companion appeal.`,
    `[${OTOME_GAME_VISUAL_STYLE_EN}]`,
    `chibi proportions (large head compact body), thick 2px dark outlines,`,
    `flat colors simple cel shading, limited palette 8-12 colors,`,
    `crisp pixel edges, NO anti-aliasing, NO gradients, NO realistic textures.`,
    `Background: pure white (#FFFFFF), nothing else in background.`,
    `Composition: single character, full body head to feet, centered.`,
    `Action: ${info.desc}`,
    `View: front-facing or 3/4 front.`,
    `IMPORTANT: NO text, NO words, NO letters, NO watermarks, NO labels, NO captions anywhere on the image.`,
  ].join(' ');
}

/** Build prompt for photo-to-pixel (image editing mode) */
export function buildPhotoPixelPrompt(character: Character, pose: PetState): string {
  const info = POSE_INFO[pose];
  return [
    `Convert this portrait into a pixel art game character sprite.`,
    `Style: 32x32 pixel art resolution, 16-bit aesthetic, chibi proportions,`,
    `Adapt the character toward an otome game inspired anime companion look while preserving identity.`,
    `thick dark outlines, flat colors, limited 8-12 color palette, NO anti-aliasing.`,
    `Preserve the person's distinctive facial features in pixel art style.`,
    `Background: pure white, no shadows. Full body, centered.`,
    `Character name: ${character.name}.`,
    `Action: ${info.desc}`,
    `IMPORTANT: NO text, NO words, NO letters, NO watermarks, NO labels, NO captions anywhere on the image.`,
  ].join(' ');
}

// ── Static sprite registry (pre-built characters with file sprites) ──────────

export const CHARACTER_SPRITES: Record<string, Record<PetState, string>> = {};

export function getSpritesForCharacter(id: string): Record<PetState, string> | null {
  return CHARACTER_SPRITES[id] ?? null;
}

// ── Action inference from AI reply text ──────────────────────────────────────

export function inferActionFromText(text: string): PetState {
  if (/goodbye|good evening|good morning|farewell|good night|pleasure to meet|how do you do/i.test(text))
    return 'waving';
  if (/violin|fiddle|music|symphony|concerto|stradivarius|musical|melody|华彩|小提琴|音乐/i.test(text))
    return 'violin';
  if (/chase|pursue|hurry|urgent|at once|come\s+watson|快|紧急|立刻/i.test(text))
    return 'running';
  if (/extraordinary|remarkable|astounding|impossible|incredible|eureka|fascinating|好家伙|不可思议|精彩/i.test(text))
    return 'jumping';
  if (/observe|deduce|evidence|clue|logical|therefore|conclude|elementary|显然|推断|分析|证据|观察/i.test(text))
    return 'thinking';
  return 'talking';
}

export function randomIdleState(): PetState {
  const idles: PetState[] = ['idle', 'idle2', 'idle3'];
  return idles[Math.floor(Math.random() * idles.length)];
}

export const ACTION_DURATION: Partial<Record<PetState, number>> = {
  waving:  3000,
  violin:  5000,
  running: 3500,
  jumping: 2500,
};
