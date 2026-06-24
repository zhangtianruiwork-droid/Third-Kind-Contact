import { AppConfig, normalizeDeepSeekBase } from './store';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callDeepSeek(
  messages: ChatMessage[],
  model: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const { apiKey, apiBase } = AppConfig.get();
  const cleanKey = apiKey.trim();
  const base = normalizeDeepSeekBase(apiBase);
  const stream = !!onChunk;

  if (!cleanKey) {
    throw new Error('尚未配置 DeepSeek API Key。请在首页右上角 API 设置里填写 DeepSeek 平台的 sk-... 密钥。');
  }

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      temperature: 0.85,
      max_tokens: 6000,
    }),
    signal,
  });

  if (!response.ok) {
    let errMsg = `API Error ${response.status}`;
    try {
      const err = await response.clone().json();
      errMsg = err?.error?.message || errMsg;
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) errMsg = text.trim();
      } catch {}
    }

    if (response.status === 401) {
      const keyHint = cleanKey.startsWith('ark-') || cleanKey.startsWith('api-key-')
        ? '当前填写的看起来像火山方舟/Seedance Key，不是 DeepSeek Key。'
        : '请确认填写的是 DeepSeek 控制台创建的 API Key，并且没有复制到多余空格或换行。';
      throw new Error(`DeepSeek 认证失败（401）。${keyHint}当前请求地址：${base}/chat/completions。`);
    }

    throw new Error(errMsg);
  }

  if (!stream) {
    const data = await response.json();
    return data.choices[0]?.message?.content ?? '';
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) {
          fullText += text;
          onChunk!(text);
        }
      } catch {}
    }
  }

  return fullText;
}
