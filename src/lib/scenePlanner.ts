import type { Character } from './types';
import type { PetState } from './petActions';
import type { CompanionScene, CompanionSceneKind, SeedanceRenderSettings } from './sceneTypes';
import { DEFAULT_SEEDANCE_SETTINGS, SCENE_KIND_LABELS } from './sceneTypes';
import { OTOME_GAME_VISUAL_STYLE_CN } from './visualStyle';

const BLUEPRINTS: Array<{
  kind: CompanionSceneKind;
  triggerHint: string;
  scene: string;
  motion: string;
}> = [
  {
    kind: 'idle',
    triggerHint: '默认待机、没有明确情绪时使用',
    scene: '角色在符合其人设的小型生活舞台里做自己的事，例如整理桌面、翻看笔记、调试小道具、擦拭武器、泡茶或看窗外。动作自然松弛，不需要一直看向用户。',
    motion: '动作重点是生活化待机：呼吸、视线游移、整理小物、短暂停顿后继续自己的事，像角色真的住在这个小舞台里。',
  },
  {
    kind: 'listening',
    triggerHint: '用户正在输入、倾诉、提问时使用',
    scene: '角色停下手头的事，把注意力转向屏幕，身体微微前倾，认真倾听。背景可以保留刚才的生活空间，但加入正在进行的小物件，例如摊开的书、发光终端、茶杯或工作台。',
    motion: '动作重点是倾听：放下原本正在做的事、转头或抬眼看向用户、轻微点头、手停在书页或道具旁，避免继续做待机动作。',
  },
  {
    kind: 'thinking',
    triggerHint: 'AI 正在组织回答、推理、检索时使用',
    scene: '角色开始思考或查资料，根据人设使用不同方式：学者翻书写便签，战士查看地图，魔法师观察符文，工程师调试装置，艺术家在画板前构思。动作比待机更主动。',
    motion: '动作重点是推理和检索：翻页、记录、比对线索、观察道具或在桌面上移动资料，表情专注，不要只是安静站立。',
  },
  {
    kind: 'talking',
    triggerHint: '回复完成或角色正在说话时使用',
    scene: '角色自然地向用户回应，可以轻轻摆手、指向笔记、展示小物件、点头说明或露出符合性格的表情。背景应像一次小小的面对面交流，而不是固定站桩。',
    motion: '动作重点是表达：嘴部轻微说话感、手势说明、展示物件、点头或短暂微笑，节奏像正在和用户对话。',
  },
  {
    kind: 'greeting',
    triggerHint: '用户进入、唤醒角色、打招呼或角色主动欢迎时使用',
    scene: '角色注意到用户到来，放下手中的事情，转向屏幕并做出符合性格的问候动作。可以抬手招手、轻轻挥手、扶帽致意、微微鞠躬、展示小道具或露出开朗的欢迎表情。',
    motion: '动作重点是清楚的问候：抬手、挥手、身体微转、眼神看向用户，动作幅度比普通说话更大；但仍保持桌面小舞台的稳定镜头和角色优雅感。',
  },
  {
    kind: 'comfort',
    triggerHint: '用户低落、焦虑、失眠、需要安抚时使用',
    scene: '角色进入温柔陪伴状态，背景变成更安静的夜间或暖光场景；可以递出热饮、把外套披在椅背、放下手中工作、轻轻坐近，表达稳定和关心。',
    motion: '动作重点是安抚：靠近、放慢动作、递出热饮或柔软物件、温柔注视、让环境光更平稳，避免活泼夸张。',
  },
  {
    kind: 'focus',
    triggerHint: '学习、工作、番茄钟、安静陪伴时使用',
    scene: '角色专注地做自己的长期任务，和用户并肩工作。根据人设可以写作、读书、练习剑术维护、整理素材、修理机械、绘制星图或调配药剂。节奏平稳，适合循环播放。',
    motion: '动作重点是并肩专注：持续写作、阅读、维护装备、绘制或整理材料，偶尔短暂停顿，不频繁看向用户。',
  },
  {
    kind: 'standup',
    triggerHint: '角色准备行动、切换任务、被用户邀请一起出发时使用',
    scene: '角色从坐姿或靠近桌面的待机姿态中起身，整理衣摆、拿起代表性道具，像准备陪用户进入下一段任务。背景可以出现门口、窗边、书桌旁或小舞台边缘，让动作有明确空间感。',
    motion: '动作重点是大幅度姿态变化：起身、站起来、转身、拿起道具、向前迈半步或整理外套；必须明显区别于待机、说话和专注状态，但不要跳跃、奔跑或剧烈运镜。',
  },
];

export function defaultVisualDescription(character: Character): string {
  const traits = character.tags.slice(0, 3).join('、');
  return [
    `${character.name} 的原创二次元动画形象，默认采用精致视觉小说立绘审美`,
    character.title,
    traits ? `气质关键词：${traits}` : '',
    OTOME_GAME_VISUAL_STYLE_CN,
    '请补充固定的发型、发色、眼睛颜色、服装、配饰、年龄感、体型、代表性小道具和整体色调。',
  ].filter(Boolean).join('。');
}

