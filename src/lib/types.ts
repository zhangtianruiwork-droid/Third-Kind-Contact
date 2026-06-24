export interface SoulProfile {
  coreTraits: Array<{ name: string; description: string; example: string }>;
  languageStyle: {
    vocabulary: string[];
    patterns: string[];
    rhetoric: string;
    tone: string;
    selfRef: string;
    otherRef: string;
  };
  methodology: Array<{ name: string; description: string }>;
  mentalModels: Array<{ name: string; description: string }>;
  dialogueProtocols: {
    engaged: string[];
    cautious: string[];
    signature: string[];
  };
  knowledgeBoundary: {
    expert: string[];
    limited: string[];
  };
  redLines: string[];
  quotes: string[];
  systemPrompt: string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  era: string;
  avatar: string;
  tags: string[];
  description: string;
  systemPrompt: string;
  soulProfile?: SoulProfile;
  isPrebuilt?: boolean;
  createdAt: string;
  hasPixelSprites?: boolean; // flag — actual images live in IndexedDB
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type View = 'hall' | 'summon' | 'chat' | 'settings';
export type WizardStep = 1 | 2 | 3 | 4;
