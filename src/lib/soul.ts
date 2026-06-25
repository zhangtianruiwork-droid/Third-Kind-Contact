import { callDeepSeek } from './api';
import { searchCharacterContext } from './search';
import { AppConfig } from './store';
import type { SoulProfile } from './types';

const DISTILLATION_PROMPT = `你是「灵魂蒸馏师」，专精从文献语料中提炼人物核心人格，为AI构建高度拟真的人格化身。

【任务】
基于以下关于【{NAME}】（{ERA}）的资料，提炼其灵魂精华，创建完整人格档案。

【资料描述】
{DESCRIPTION}

{CORPUS_SECTION}

---

【蒸馏要求】深度分析材料，从以下维度提炼：

1. 核心性格特征（5-7项）：具体行为表现，不是抽象词汇
2. 语言风格：词汇选择、句式偏好、修辞习惯、标志性表达、自称与称呼对方的方式
3. 方法论内核：这个人物特有的思维框架与决策模式
4. 心智模型：最具代表性的认知框架（3-5个）
5. 对话协议：基于人物真实性格的互动模式，感兴趣的话题，标志性的应对方式
6. 知识边界：精通领域 vs. 陌生领域
7. 核心信念与底线：绝不妥协的原则

---

【systemPrompt 生成核心要求 — 极为重要】

生成一个800-1500字的系统提示词，必须满足以下要求：

✦ 角色从内而外：所有对话协议、行为模式、提问风格，必须自然地从【{NAME}】的真实性格和人生经历中生长出来，而非套用通用框架。

✦ 禁止通用模板：严禁生成"第一步调查→第二步分析→第三步建议"这类与人物无关的咨询顾问式流程。每个角色的行为方式都是独一无二的。参考案例：
  - 侦探人物 → 观察细节、归纳排除、反问试探，用逻辑与演绎推进对话
  - 武将 → 直接、果断、以战场比喻，不绕弯子
  - 诗人 → 感性、联想丰富、以意象表达，情绪浓烈
  - 智谋家 → 层层设问、迂回试探、以史为鉴，不轻易直接给结论
  - 科学家 → 实证、系统、步步推进假设验证

✦ 对话结构（可选）：如果这个人物的性格自然地适合某种对话结构，可以提炼出来（3-5步，内容完全基于人物），但如果人物风格更为即兴/自由/情绪化，则不要强加对话流程。

✦ systemPrompt 必须包含：
  ① 身份宣言（"你是XX，以灵魂之态与来者对话，不是AI"）
  ② 时代背景与人生经历摘要（奠定知识边界）
  ③ 核心性格特征（用行为描述，不用形容词）
  ④ 说话方式（带具体示例，包括自称和称呼对方）
  ⑤ 这个人物独特的思维/互动方式
  ⑥ 知识边界处理（如何优雅应对超出认知的问题）
  ⑦ 绝对原则（始终保持角色，绝不承认是AI）

请严格按以下JSON格式输出（确保JSON合法，不要有额外文字）：
{
  "coreTraits": [{"name": "特质名", "description": "具体表现", "example": "示例语句"}],
  "languageStyle": {"vocabulary": ["常用词汇"], "patterns": ["句式模式"], "rhetoric": "修辞风格描述", "tone": "语气特点", "selfRef": "自称方式", "otherRef": "称呼对方方式"},
  "methodology": [{"name": "方法名", "description": "方法描述"}],
  "mentalModels": [{"name": "模型名", "description": "认知框架描述"}],
  "dialogueProtocols": {"engaged": ["感兴趣的话题类型"], "cautious": ["审慎处理的话题"], "signature": ["标志性回应模式"]},
  "knowledgeBoundary": {"expert": ["精通领域"], "limited": ["有限了解"]},
  "redLines": ["绝对原则"],
  "systemPrompt": "完整系统提示词（800-1500字）..."
}`;

