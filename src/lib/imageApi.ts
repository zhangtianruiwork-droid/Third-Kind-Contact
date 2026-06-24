// OpenAI-compatible image generation API (gpt-image-1 / dall-e-3 / etc.)
import { callDeepSeek } from './api';
import { AppConfig } from './store';
import { OTOME_GAME_VISUAL_STYLE_EN } from './visualStyle';

const SIZE = '1280x1280'; // gpt-image-2-vip minimum square; 1024x1024 not supported

function getImageConfig() {
  const { imageApiKey, imageApiBase, imageModel } = AppConfig.get();
  return {
    API_BASE: imageApiBase || 'https://api.openai.com/v1',
    API_KEY:  imageApiKey  || '',
    MODEL:    imageModel   || 'gpt-image-1',
  };
}

export interface GenResult {
  b64: string; // base64-encoded PNG (may be data-url or raw base64)
}

async function throwIfError(resp: Response, url: string) {
  if (resp.ok) return;
  let msg = `HTTP ${resp.status} (${new URL(url).host})`;
  try { const j = await resp.json(); msg = j?.error?.message || msg; } catch {}
  throw new Error(msg);
}

export function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Compress to JPEG ≤1.5MB (apiyi docs: quality 80-90, ≤1.5MB for images/edits input)
async function toCompressedJpeg(dataUrl: string, maxBytes = 1.5 * 1024 * 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX = 2048;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      const tryQ = (q: number) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          if (blob.size <= maxBytes || q <= 0.3) resolve(blob);
          else tryQ(Math.round((q - 0.1) * 10) / 10);
        }, 'image/jpeg', q);
      };
      tryQ(0.85);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

export function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('quota') || msg.includes('rate') || msg.includes('limit') || msg.includes('429');
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 8000): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (i < retries) await sleep(isQuotaError(e) ? delayMs * (i + 1) : 3000);
    }
  }
  throw last;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Use DeepSeek to extract VISUAL APPEARANCE from character data */
export async function extractVisualAppearance(char: {
  name: string; title: string; era: string;
  description: string; tags: string[];
  soulProfile?: { quotes?: string[]; languageStyle?: { tone?: string }; systemPrompt?: string } | null;
}): Promise<string> {
  const { modelCreation } = AppConfig.get();

  const corpusHint = [
    char.soulProfile?.systemPrompt?.slice(0, 400) ?? '',
    char.soulProfile?.quotes?.join(' ') ?? '',
  ].join(' ').trim().slice(0, 600);

  const userMsg = `Based on the following character data, extract ONLY the physical/visual appearance for use in pixel art image generation.

Character: ${char.name} (${char.title}, ${char.era})
Description: ${char.description}
Tags: ${char.tags.join(', ')}
Reference text: ${corpusHint || '(no additional data)'}

Output ONE concise paragraph in English describing:
- Hair: exact color, length, style (e.g. "long black straight hair with a bun")
- Eyes: exact color (e.g. "dark brown almond eyes")
- Skin: tone (e.g. "warm tan skin")
- Clothing: specific outfit, exact colors, style, key accessories
- Overall visual aesthetic, adapted toward polished otome game / female-oriented visual novel character design

Built-in art direction to follow: ${OTOME_GAME_VISUAL_STYLE_EN}

Rules: English only. No personality. No history. No abilities. Be specific about colors. Under 140 words.`;

  return callDeepSeek(
    [{ role: 'system', content: 'You are a visual artist specializing in otome game inspired anime character design and pixel art adaptation. Output only physical appearance descriptions.' },
     { role: 'user', content: userMsg }],
    modelCreation,
  );
}

