# Third Kind Contact / 英灵殿

> 一句话，完美复刻你喜欢人物的灵魂与形象。  
> Recreate the soul, voice, and visual presence of any character you love, from a single prompt.



Third Kind Contact is a Tauri + React desktop companion studio. It turns a short character description into a structured AI persona: personality, speech style, mental models, interaction patterns, avatar assets, and an optional desktop companion stage.

英灵殿是一个桌面端 AI 角色复刻工作室。你只需要写下一句话或一段描述，它就能帮助你把喜欢的人物转化为可对话、可召唤、可生成形象、可停留在桌面的 AI 伙伴。

This repository is the clean public source release: no bundled API keys, no cloned private characters, and no private generated assets.

本仓库是公开纯净版：不内置 API Key，不包含私有克隆角色，不包含个人生成素材。

## Why It Exists / 项目理念

Most AI chat tools stop at "a prompt". Third Kind Contact goes further: it builds a full character archive that can be inspected, refined, summoned, and reused.

多数 AI 角色工具停留在“一段提示词”。英灵殿更进一步：它把人物复刻成一份可审阅、可调整、可召唤、可长期保存的灵魂档案。

- **Soul distillation**: extract personality traits, speech patterns, beliefs, memories, and reasoning style from user-provided material.
- **Visual embodiment**: generate or attach avatar and sprite assets so the character has a visible presence.
- **Desktop companion mode**: keep the character on your desktop as an interactive companion.
- **Local-first workflow**: profiles, chat history, and settings stay local unless you explicitly export them.
- **Bring your own keys**: connect your own DeepSeek-compatible, OpenAI-compatible, or Volcengine Ark / Seedance APIs.

- **灵魂蒸馏**：从语料中提取性格、语言风格、信念、记忆和思维方式。
- **形象复刻**：为角色生成或绑定头像、像素形象和舞台素材。
- **桌面陪伴**：让角色以可交互小伙伴的形式停留在桌面。
- **本地优先**：角色、设置、聊天记录默认保存在本机。
- **自带密钥**：用户自行接入 DeepSeek 兼容接口、OpenAI 兼容接口或火山方舟 / Seedance。

## Screenshots / 产品截图

### 1. Herald Registry / 英灵选择殿

Create, manage, select, and export your character profiles in the original Valhalla-style registry.

在英灵选择殿中创建、管理、选择和导出你的角色档案。

![Herald gallery with settings](docs/screenshots/herald-gallery-with-settings.png)

### 2. Soul Distillation / 灵魂蒸馏

The app turns raw material into structured traits, speech tags, mental models, and interaction rules before summoning the character.

应用会把原始语料转化为核心性格特征、语言风格、心智模型和互动方式，再完成角色召唤。

![Soul distillation result](docs/screenshots/soul-distillation-result.png)

### 3. Summoning Ritual / 召唤仪式

Start from a name, era, short description, and source material. The wizard guides you from concept to usable companion.

从姓名、时代、简介和语料开始，召唤向导会带你完成从想法到可用 AI 伙伴的全过程。

![Summon ritual](docs/screenshots/summon-ritual.png)

## What You Can Build / 你可以复刻什么

- Fictional characters with consistent personality, voice, and interaction habits.
- Historical figures for study, roleplay, writing, or simulation.
- Original characters for games, novels, visual projects, and companion apps.
- Personal productivity companions with custom tone, memory, and workflows.

- 拥有稳定人格、语气和互动习惯的虚构角色。
- 用于学习、写作、角色扮演或模拟的历史人物。
- 游戏、小说、视觉项目中的原创角色。
- 拥有自定义语气、记忆和工作流的个人桌面助手。

## Clean Release Guarantees / 纯净版承诺

This public version intentionally removes private data:

- No bundled API keys.
- No prebuilt or cloned character profiles.
- No private avatars, sprites, or desktop-stage assets.
- No exported localStorage seed file.
- No `node_modules`, `dist`, or Tauri `target` cache.
- Clean build uses an isolated app identifier and storage prefix, so it will not inherit private local data from the original app.

此公开版本已移除私有数据：

- 不内置任何 API Key。
- 不包含预置或克隆人物档案。
- 不包含私有人物头像、sprite 或舞台素材。
- 不包含导出的 localStorage 种子文件。
- 不包含 `node_modules`、`dist` 或 Tauri `target` 缓存。
- 纯净版使用独立应用 ID 和独立本地存储前缀，不会继承原版应用的私有本地数据。

## Quick Start / 快速开始

```bash
git clone https://github.com/zhangtianruiwork-droid/Third-Kind-Contact.git
cd Third-Kind-Contact
npm install
npm run dev
```

Open the web preview:

```text
http://localhost:5173
```

Run the desktop app:

```bash
npx tauri dev
```

Build a release:

```bash
npm run build
npx tauri build
```

## API Setup / API 配置

Open the settings panel in the top-right corner and paste your own keys.

打开右上角设置面板，填入你自己的模型密钥。

| Provider | Purpose |
| --- | --- |
| DeepSeek-compatible API | Soul distillation and chat |
| OpenAI-compatible image API | Avatar / sprite generation |
| OpenAI-compatible search API | Optional retrieval augmentation |
| Volcengine Ark / Seedance | Optional desktop-stage video generation |

Never commit real secrets. Use `.env.example` only as a reference.

请不要提交真实密钥，`.env.example` 仅作为配置参考。

## Project Structure / 项目结构

```text
src/
  SelectionApp.tsx        Original selection hall / 英灵选择殿
  PetApp.tsx              Desktop companion mode / 桌面伙伴模式
  pages/SummonPage.tsx    Summoning wizard / 召唤向导
  pages/SpriteGenPage.tsx Pixel sprite generation / 像素形象生成
  pages/SceneGenPage.tsx  Stage video tooling / 舞台视频工具
  lib/                    API clients, stores, seed export helpers

src-tauri/
  src/lib.rs              Tauri backend commands

docs/screenshots/         README media
```

## Privacy / 隐私

Profiles, settings, sprites, scenes, and chat history are stored locally by default. External API calls happen only when you trigger features that require a model provider.

角色档案、设置、形象、场景和聊天记录默认保存在本机。只有当你主动触发需要模型能力的功能时，应用才会调用外部 API。

## License

MIT. See [LICENSE](LICENSE).