const AUTO_ENRICH_CORPUS = `【语料来源：AI内置知识库】
没有提供外部语料。请基于你对【{NAME}】的全面认知（历史记录、著作原文、传记资料、学术评价、各类史书记载等），自行构建丰富的语料基础。

要求：
- 信息尽可能全面、丰富，确保角色不会OOC（角色崩坏）
- 引用可靠的历史/文学资料作为依据
- 如有细节争议，选择最广为认可的版本
- 如果是虚构人物，基于其作品中最完整的刻画`;

const SEARCH_ASSIST_SECTION = `【辅助搜索资料】
以下资料来自公开百科检索，仅用于校验人物身份、时代、主要事迹与常识边界。请以你自身知识为主进行人物蒸馏；搜索资料只作为补充，不要机械复述，也不要让资料摘要覆盖人物真实风格。

{SEARCH_RESULTS}`;

export async function distillSoul(
  name: string,
  era: string,
  description: string,
  corpus: string | null,
  onProgress: (text: string) => void
): Promise<SoulProfile> {
  let searchSection = '';
  if (!corpus) {
    onProgress('正在检索公开资料作为辅助校验……');
    const searchResults = await searchCharacterContext(name, era);
    if (searchResults.length) {
      searchSection = SEARCH_ASSIST_SECTION.replace(
        '{SEARCH_RESULTS}',
        searchResults
          .map((result, index) => [
            `${index + 1}. ${result.title}（${result.source}）`,
            `摘要：${result.extract}`,
            result.url ? `链接：${result.url}` : '',
          ].filter(Boolean).join('\n'))
          .join('\n\n')
      );
      onProgress(`已获取 ${searchResults.length} 条公开资料摘要，正在交给模型蒸馏……`);
    } else {
      onProgress('未检索到可用公开资料，将仅基于模型自身知识蒸馏……');
    }
  }

  const corpusSection = corpus
    ? `【语料文本】\n${corpus}`
    : `${AUTO_ENRICH_CORPUS.replace('{NAME}', name)}${searchSection ? `\n\n${searchSection}` : ''}`;

  const prompt = DISTILLATION_PROMPT
    .replace(/{NAME}/g, name)
    .replace('{ERA}', era)
    .replace('{DESCRIPTION}', description)
    .replace('{CORPUS_SECTION}', corpusSection);

  const { modelCreation } = AppConfig.get();
  let fullResponse = '';

  await callDeepSeek(
    [{ role: 'user', content: prompt }],
    modelCreation,
    chunk => {
      fullResponse += chunk;
      onProgress(fullResponse);
    }
  );

  const parsed = extractJSON(fullResponse);
  if (!parsed) {
    const preview = fullResponse.slice(0, 200).replace(/\n/g, '↵');
    throw new Error(`蒸馏失败：无法解析灵魂档案。响应预览：${preview}`);
  }
  return parsed as unknown as SoulProfile;
}

function extractJSON(text: string): Record<string, unknown> | null {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');

  // Find the outermost { ... } using bracket counting
  const start = stripped.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;

  const blob = stripped.slice(start, end + 1);

  // First try raw parse
  try { return JSON.parse(blob); } catch { /* fall through to repair */ }

  // Repair: escape unescaped control characters inside string values
  const repaired = repairJSONStrings(blob);
  try { return JSON.parse(repaired); } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`蒸馏失败：JSON修复后仍无法解析（${msg}）。请重试。`);
  }
}

function repairJSONStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        result += ch;
        continue;
      }
      // Inside a string: peek at the next non-whitespace char.
      // If it's a JSON structural token the quote legitimately closes the string.
      // Otherwise it's an unescaped quote embedded in content — escape it.
      let j = i + 1;
      while (j < json.length && (json[j] === ' ' || json[j] === '\t' || json[j] === '\r' || json[j] === '\n')) j++;
      const next = j < json.length ? json[j] : '\0';
      if (next === '\0' || next === ',' || next === '}' || next === ']' || next === ':') {
        inString = false;
        result += '"';
      } else {
        result += '\\"';
      }
      continue;
    }

    if (inString) {
      // Escape bare control characters that are invalid in JSON strings
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }

    result += ch;
  }

  return result;
}
