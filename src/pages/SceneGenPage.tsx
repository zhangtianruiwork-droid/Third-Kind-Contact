import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clapperboard, KeyRound, Play, RefreshCw, Save, Trash2, UploadCloud } from 'lucide-react';
import type { Character } from '../lib/types';
import type { ArkConfigStatus, SeedanceTaskStatus } from '../lib/seedanceApi';
import type { CompanionScene, SeedanceRenderSettings } from '../lib/sceneTypes';
import { DEFAULT_SEEDANCE_SETTINGS, SCENE_KIND_LABELS } from '../lib/sceneTypes';
import { buildCompanionScenes, defaultVisualDescription } from '../lib/scenePlanner';
import { SceneStore } from '../lib/sceneStore';
import {
  createSeedanceTask,
  downloadSeedanceFrame,
  downloadSeedanceVideo,
  getArkConfigStatus,
  getSeedanceTask,
  saveArkConfig,
  sceneToSeedanceInput,
  toVideoAssetSrc,
} from '../lib/seedanceApi';

const F = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM = `'SF Mono','Roboto Mono',ui-monospace,monospace`;
const ACCENT = '#0071E3';

interface Props {
  character: Character;
  onBack: () => void;
  onDone: (character: Character) => void;
}

interface SceneAnchor {
  sceneId: string;
  title: string;
  dataUrl: string;
}

interface UploadedReferenceImage {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl: string;
}

interface RenderSceneOptions {
  manualRefs?: string[];
  anchorImage?: string;
  anchorSceneId?: string;
  forceReturnLastFrame?: boolean;
}

const ACCEPTED_REFERENCE_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.heic', '.heif'];
const ACCEPTED_REFERENCE_IMAGE_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
];
const REFERENCE_IMAGE_ACCEPT = [
  ...ACCEPTED_REFERENCE_IMAGE_MIME,
  ...ACCEPTED_REFERENCE_IMAGE_EXTENSIONS,
].join(',');

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseReferenceImages(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 1);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] || '';
}