/** Text-to-image pixel art generation (for the FIRST/reference pose) */
export async function generatePixelSprite(prompt: string, signal?: AbortSignal): Promise<GenResult> {
  const { API_BASE, API_KEY, MODEL } = getImageConfig();
  const url = `${API_BASE}/images/generations`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, response_format: 'b64_json' }),
    signal,
  }).catch((e: Error) => { throw new Error(`[${new URL(url).host} model=${MODEL} key=${API_KEY ? API_KEY.slice(0,8) : 'EMPTY'}] ${e.message}`); });
  await throwIfError(resp, url);
  const data = await resp.json();
  const b64 = data.data?.[0]?.b64_json ?? data.data?.[0]?.url;
  if (!b64) throw new Error('API returned no image data');
  return { b64 };
}

/**
 * Reference-based pose generation via image editing.
 * Pass the raw idle sprite; the API will change only the pose.
 */
export async function generatePoseFromReference(
  referenceB64: string,
  poseDesc: string,
  signal?: AbortSignal,
): Promise<GenResult> {
  const { API_BASE, API_KEY, MODEL } = getImageConfig();
  const src = referenceB64.startsWith('data:') ? referenceB64 : `data:image/png;base64,${referenceB64}`;
  const blob = await toCompressedJpeg(src);

  const form = new FormData();
  form.append('model', MODEL);
  form.append('image', blob, 'reference.jpg');
  form.append('response_format', 'b64_json');
  form.append('prompt', [
    `Transform this pixel art chibi character to a new pose.`,
    `Keep a polished otome game inspired anime companion aesthetic adapted into pixel art.`,
    `PRESERVE EXACTLY: hair color and style, face features, skin tone,`,
    `exact clothing colors and design, accessories, pixel art style, chibi proportions, white background.`,
    `CHANGE ONLY the body pose to: ${poseDesc}`,
    `Full body visible, white background, same pixel art quality and character identity.`,
    `IMPORTANT: NO text, NO words, NO letters, NO watermarks, NO labels, NO captions anywhere on the image.`,
  ].join(' '));

  const editsUrl = `${API_BASE}/images/edits`;
  const resp = await fetch(editsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
    signal,
  }).catch((e: Error) => { throw new Error(`[${new URL(editsUrl).host} model=${MODEL} key=${API_KEY ? API_KEY.slice(0,8) : 'EMPTY'}] ${e.message}`); });
  await throwIfError(resp, editsUrl);
  const data = await resp.json();
  const b64 = data.data?.[0]?.b64_json ?? data.data?.[0]?.url;
  if (!b64) throw new Error('API returned no image data');
  return { b64 };
}

/** Photo-to-pixel-art via image editing */
export async function pixelatePhoto(
  photoDataUrl: string,
  posePrompt: string,
  signal?: AbortSignal,
): Promise<GenResult> {
  const { API_BASE, API_KEY, MODEL } = getImageConfig();
  const blob = await toCompressedJpeg(photoDataUrl);
  const form = new FormData();
  form.append('model', MODEL);
  form.append('image', blob, 'photo.jpg');
  form.append('response_format', 'b64_json');
  form.append('prompt', posePrompt);
  const photoUrl = `${API_BASE}/images/edits`;
  const resp = await fetch(photoUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
    signal,
  }).catch((e: Error) => { throw new Error(`[${new URL(photoUrl).host} model=${MODEL} key=${API_KEY ? API_KEY.slice(0,8) : 'EMPTY'}] ${e.message}`); });
  await throwIfError(resp, photoUrl);
  const data = await resp.json();
  const b64 = data.data?.[0]?.b64_json ?? data.data?.[0]?.url;
  if (!b64) throw new Error('API returned no image data');
  return { b64 };
}

/**
 * Run tasks sequentially with gap — serial prevents quota conflicts.
 * The `_concurrency` param is accepted but ignored (always 1).
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  _concurrency = 1,
  onDone?: (index: number, result: T | Error) => void,
) {
  for (let i = 0; i < tasks.length; i++) {
    try {
      const result = await withRetry(tasks[i], 2, 10000);
      onDone?.(i, result);
    } catch (e) {
      onDone?.(i, e instanceof Error ? e : new Error(String(e)));
    }
    if (i < tasks.length - 1) await sleep(2000);
  }
}
