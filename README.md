# Third Kind Contact / 英灵殿

<p align="center">
  <img src="docs/screenshots/desktop-companion-demo-optimized.gif" alt="Third Kind Contact desktop companion demo" width="760" />
</p>

<h3 align="center">一句话，复刻你喜欢人物的灵魂与形象</h3>

<p align="center">
  <strong>AI Character Studio · Soul Distillation · Visual Companion · Desktop Stage</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-Desktop-24C8DB">
  <img alt="React" src="https://img.shields.io/badge/React-UI-61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-3178C6">
  <img alt="Local First" src="https://img.shields.io/badge/Local--First-Data-22C55E">
  <img alt="BYOK" src="https://img.shields.io/badge/BYOK-Bring%20Your%20Own%20Key-F59E0B">
</p>

<p align="center">
  <a href="#项目介绍">项目介绍</a> ·
  <a href="#部署文档">部署文档</a> ·
  <a href="#功能清单">功能清单</a> ·
  <a href="#产品截图">产品截图</a> ·
  <a href="#支持组件">支持组件</a> ·
  <a href="#english">English</a>
</p>

---

## 项目介绍

Third Kind Contact / 英灵殿是一款 **MIT 开源** 的桌面端 AI 角色复刻工作室。你只需要输入一句话或一段角色资料，它就能帮助你提炼人物的性格、语言、思维方式与视觉形象，并把它召唤成可以聊天、可以生成形象、可以停留在桌面的 AI 伙伴。

它不是普通的提示词聊天壳，而是一套完整的角色生成流程：从角色设定、语料蒸馏、灵魂档案、形象生成，到桌面陪伴和舞台展示。

### 核心流程

```mermaid
flowchart LR
  A["一句话 / 人物资料"] --> B["召唤向导"]
  B --> C["语料补全"]
  C --> D["灵魂蒸馏"]
  D --> E["结构化角色档案"]
  E --> F["角色对话"]
  E --> G["形象生成"]
  E --> H["桌面陪伴"]
  E --> I["舞台展示"]
```

### 适合人群

| 人群 | 可以用它做什么 |
| --- | --- |
| 创作者 | 为小说、剧本、游戏、视觉企划建立稳定角色人格和语言风格 |
| AI 角色玩家 | 把喜欢的历史人物、虚构角色、原创设定复刻成可互动伙伴 |
| 开发者 | 研究角色智能体、人格建模、桌面伴侣和 Tauri 应用形态 |
| 个人用户 | 构建本地优先、自带模型 Key、可长期使用的 AI 角色工作台 |

---

## 部署文档

本项目提供三种运行方式，请根据你的目标选择。

### 部署方式选择

| 部署方式 | 特点 | 适用场景 | 启动命令 | 配置要求 |
| --- | --- | --- | --- | --- |
| Web 预览模式 | 启动快，适合看界面和截图 | UI 调试、产品预览、README 截图 | `npm run dev` | Node.js 18+ |
| 桌面应用模式 | 完整 Tauri 桌面体验 | 日常使用、桌面陪伴、本地能力测试 | `npx tauri dev` | Node.js 18+、Rust、Tauri 依赖 |
| 发行版构建 | 生成可分发桌面安装包 | 发布、演示、归档 | `npm run build` + `npx tauri build` | 完整 Tauri 构建环境 |

### 环境要求

| 组件 | 推荐版本 | 说明 |
| --- | --- | --- |
| Node.js | 18+ | 前端依赖安装与 Vite 开发服务 |
| npm | 9+ | 包管理工具 |
| Rust | stable | Tauri 后端编译 |
| WebView2 | Windows 默认通常已安装 | Tauri Windows 桌面运行环境 |
| Git | 任意现代版本 | 拉取源码 |

### 快速启动

```bash
git clone https://github.com/zhangtianruiwork-droid/Third-Kind-Contact.git
cd Third-Kind-Contact
npm install
```

启动 Web 预览：

```bash
npm run dev
```

打开：

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

### 配置推荐

| 使用目标 | 需要配置 | 说明 |
| --- | --- | --- |
| 只体验界面 | 无需 API Key | 可以浏览界面、查看流程、管理本地角色 |
| 灵魂蒸馏 + 对话 | DeepSeek-compatible API | 角色生成和聊天的核心能力 |
| 形象生成 | OpenAI-compatible Image API | 生成头像、像素形象或视觉资产 |
| 桌面舞台视频 | Volcengine Ark / Seedance | 可选的视频/舞台生成能力 |

### 启动后验证

| 检查项 | 期望结果 |
| --- | --- |
| 打开首页 | 看到英灵选择殿界面 |
| 点击设置 | 可以填写 DeepSeek / Image API 配置 |
| 新建角色 | 可以进入召唤仪式 |
| 填入 API Key 后蒸馏 | 可以生成结构化灵魂档案 |
| 桌面模式运行 | Tauri 窗口正常启动 |

---

## 功能清单

### 已实现