function isAcceptedReferenceImage(file: File): boolean {
  const type = file.type.toLowerCase();
  return ACCEPTED_REFERENCE_IMAGE_MIME.includes(type) || ACCEPTED_REFERENCE_IMAGE_EXTENSIONS.includes(fileExtension(file.name));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error(`无法读取 ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function statusText(scene: CompanionScene): string {
  if (scene.status === 'succeeded') return scene.generationMode === 'identityReference' ? '角色一致' : '已生成';
  if (scene.status === 'running') return '生成中';
  if (scene.status === 'queued') return '排队中';
  if (scene.status === 'failed') return '失败';
  if (scene.status === 'expired') return '超时';
  return '草稿';
}

function sceneError(status: SeedanceTaskStatus): string {
  const error = status.error;
  if (!error) return `${status.status}`;
  return [error.code, error.message].filter(Boolean).join(': ') || `${status.status}`;
}

function anchorFromScene(scene?: CompanionScene | null): SceneAnchor | null {
  return scene?.lastFrameDataUrl
    ? { sceneId: scene.id, title: scene.title, dataUrl: scene.lastFrameDataUrl }
    : null;
}

function findIdleAnchorFrame(scenes: CompanionScene[]): SceneAnchor | null {
  return anchorFromScene(scenes.find(scene => scene.kind === 'idle' && scene.status === 'succeeded'));
}

function captureVideoFrameDataUrl(localPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('读取待机视频画面超时。'));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    video.onerror = () => {
      cleanup();
      reject(new Error('无法从待机视频读取人物参考帧。'));
    };
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = duration > 0.4 ? 0.25 : 0;
    };
    video.onseeked = () => {
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 960;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        cleanup();
        reject(new Error('无法创建人物参考帧画布。'));
        return;
      }
      context.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/png');
      cleanup();
      resolve(dataUrl);
    };

    video.src = toVideoAssetSrc(localPath);
    video.load();
  });
}

export function SceneGenPage({ character, onBack, onDone }: Props) {
  const [arkStatus, setArkStatus] = useState<ArkConfigStatus | null>(null);
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_SEEDANCE_SETTINGS.model);
  const [visualDescription, setVisualDescription] = useState(() => defaultVisualDescription(character));
  const [companionNeed, setCompanionNeed] = useState('桌面陪伴、聊天切换、学习工作陪伴、情绪安抚，整体像热门乙女游戏式精致二次元角色进入 Live2D 小舞台。');
  const [referenceImages, setReferenceImages] = useState('');
  const [uploadedReferenceImages, setUploadedReferenceImages] = useState<UploadedReferenceImage[]>([]);
  const [settings, setSettings] = useState<SeedanceRenderSettings>(DEFAULT_SEEDANCE_SETTINGS);
  const [scenes, setScenes] = useState<CompanionScene[]>(() => SceneStore.get(character.id));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [notice, setNotice] = useState('');
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});

  const playableCount = useMemo(
    () => scenes.filter(scene => scene.status === 'succeeded' && scene.localPath).length,
    [scenes],
  );
  const identityCount = useMemo(
    () => scenes.filter(scene => scene.status === 'succeeded' && scene.generationMode === 'identityReference').length,
    [scenes],
  );
  const totalSceneCount = scenes.length || 8;
  const collectReferenceImages = useCallback(() => [
    ...uploadedReferenceImages.map(image => image.dataUrl),
    ...parseReferenceImages(referenceImages),
  ].filter(Boolean).slice(0, 1), [referenceImages, uploadedReferenceImages]);
  const referenceImageCount = collectReferenceImages().length;
  const anchor = useMemo(() => findIdleAnchorFrame(scenes), [scenes]);
  const hasDrafts = scenes.length > 0;

  useEffect(() => {
    getArkConfigStatus()
      .then(status => {
        setArkStatus(status);
        setApiKeyName(status.apiKeyName || '');
        setModel(status.model || DEFAULT_SEEDANCE_SETTINGS.model);
        setSettings(prev => ({ ...prev, model: status.model || prev.model }));
      })
      .catch(err => setNotice(err instanceof Error ? err.message : String(err)));
  }, []);

  const refreshScenes = useCallback(() => {
    setScenes(SceneStore.get(character.id));
  }, [character.id]);

  const handleSaveArk = useCallback(async () => {
    setSavingKey(true);
    setNotice('');
    try {
      const next = await saveArkConfig({ apiKeyName, apiKey, model });
      setArkStatus(next);
      setSettings(prev => ({ ...prev, model: next.model || model }));
      setApiKey('');
      setNotice(`方舟密钥已保存 ${next.keyTail || ''}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingKey(false);
    }
  }, [apiKeyName, apiKey, model]);

  const handleReferenceUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const supported = files.filter(isAcceptedReferenceImage);
    const accepted = supported.slice(0, 1);
    const rejected = files.length - supported.length;
    const ignored = Math.max(0, supported.length - accepted.length);

    if (!accepted.length) {
      setNotice('未识别到可用图片。请上传 png、jpg、jpeg、webp、gif、bmp、tiff、heic 或 heif。');
      return;
    }

    try {
      const loaded = await Promise.all(accepted.map(async file => ({
        id: `${file.name}_${file.size}_${file.lastModified}`,
        name: file.name,
        size: formatBytes(file.size),
        type: file.type || fileExtension(file.name).replace('.', '').toUpperCase(),
        dataUrl: await readFileAsDataUrl(file),
      })));

      setUploadedReferenceImages(loaded.slice(0, 1));

      setNotice([
        `已载入 1 张角色参考图，生成时只会把这一张图传给 Seedance 作为人物身份参考。`,
        ignored ? '一次只使用 1 张参考图，其他图片已忽略。' : '',
        rejected ? `${rejected} 个文件不是支持的图片格式，已跳过。` : '',
      ].filter(Boolean).join(' '));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const removeUploadedReferenceImage = useCallback((id: string) => {
    setUploadedReferenceImages(prev => prev.filter(image => image.id !== id));
  }, []);

  const handlePlan = useCallback(() => {
    const planned = buildCompanionScenes(character, visualDescription, companionNeed, { ...settings, model });
    SceneStore.saveForCharacter(character.id, planned);
    setScenes(planned);
    setNotice(`已生成 ${planned.length} 个小舞台场景草稿。程序会先生成待机动画，再用待机人物帧生成其它差异化场景。`);
  }, [character, companionNeed, model, settings, visualDescription]);

  const updateScene = useCallback((sceneId: string, patch: Partial<CompanionScene>) => {
    const updated = SceneStore.update(character.id, sceneId, patch);
    if (updated) refreshScenes();
    return updated;
  }, [character.id, refreshScenes]);

  const getSceneAnchorFrame = useCallback(async (scene: CompanionScene): Promise<SceneAnchor | null> => {
    if (scene.lastFrameDataUrl) {
      return { sceneId: scene.id, title: scene.title, dataUrl: scene.lastFrameDataUrl };
    }
    if (scene.localPath) {
      try {
        const dataUrl = await captureVideoFrameDataUrl(scene.localPath);
        updateScene(scene.id, { lastFrameDataUrl: dataUrl });
        return { sceneId: scene.id, title: scene.title, dataUrl };
      } catch {
        // Fall through to the remote Seedance frame if one exists.
      }
    }
    if (!scene.remoteLastFrameUrl || !scene.taskId) return null;

    try {
      const frame = await downloadSeedanceFrame({
        characterId: character.id,
        sceneId: scene.id,
        taskId: scene.taskId,
        imageUrl: scene.remoteLastFrameUrl,
      });
      updateScene(scene.id, {
        localLastFramePath: frame.localPath,
        lastFrameDataUrl: frame.dataUrl,
      });
      return { sceneId: scene.id, title: scene.title, dataUrl: frame.dataUrl };
    } catch {
      return null;
    }
  }, [character.id, updateScene]);

  const renderScene = useCallback(async (scene: CompanionScene, options: RenderSceneOptions = {}) => {
    if (!arkStatus?.configured) {
      setNotice('请先保存火山方舟 API Key。');
      return;
    }

    const refs = options.manualRefs ?? collectReferenceImages();
    const hasUserReference = refs.length > 0;
    const useIdentityReference = !hasUserReference && !!options.anchorImage && scene.id !== options.anchorSceneId;
    setBusyId(scene.id);
    setNotice(`${scene.title}：正在创建 Seedance 任务${hasUserReference ? '（单张上传参考图）' : useIdentityReference ? '（待机锚点参考）' : ''}。`);

    try {
      const renderSettings = {
        ...settings,
        model,
        returnLastFrame: settings.returnLastFrame || !!options.forceReturnLastFrame,
      };
      const created = await createSeedanceTask(sceneToSeedanceInput(
        { ...scene, model },
        renderSettings,
        refs,
        useIdentityReference ? options.anchorImage : undefined,
      ));
      updateScene(scene.id, { status: 'queued', taskId: created.id, error: undefined });
      setNotice(`${scene.title}：任务已创建 ${created.id}。`);

      let finalStatus: SeedanceTaskStatus | null = null;
      for (let attempt = 0; attempt < 90; attempt++) {
        await wait(attempt === 0 ? 2000 : 10000);
        const status = await getSeedanceTask(created.id);
        finalStatus = status;
        if (status.status === 'queued' || status.status === 'running') {
          updateScene(scene.id, { status: status.status });
          setNotice(`${scene.title}：${status.status}，继续等待。`);
          continue;
        }
        break;
      }

      if (!finalStatus) throw new Error('任务没有返回最终状态。');
      if (finalStatus.status !== 'succeeded') {
        updateScene(scene.id, {
          status: finalStatus.status === 'expired' ? 'expired' : 'failed',
          error: sceneError(finalStatus),
        });
        setNotice(`${scene.title}：生成失败。`);
        return;
      }

      const videoUrl = finalStatus.content?.video_url;
      if (!videoUrl) throw new Error('任务成功但没有返回 video_url。');

      const lastFrameUrl = finalStatus.content?.last_frame_url;
      let framePatch: Partial<CompanionScene> = {};
      if (lastFrameUrl) {
        try {
          const frame = await downloadSeedanceFrame({
            characterId: character.id,
            sceneId: scene.id,
            taskId: created.id,
            imageUrl: lastFrameUrl,
          });
          framePatch = {
            remoteLastFrameUrl: lastFrameUrl,
            localLastFramePath: frame.localPath,
            lastFrameDataUrl: frame.dataUrl,
          };
        } catch (frameErr) {
          framePatch = {
            remoteLastFrameUrl: lastFrameUrl,
            error: `视频已生成，但尾帧锚点保存失败：${frameErr instanceof Error ? frameErr.message : String(frameErr)}`,
          };
        }
      }

      const downloaded = await downloadSeedanceVideo({
        characterId: character.id,
        sceneId: scene.id,
        taskId: created.id,
        videoUrl,
      });
      updateScene(scene.id, {
        status: 'succeeded',
        remoteVideoUrl: videoUrl,
        localPath: downloaded.localPath,
        bytes: downloaded.bytes,
        generationMode: hasUserReference || useIdentityReference ? 'identityReference' : 'reference',
        anchorSceneId: useIdentityReference ? options.anchorSceneId : undefined,
        error: undefined,
        ...framePatch,
      });
      setNotice(`${scene.title}：已下载到本地视频库。`);
    } catch (err) {
      updateScene(scene.id, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }, [arkStatus?.configured, character.id, collectReferenceImages, model, settings, updateScene]);

  const getIdleAnchor = useCallback(async (manualRefs: string[], autoGenerate = false): Promise<SceneAnchor | null> => {
    let latestScenes = SceneStore.get(character.id);
    let found = findIdleAnchorFrame(latestScenes);
    if (found) return found;

    const idle = latestScenes.find(scene => scene.kind === 'idle');
    if (!idle) return null;

    found = await getSceneAnchorFrame(idle);
    if (found) return found;

    if (autoGenerate) {
      setNotice(`${idle.title}：先生成待机动画，作为后续场景的人物锚点。`);
      await renderScene(idle, { manualRefs, forceReturnLastFrame: true });
      latestScenes = SceneStore.get(character.id);
      const nextIdle = latestScenes.find(scene => scene.kind === 'idle');
      if (!nextIdle) return null;
      found = await getSceneAnchorFrame(nextIdle);
      if (found) return found;
    }

    return null;
  }, [character.id, getSceneAnchorFrame, renderScene]);

  const renderOneWithAnchor = useCallback(async (scene: CompanionScene) => {
    const manualRefs = collectReferenceImages();
    if (manualRefs.length > 0 || scene.kind === 'idle') {
      await renderScene(scene, { manualRefs, forceReturnLastFrame: true });
      return;
    }

    const found = await getIdleAnchor(manualRefs, true);
    if (!found) {
      setNotice('需要先生成待机陪伴视频，才能用它保持其它场景的人物一致性。');
      return;
    }
    await renderScene(scene, {
      manualRefs,
      anchorImage: found.dataUrl,
      anchorSceneId: found.sceneId,
      forceReturnLastFrame: true,
    });
  }, [collectReferenceImages, getIdleAnchor, renderScene]);

  const renderAll = useCallback(async (forceConsistent = false) => {
    const manualRefs = collectReferenceImages();

    if (manualRefs.length > 0) {
      const latestScenes = SceneStore.get(character.id);
      for (const scene of latestScenes) {
        if (!forceConsistent && scene.status === 'succeeded') continue;
        await renderScene(scene, {
          manualRefs,
          forceReturnLastFrame: true,
        });
      }
      return;
    }

    const found = await getIdleAnchor(manualRefs, true);

    if (!found) {
      setNotice('待机动画锚点生成失败，无法继续生成其它场景。');
      return;
    }

    const latestScenes = SceneStore.get(character.id);
    for (const scene of latestScenes) {
      if (scene.kind === 'idle') continue;
      if (!forceConsistent && scene.status === 'succeeded') continue;
      await renderScene(scene, {
        manualRefs,
        anchorImage: found.dataUrl,
        anchorSceneId: found.sceneId,
        forceReturnLastFrame: true,
      });
    }
  }, [collectReferenceImages, getIdleAnchor, renderScene]);

  const clearVideoError = useCallback((sceneId: string) => {
    setVideoErrors(prev => {
      if (!prev[sceneId]) return prev;
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
  }, []);

  const markVideoError = useCallback((sceneId: string) => {
    setVideoErrors(prev => ({
      ...prev,
      [sceneId]: '预览无法读取本地 mp4。若刚生成完成，请重启桌面程序；若仍失败，请重新生成该场景。',
    }));
  }, []);

  return (
    <div style={{
      minHeight: '100%',
      background: '#F5F5F7',
      color: '#1D1D1F',
      fontFamily: F,
      padding: '20px 22px 28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={onBack} style={iconButtonStyle} title="返回">
            <ArrowLeft size={16} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clapperboard size={18} color={ACCENT} />
              <h2 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.01em' }}>小舞台场景</h2>
            </div>
            <div style={{ fontFamily: FM, fontSize: 11, color: '#8E8E93', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {character.name} · 已生成 {playableCount}/{totalSceneCount} · 角色一致 {identityCount}/{totalSceneCount} · 参考图 {referenceImageCount}/1
            </div>
          </div>
        </div>
        <button
          onClick={() => onDone(character)}
          style={{
            height: 34,
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: playableCount > 0 ? ACCENT : '#E5E5EA',
            color: playableCount > 0 ? '#FFFFFF' : '#8E8E93',
            fontFamily: F,
            cursor: 'pointer',
          }}
        >
          完成
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>
              <KeyRound size={14} />
              方舟密钥
            </div>
            <div style={{ color: '#8E8E93', fontFamily: FM, fontSize: 10, lineHeight: 1.6, marginBottom: 10 }}>
              {arkStatus?.configured ? `已配置 ${arkStatus.apiKeyName || 'ARK_API_KEY'} ${arkStatus.keyTail}` : '尚未配置 Seedance API Key'}
            </div>
            <label style={labelStyle}>API 名称</label>
            <input value={apiKeyName} onChange={e => setApiKeyName(e.target.value)} placeholder="api-key-..." style={inputStyle} />
            <label style={labelStyle}>API Key</label>
            <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={arkStatus?.configured ? '留空则保留已保存 key' : 'ark-...'} type="password" style={inputStyle} />
            <label style={labelStyle}>Seedance 模型</label>
            <input value={model} onChange={e => setModel(e.target.value)} style={inputStyle} />
            <button onClick={handleSaveArk} disabled={savingKey} style={primaryButtonStyle}>
              <Save size={14} />
              {savingKey ? '保存中' : '保存方舟配置'}
            </button>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>输出规格</div>
            <label style={labelStyle}>比例</label>
            <select
              value={settings.ratio}
              onChange={e => setSettings(prev => ({ ...prev, ratio: e.target.value as SeedanceRenderSettings['ratio'] }))}
              style={inputStyle}
            >
              {['3:4', '1:1', '9:16', '4:3', '16:9', '21:9', 'adaptive'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <label style={labelStyle}>分辨率</label>
            <select
              value={settings.resolution}
              onChange={e => setSettings(prev => ({ ...prev, resolution: e.target.value as SeedanceRenderSettings['resolution'] }))}
              style={inputStyle}
            >
              {['720p', '480p', '1080p'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <label style={labelStyle}>时长（秒）</label>
            <input
              value={settings.duration}
              onChange={e => setSettings(prev => ({ ...prev, duration: Math.max(4, Math.min(15, Number(e.target.value) || 5)) }))}
              type="number"
              min={4}
              max={15}
              style={inputStyle}
            />
            <div style={{ fontFamily: FM, fontSize: 10, color: '#8E8E93', lineHeight: 1.6 }}>
              上传参考图会作为唯一人物身份参考直接传给 Seedance；有参考图时不再叠加待机锚点，避免多图冲突。动作幅度和场景可以更丰富。
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>一致性锚点</div>
            <div style={{ fontFamily: FM, fontSize: 11, color: anchor ? '#34C759' : '#8E8E93', lineHeight: 1.6 }}>
              {anchor ? `当前锚点：${anchor.title}` : '暂无锚点。先生成一个满意的视频，或直接批量生成。'}
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>角色与场景描述</div>
            <label style={labelStyle}>角色视觉描述</label>
            <textarea
              value={visualDescription}
              onChange={e => setVisualDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 96, resize: 'vertical', lineHeight: 1.6 }}
            />
            <label style={labelStyle}>陪伴需求</label>
            <textarea
              value={companionNeed}
              onChange={e => setCompanionNeed(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical', lineHeight: 1.6 }}
            />
            <label style={labelStyle}>角色参考图上传（可选，仅 1 张，png / jpg / webp / gif / bmp / tiff / heic）</label>
            <label style={uploadBoxStyle}>
              <UploadCloud size={18} color={ACCENT} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>上传 1 张人物参考图</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: '#8E8E93' }}>
                参考图会严格锁定脸型、发型、服装主设计和整体配色；新上传会替换旧参考图。
              </span>
              <input
                type="file"
                accept={REFERENCE_IMAGE_ACCEPT}
                onChange={handleReferenceUpload}
                style={{ display: 'none' }}
              />
            </label>
            {uploadedReferenceImages.length > 0 && (
              <div style={referenceGridStyle}>
                {uploadedReferenceImages.map(image => (
                  <div key={image.id} style={referenceThumbStyle}>
                    <img src={image.dataUrl} alt={image.name} style={referenceImageStyle} />
                    <button
                      onClick={() => removeUploadedReferenceImage(image.id)}
                      style={referenceRemoveStyle}
                      title="删除参考图"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div style={referenceMetaStyle}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{image.name}</span>
                      <span>{image.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label style={labelStyle}>角色参考图 URL / Base64（可选，仅使用第一张）</label>
            <textarea
              value={referenceImages}
              onChange={e => setReferenceImages(e.target.value)}
              placeholder="也可以粘贴 1 个图片 URL 或 data:image/...;base64。若已上传图片，这里会被忽略。"
              style={{ ...inputStyle, minHeight: 58, resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ fontFamily: FM, fontSize: 10, color: '#8E8E93', lineHeight: 1.6, marginTop: 6 }}>
              单图严格参考模式：Seedance 每次只接收这一张人物参考图。人物脸型、发型、发色、眼睛、服装主设计、配饰、年龄感和体型比例必须贴近参考图；动作可以变化为招手、起身、转身、拿道具、走近等更大幅度状态。
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              <button onClick={handlePlan} style={primaryButtonStyle}>
                <RefreshCw size={14} />
                生成场景草稿
              </button>
              <button
                onClick={() => renderAll(false)}
                disabled={!hasDrafts || !!busyId}
                style={{ ...secondaryButtonStyle, opacity: !hasDrafts || busyId ? 0.55 : 1 }}
              >
                <Play size={14} />
                批量生成未完成
              </button>
              <button
                onClick={() => renderAll(true)}
                disabled={!hasDrafts || !!busyId}
                style={{ ...secondaryButtonStyle, opacity: !hasDrafts || busyId ? 0.55 : 1, borderColor: 'rgba(175,82,222,0.35)', color: '#AF52DE' }}
              >
                <RefreshCw size={14} />
                重建角色一致版
              </button>
            </div>
          </section>

          {notice && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.06)',
              color: notice.includes('失败') || notice.includes('无法') ? '#FF3B30' : '#3A3A3C',
              fontFamily: FM,
              fontSize: 11,
            }}>
              {notice}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {scenes.map(scene => (
              <div key={scene.id} style={sceneCardStyle}>
                <div style={{ aspectRatio: '3 / 4', borderRadius: 8, overflow: 'hidden', background: '#F2F2F7', marginBottom: 10 }}>
                  {scene.localPath ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        src={toVideoAssetSrc(scene.localPath)}
                        muted
                        loop
                        autoPlay
                        playsInline
                        controls
                        preload="metadata"
                        onCanPlay={() => clearVideoError(scene.id)}
                        onError={() => markVideoError(scene.id)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#111827' }}
                      />
                      {videoErrors[scene.id] && (
                        <div style={previewErrorStyle}>
                          {videoErrors[scene.id]}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={emptyPreviewStyle}>
                      {SCENE_KIND_LABELS[scene.kind]}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.title}</div>
                    <div style={{ fontFamily: FM, fontSize: 10, color: '#8E8E93', marginTop: 2 }}>{statusText(scene)}</div>
                  </div>
                  {scene.status === 'succeeded' ? <Check size={17} color={scene.generationMode === 'identityReference' ? '#AF52DE' : '#34C759'} /> : null}
                </div>
                <p style={{ color: '#6E6E73', fontSize: 11, lineHeight: 1.6, margin: '8px 0', minHeight: 36 }}>
                  {scene.triggerHint}
                </p>
                {scene.error && <div style={{ color: '#FF3B30', fontFamily: FM, fontSize: 10, lineHeight: 1.5, marginBottom: 8 }}>{scene.error}</div>}
                <button
                  onClick={() => renderOneWithAnchor(scene)}
                  disabled={!!busyId}
                  style={{ ...secondaryButtonStyle, width: '100%', justifyContent: 'center', opacity: busyId ? 0.55 : 1 }}
                >
                  <Play size={13} />
                  {busyId === scene.id ? '生成中' : scene.status === 'succeeded' ? '重新生成' : '生成视频'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: 10,
  padding: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const sceneCardStyle: React.CSSProperties = {
  ...panelStyle,
  padding: 10,
};

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.08)',
  background: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: FM,
  fontSize: 11,
  color: '#1D1D1F',
  letterSpacing: '0.08em',
  marginBottom: 10,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: FM,
  fontSize: 9,
  color: '#8E8E93',
  letterSpacing: '0.08em',
  margin: '8px 0 4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 7,
  padding: '7px 9px',
  fontSize: 12,
  fontFamily: FM,
  background: '#FAFAFA',
  color: '#1D1D1F',
  outline: 'none',
};

const primaryButtonStyle: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 8,
  border: 'none',
  background: ACCENT,
  color: '#FFFFFF',
  fontFamily: F,
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 34,
  padding: '0 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.1)',
  background: '#FFFFFF',
  color: '#1D1D1F',
  fontFamily: F,
  fontSize: 13,
  cursor: 'pointer',
};

const uploadBoxStyle: React.CSSProperties = {
  minHeight: 86,
  border: '1px dashed rgba(0,113,227,0.35)',
  borderRadius: 10,
  background: 'rgba(0,113,227,0.04)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: 12,
  cursor: 'pointer',
  color: '#1D1D1F',
  textAlign: 'center',
};

const referenceGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
  gap: 8,
  marginTop: 10,
};

const referenceThumbStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 9,
  overflow: 'hidden',
  background: '#F2F2F7',
  border: '1px solid rgba(0,0,0,0.08)',
  minHeight: 124,
};

const referenceImageStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  display: 'block',
};

const referenceRemoveStyle: React.CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 24,
  height: 24,
  borderRadius: 999,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.92)',
  color: '#FF3B30',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const referenceMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '6px 7px',
  fontFamily: FM,
  fontSize: 9,
  color: '#6E6E73',
};

const emptyPreviewStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#AEAEB2',
  fontFamily: FM,
  fontSize: 11,
};

const previewErrorStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
  background: 'rgba(255,255,255,0.9)',
  color: '#FF3B30',
  fontFamily: FM,
  fontSize: 10,
  lineHeight: 1.5,
  textAlign: 'center',
};
