import { AppConfig } from './store';

export interface SearchResult {
  title: string;
  extract: string;
  url: string;
  source: string;
}

interface OpenAIAnnotation {
  type?: string;
  url?: string;
  title?: string;
}

interface OpenAIContentItem {
  type?: string;
  text?: string;
  annotations?: OpenAIAnnotation[];
}

interface OpenAIOutputItem {
  type?: string;
  content?: OpenAIContentItem[];
}

interface OpenAIResponse {
  output_text?: string;
  output?: OpenAIOutputItem[];
}

interface WikiSearchItem {
  pageid: number;
  title: string;
  snippet?: string;
}

interface WikiSearchResponse {
  query?: {
    search?: WikiSearchItem[];
  };
}

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
}

interface WikiExtractResponse {
  query?: {
    pages?: Record<string, WikiPage>;
  };
}

const WIKI_ENDPOINTS = [
  { source: '中文维基百科', api: 'https://zh.wikipedia.org/w/api.php' },
  { source: 'English Wikipedia', api: 'https://en.wikipedia.org/w/api.php' },
];

export async function searchCharacterContext(name: string, era: string): Promise<SearchResult[]> {
  const openAIResults = await searchWithOpenAI(name, era);
  if (openAIResults.length) return openAIResults;
  return searchWithWikipedia(name, era);
}

async function searchWithOpenAI(name: string, era: string): Promise<SearchResult[]> {
  const { openaiApiKey, searchModel } = AppConfig.get();
  if (!openaiApiKey.trim()) return [];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey.trim()}`,
      },
      body: JSON.stringify({
        model: searchModel || 'gpt-5',
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        input: [
          '为角色蒸馏检索公开资料。请以中文输出，重点包括：身份、时代、生平关键事件、著作/作品、语言风格、思想/行为特征、常见争议。',
          `人物：${name}`,
          `时代/背景：${era}`,
          '要求：不要直接生成人格档案，只返回事实性研究摘要；避免无来源臆测。',
        ].join('\n'),
      }),
    });

    if (!response.ok) return [];
    const data = (await response.json()) as OpenAIResponse;
    const text = extractOpenAIText(data);
    if (!text) return [];

    const citations = extractOpenAICitations(data);
    return [{
      title: `${name} 搜索摘要`,
      extract: text.replace(/\s+/g, ' ').trim().slice(0, 2400),
      url: citations[0]?.url ?? '',
      source: citations.length
        ? `OpenAI Web Search：${citations.map(citation => citation.title || citation.url).slice(0, 3).join(' / ')}`
        : 'OpenAI Web Search',
    }];
  } catch {
    return [];
  }
}

function extractOpenAIText(data: OpenAIResponse): string {
  if (data.output_text) return data.output_text;

  return (data.output ?? [])
    .flatMap(item => item.content ?? [])
    .map(content => content.text ?? '')
    .filter(Boolean)
    .join('\n');
}

function extractOpenAICitations(data: OpenAIResponse): OpenAIAnnotation[] {
  return (data.output ?? [])
    .flatMap(item => item.content ?? [])
    .flatMap(content => content.annotations ?? [])
    .filter(annotation => annotation.type === 'url_citation' && annotation.url);
}

async function searchWithWikipedia(name: string, era: string): Promise<SearchResult[]> {
  const query = [name, era].filter(Boolean).join(' ');
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const endpoint of WIKI_ENDPOINTS) {
    try {
      const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: '3',
        format: 'json',
        origin: '*',
      });

      const searchResponse = await fetch(`${endpoint.api}?${searchParams.toString()}`);
      if (!searchResponse.ok) continue;
      const searchData = (await searchResponse.json()) as WikiSearchResponse;
      const pageIds = searchData.query?.search?.map(item => item.pageid).filter(Boolean) ?? [];
      if (!pageIds.length) continue;

      const extractParams = new URLSearchParams({
        action: 'query',
        prop: 'extracts|info',
        exintro: '1',
        explaintext: '1',
        inprop: 'url',
        pageids: pageIds.join('|'),
        format: 'json',
        origin: '*',
      });

      const extractResponse = await fetch(`${endpoint.api}?${extractParams.toString()}`);
      if (!extractResponse.ok) continue;
      const extractData = (await extractResponse.json()) as WikiExtractResponse;
      const pages = Object.values(extractData.query?.pages ?? {});

      for (const page of pages) {
        const key = `${endpoint.source}:${page.pageid}`;
        if (seen.has(key) || !page.extract) continue;
        seen.add(key);
        results.push({
          title: page.title,
          extract: page.extract.replace(/\s+/g, ' ').trim().slice(0, 900),
          url: page.fullurl ?? '',
          source: endpoint.source,
        });
      }
    } catch {
      continue;
    }
  }

  return results.slice(0, 5);
}