| 功能模块 | 描述 | 状态 |
| --- | --- | --- |
| 英灵选择殿 | 管理、选择、导出角色档案，展示头像、标签、身份和配置状态 | 已实现 |
| 召唤向导 | 通过姓名、时代、简介和语料创建新角色 | 已实现 |
| 灵魂蒸馏 | 自动提炼核心性格、语言风格、心智模型和互动方式 | 已实现 |
| 角色对话 | 与召唤后的角色持续对话，并保留本地会话记录 | 已实现 |
| API 设置 | 支持 DeepSeek-compatible、OpenAI-compatible、Ark / Seedance 等接口配置 | 已实现 |
| 形象生成 | 支持头像、像素形象和角色视觉资产生成 | 已实现 |
| 桌面伙伴 | 将角色以桌面陪伴形式运行，增强沉浸感 | 已实现 |
| 舞台工具 | 支持桌面舞台、场景资产和可选视频生成工作流 | 已实现 |
| 本地存储 | 角色、设置、会话、形象和场景默认保存到本机 | 已实现 |
| 导入导出 | 支持角色数据导出，便于备份和迁移 | 已实现 |

### 能力架构

```mermaid
flowchart TD
  subgraph UI["前端界面"]
    A["英灵选择殿"]
    B["召唤仪式"]
    C["设置面板"]
    D["桌面伙伴"]
  end

  subgraph Core["角色核心"]
    E["角色档案"]
    F["灵魂蒸馏"]
    G["对话记忆"]
    H["形象资产"]
  end

  subgraph APIs["外部模型接口"]
    I["DeepSeek-compatible Chat API"]
    J["OpenAI-compatible Image API"]
    K["Ark / Seedance Video API"]
  end

  subgraph Local["本地存储"]
    L["角色数据"]
    M["聊天记录"]
    N["设置与场景"]
  end

  A --> E
  B --> F
  C --> I
  C --> J
  C --> K
  F --> E
  E --> G
  E --> H
  D --> E
  E --> L
  G --> M
  H --> N
```

### 模块能力概览

| 模块 | 输入 | 输出 | 依赖 |
| --- | --- | --- | --- |
| 角色创建 | 名称、时代、简介、语料 | 角色基础档案 | 本地存储 |
| 灵魂蒸馏 | 人物资料、文本语料 | 性格、语言、心智模型 | DeepSeek-compatible API |
| 对话陪伴 | 用户消息、角色档案 | 角色回复、会话记录 | Chat API |
| 形象生成 | 角色设定、风格提示 | 头像 / sprite / 视觉资产 | OpenAI-compatible Image API |
| 桌面舞台 | 角色、形象、场景设定 | 桌面陪伴体验 | Tauri 桌面能力 |

---

## 产品截图

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

## API 配置

打开应用右上角设置面板，填入你自己的模型 Key。

| Provider | 用途 | 是否必需 |
| --- | --- | --- |
| DeepSeek-compatible API | 灵魂蒸馏与角色对话 | 推荐 |
| OpenAI-compatible Image API | 头像 / 像素形象生成 | 可选 |
| OpenAI-compatible Search API | 可选检索增强 | 可选 |
| Volcengine Ark / Seedance | 可选桌面舞台视频生成 | 可选 |

应用不托管你的 API Key，不提供任何第三方模型服务担保。请自行选择服务商，并遵守其服务条款。

---

## 支持组件

| 类型 | 支持方式 |
| --- | --- |
| LLM / Chat | DeepSeek-compatible、OpenAI-compatible 接口 |
| Image Generation | OpenAI-compatible 图像接口 |
| Video / Stage | Volcengine Ark / Seedance 工作流 |
| Desktop Runtime | Tauri |
| UI Framework | React + TypeScript |
| Local Data | localStorage / Tauri 本地数据目录 |
| License | MIT 开源协议 |

---

## 项目结构

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

## 安全与隐私

角色档案、设置、形象、场景和聊天记录默认保存在本机。只有当你主动触发需要模型能力的功能时，应用才会调用外部 API。

本仓库为公开源码版本，不包含内置 API Key、私有角色档案或个人生成素材。请不要将真实密钥提交到仓库。

---

## English

Third Kind Contact is an MIT-licensed desktop AI character studio built with Tauri and React. Give it a short prompt or source material, and it helps you turn a character into a structured AI persona with personality, speech style, mental models, visual identity, and optional desktop companion behavior.

### Deployment

| Mode | Best For | Command |
| --- | --- | --- |
| Web preview | UI testing and screenshots | `npm run dev` |
| Desktop app | Full Tauri desktop experience | `npx tauri dev` |
| Release build | Packaging and distribution | `npm run build` + `npx tauri build` |

### Feature List

- Herald Registry for character profile management.
- Summoning wizard for creating new personas.
- Soul distillation for traits, speech style, mental models, and interaction rules.
- Local conversation history.
- Avatar and pixel companion generation.
- Desktop companion and stage workflow.
- Bring-your-own compatible model APIs.
- MIT open-source license.

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

Third Kind Contact is open source under the MIT License. See [LICENSE](LICENSE).