function compact(value: string, fallback: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || fallback;
}

function buildIdentity(character: Character, visualDescription: string): string {
  const soul = character.soulProfile;
  const traits = soul?.coreTraits?.map(t => t.name).slice(0, 4).join('、') || character.tags.slice(0, 4).join('、');
  const redLines = soul?.redLines?.slice(0, 3).join('；') || '保持角色性格稳定，不做突兀夸张表演';
  return [
    `角色：${character.name}`,
    `身份气质：${character.title}，${character.era}`,
    traits ? `人格关键词：${traits}` : '',
    `固定视觉设定：${compact(visualDescription, defaultVisualDescription(character))}`,
    `不 OOC 约束：${redLines}`,
  ].filter(Boolean).join('。');
}

function sceneId(characterId: string, kind: CompanionSceneKind): string {
  return `${characterId}__${kind}`;
}

export function buildCompanionScenes(
  character: Character,
  visualDescription: string,
  userNeed: string,
  settings: SeedanceRenderSettings = DEFAULT_SEEDANCE_SETTINGS,
): CompanionScene[] {
  const now = new Date().toISOString();
  const identity = buildIdentity(character, visualDescription);
  const need = compact(userNeed, '桌面陪伴、聊天回应、学习工作陪伴、情绪安抚');

  return BLUEPRINTS.map(({ kind, triggerHint, scene, motion }) => {
    const prompt = [
      '原创二次元动画风格，无声短视频，透明桌面小舞台质感。',
      OTOME_GAME_VISUAL_STYLE_CN,
      identity,
      `用户需求：${need}。`,
      `当前状态：${SCENE_KIND_LABELS[kind]}。`,
      `场景设计：${scene}`,
      `动作设计：${motion}`,
      [
        '人物一致性要求：必须保持同一个角色的脸型、五官、眼睛颜色、发型、发色、服装、配饰、年龄感、体型比例和整体色调一致。',
        '参考图要求：如果提供人物参考图，必须严格按照参考图生成同一个角色；参考图优先级高于文字想象，不得换脸、换发型、换服装主设计、换年龄感或只参考画风。',
        '原创化要求：即使参考图很强，也不要生成任何已有动漫、游戏、影视、漫画、名人或商业 IP 角色；如果参考图接近某个已知角色，请保留通用外观特征但移除可识别 IP 标志、徽章、专属服装细节、武器和 logo。',
        '动作差异要求：除待机场景外，不要复刻待机视频里的姿势、手部位置、道具摆放、镜头角度或背景布局；每个状态都要有清楚不同的陪伴行为。',
        '镜头要求：固定桌面小舞台机位，像一台放在桌面上的透明小剧场；不要电影感运镜，不要推拉摇移、环绕、旋转、快速缩放、抖动、切镜或突然改变景别。',
        '表现方式要求：主要通过角色自己的动作、表情、手势、正在使用的道具和环境小细节来表现状态，不要依赖镜头运动制造变化。',
        '背景要求：背景可以随状态变化，且要贴合角色人设和当前陪伴状态；背景精致但不要抢戏，不需要和待机场景保持一致。',
        `循环要求：动作有开始和结束的自然回落，适合 ${settings.duration} 秒无缝循环；不要字幕、不要文字、不要 logo、不要水印。`,
      ].join(''),
    ].join('');

    return {
      id: sceneId(character.id, kind),
      characterId: character.id,
      kind,
      title: SCENE_KIND_LABELS[kind],
      triggerHint,
      prompt,
      status: 'draft',
      model: settings.model,
      ratio: settings.ratio,
      duration: settings.duration,
      resolution: settings.resolution,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function inferSceneKindFromDialogue(text: string): CompanionSceneKind {
  const lower = text.toLowerCase();
  if (/你好|嗨|早上好|晚上好|打招呼|招手|欢迎|hello|hi|wave|greet/.test(lower)) return 'greeting';
  if (/站起来|起身|出发|走吧|行动|准备|开始任务|stand|stand up|go/.test(lower)) return 'standup';
  if (/难过|焦虑|崩溃|失眠|害怕|孤独|压力|不开心|累了|安慰|陪陪|sad|anxious|tired/.test(lower)) return 'comfort';
  if (/学习|工作|专注|番茄钟|复习|写作|coding|study|focus|work/.test(lower)) return 'focus';
  if (/为什么|怎么|如何|分析|推理|想一想|计划|方案|why|how/.test(lower)) return 'thinking';
  return 'talking';
}

export function sceneKindFromPetAction(action: PetState): CompanionSceneKind {
  if (action === 'thinking') return 'thinking';
  if (action === 'waving') return 'greeting';
  if (action === 'talking') return 'talking';
  return 'idle';
}
