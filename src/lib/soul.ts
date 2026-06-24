import { callDeepSeek } from './api';
import { AppConfig } from './store';
import type { SoulProfile } from './types';

export async function distillSoul(
  name: string,
  era: string,
  description: string,
  corpus: string | null,
  onProgress: (text: string) => void,
): Promise<SoulProfile> {
  const prompt = [
    `Create a structured companion profile for ${name}.`,
    era ? `Era or setting: ${era}` : '',
    `Description:\n${description}`,
    corpus ? `Reference corpus:\n${corpus}` : '',
    'Return strict JSON with keys: coreTraits, languageStyle, methodology, mentalModels, dialogueProtocols, knowledgeBoundary, redLines, quotes, systemPrompt.',
    'Do not include markdown fences or commentary.',
  ].filter(Boolean).join('\n\n');

  const { modelCreation } = AppConfig.get();
  let fullResponse = '';
  await callDeepSeek(
    [{ role: 'user', content: prompt }],
    modelCreation,
    chunk => {
      fullResponse += chunk;
      onProgress(fullResponse);
    },
  );

  const parsed = extractJSON(fullResponse);
  if (!parsed) throw new Error('Unable to parse the model response as JSON.');
  return parsed as unknown as SoulProfile;
}

function extractJSON(text: string): Record<string, unknown> | null {
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}
