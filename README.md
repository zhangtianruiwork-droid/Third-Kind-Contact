# Third Kind Contact / 英灵殿

<p align="center">
  <img src="docs/screenshots/desktop-companion-demo-optimized.gif" alt="Third Kind Contact desktop companion demo" width="760" />
</p>

<h3 align="center">一句话，复刻你喜欢人物的灵魂与形象</h3>

<p align="center">
  <strong>AI Character Studio · Soul Distillation · Visual Companion · Desktop Stage</strong>
</p>

<p align="center">
  <a href="#快速开始--quick-start">快速开始</a> ·
  <a href="#功能亮点--features">功能亮点</a> ·
  <a href="#产品截图--screenshots">产品截图</a> ·
  <a href="#api-配置--api-setup">API 配置</a> ·
  <a href="#english">English</a>
</p>

Third Kind Contact / 英灵殿是一款桌面端 AI 角色复刻工作室。你只需要输入一句话或一段角色资料，它就能帮助你提炼人物的性格、语言、思维方式与视觉形象，并把它召唤成可以聊天、可以生成形象、可以停留在桌面的 AI 伙伴。

它不是普通的提示词聊天壳，而是一套完整的角色生成流程：从角色设定、语料蒸馏、灵魂档案、形象生成，到桌面陪伴和舞台展示。

---

## 适合谁使用 / Who Is It For

- 想把喜欢的历史人物、小说角色、游戏角色复刻成 AI 伙伴的人。
- 正在创作小说、剧本、游戏、视觉企划，需要稳定角色人格与语言风格的创作者。
- 想研究“角色智能体”“人格建模”“桌面陪伴应用”的开发者。
- 需要一个本地优先、可自带模型 Key、可自由扩展的 AI 角色工作台的用户。

---

## 功能亮点 / Features

| 功能 | 说明 |
| --- | --- |
| 一句话召唤 | 输入人物名称、时代、简介或语料，快速生成角色档案 |
| 灵魂蒸馏 | 自动提炼性格特征、语言风格、心智模型、互动方式 |
| 英灵选择殿 | 管理、选择、导出你的角色档案 |
| 对话与陪伴 | 与角色持续对话，并保存本地会话记录 |
| 形象生成 | 支持头像、像素形象、桌面角色资产生成 |
| 桌面舞台 | 将角色放到桌面环境中，以更具沉浸感的方式互动 |
| 本地优先 | 角色、设置、聊天记录默认存放在本机 |
| 自带模型 | 支持 DeepSeek / OpenAI 兼容接口及可选视频生成接口 |

---

## 产品截图 / Screenshots

### 英灵选择殿

管理你创建的角色，查看身份、标签、形象和配置状态。

![Herald gallery with settings](docs/screenshots/herald-gallery-with-settings.png)

### 灵魂蒸馏结果

将输入语料转化为结构化人格：核心性格、语言风格、心智模型与互动方式。

![Soul distillation result](docs/screenshots/soul-distillation-result.png)

### 召唤仪式

从基础信息到语料补全，再到灵魂蒸馏和确认召唤，完整生成一个可使用的角色。

![Summon ritual](docs/screenshots/summon-ritual.png)

---

## 快速开始 / Quick Start

```bash
git clone https://github.com/zhangtianruiwork-droid/Third-Kind-Contact.git
cd Third-Kind-Contact
npm install
npm run dev
```

打开网页预览：

```text
http://localhost:5173
```

启动桌面版：

```bash
npx tauri dev
```

构建发行版：

```bash
npm run build
npx tauri build
```

---

## API 配置 / API Setup

打开应用右上角设置面板，填入你自己的模型 Key。

| Provider | 用途 |
| --- | --- |
| DeepSeek-compatible API | 灵魂蒸馏与角色对话 |
| OpenAI-compatible Image API | 头像 / 像素形象生成 |
| OpenAI-compatible Search API | 可选检索增强 |
| Volcengine Ark / Seedance | 可选桌面舞台视频生成 |

应用不托管你的 API Key，不提供任何第三方模型服务担保。请自行选择服务商，并遵守其服务条款。

---

## 项目结构 / Project Structure

```text
src/
  SelectionApp.tsx        英灵选择殿
  PetApp.tsx              桌面伙伴模式
  pages/SummonPage.tsx    召唤向导
  pages/SpriteGenPage.tsx 像素形象生成
  pages/SceneGenPage.tsx  舞台视频工具
  lib/                    API、存储、导入导出逻辑

src-tauri/
  src/lib.rs              Tauri 后端命令

docs/screenshots/         README 展示素材
```

---

## 安全与隐私 / Privacy

角色档案、设置、形象、场景和聊天记录默认保存在本机。只有当你主动触发需要模型能力的功能时，应用才会调用外部 API。

本仓库为公开源码版本，不包含内置 API Key、私有角色档案或个人生成素材。请不要将真实密钥提交到仓库。

---

## English

Third Kind Contact is a desktop AI character studio built with Tauri and React. Give it a short prompt or source material, and it helps you turn a character into a structured AI persona with personality, speech style, mental models, visual identity, and optional desktop companion behavior.

It is designed for writers, roleplay creators, game developers, AI companion builders, and anyone who wants a local-first character creation workflow.

### Highlights

- Create a character from a short description or source material.
- Distill personality traits, speaking style, mental models, and interaction patterns.
- Manage profiles in the Valhalla-style Herald Registry.
- Chat with characters and keep local conversation history.
- Generate avatar and pixel companion assets.
- Run the app as a desktop companion experience.
- Bring your own DeepSeek-compatible, OpenAI-compatible, or optional video-generation APIs.

### Development

```bash
git clone https://github.com/zhangtianruiwork-droid/Third-Kind-Contact.git
cd Third-Kind-Contact
npm install
npm run dev
```

Desktop mode:

```bash
npx tauri dev
```

---

## License

MIT. See [LICENSE](LICENSE).
