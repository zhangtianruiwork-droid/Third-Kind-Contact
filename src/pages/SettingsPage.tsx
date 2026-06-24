import { useState } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, Search } from 'lucide-react';
import { AppConfig } from '../lib/store';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const config = AppConfig.get();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [modelCreation, setModelCreation] = useState(config.modelCreation);
  const [modelChat, setModelChat] = useState(config.modelChat);
  const [openaiApiKey, setOpenaiApiKey] = useState(config.openaiApiKey);
  const [searchModel, setSearchModel] = useState(config.searchModel);
  const [showKey, setShowKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    AppConfig.save({ apiKey, modelCreation, modelChat, openaiApiKey, searchModel });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page min-h-screen pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-text-secondary hover:text-gold transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-gold font-serif text-2xl">设置</h2>
            <p className="text-text-dim text-xs">API配置与模型参数</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <div className="soul-card space-y-3">
            <h3 className="text-gold/80 text-sm font-mono">DeepSeek API Key</h3>
            <p className="text-text-dim text-xs">API Key 仅存储在本地浏览器，不会上传</p>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="summon-input flex-1"
                placeholder="sk-..."
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="btn-ghost px-3"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Models */}
          <div className="soul-card space-y-4">
            <h3 className="text-gold/80 text-sm font-mono">模型配置</h3>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">角色创造模型（灵魂蒸馏）</label>
              <input
                type="text"
                value={modelCreation}
                onChange={e => setModelCreation(e.target.value)}
                className="summon-input"
                placeholder="deepseek-v4-pro"
              />
              <p className="text-text-dim text-xs">推荐使用最强模型，蒸馏质量更好</p>
            </div>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">对话模型（长期对话）</label>
              <input
                type="text"
                value={modelChat}
                onChange={e => setModelChat(e.target.value)}
                className="summon-input"
                placeholder="deepseek-v4-flash"
              />
              <p className="text-text-dim text-xs">推荐使用快速模型，响应更流畅</p>
            </div>
          </div>

          <div className="soul-card space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gold/70" />
              <h3 className="text-gold/80 text-sm font-mono">搜索增强（可选）</h3>
            </div>
            <p className="text-text-dim text-xs leading-relaxed">
              DeepSeek API 目前没有公开的原生搜索开关。填写 OpenAI API Key 后，召唤时会先用 OpenAI Web Search 获取辅助资料，再交给 DeepSeek V4 Pro 做灵魂蒸馏；不填写则回退到公开百科检索。
            </p>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">OpenAI API Key（搜索专用）</label>
              <div className="flex gap-2">
                <input
                  type={showOpenAIKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={e => setOpenaiApiKey(e.target.value)}
                  className="summon-input flex-1"
                  placeholder="sk-..."
                />
                <button
                  onClick={() => setShowOpenAIKey(v => !v)}
                  className="btn-ghost px-3"
                >
                  {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-text-dim text-xs">仅本地浏览器保存；搜索失败会自动使用百科检索。</p>
            </div>

            <div className="space-y-2">
              <label className="text-text-secondary text-sm">搜索模型</label>
              <input
                type="text"
                value={searchModel}
                onChange={e => setSearchModel(e.target.value)}
                className="summon-input"
                placeholder="gpt-5"
              />
              <p className="text-text-dim text-xs">推荐使用支持 Responses API Web Search 的模型，例如 gpt-5。</p>
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} className="btn-gold w-full flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saved ? '已保存 ✓' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
