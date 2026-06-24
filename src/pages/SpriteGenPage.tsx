import { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw, Download, ArrowLeft, Zap, Camera, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';
import {
  generatePixelSprite,
  generatePoseFromReference,
  pixelatePhoto,
  extractVisualAppearance,
  withRetry,
  sleep,
} from '../lib/imageApi';
import { SpriteStore } from '../lib/spriteStore';
import { ALL_POSES, POSE_INFO, buildSpritePrompt, buildPhotoPixelPrompt, type PetState } from '../lib/petActions';
import { makeTransparentAsync } from '../lib/spriteUtils';
import { CharacterStore } from '../lib/store';
import type { Character } from '../lib/types';

const F      = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM     = `'SF Mono','Roboto Mono',ui-monospace,monospace`;
const ACCENT = '#0071E3';

type Mode   = 'ai' | 'photo';
type Status = 'idle' | 'loading' | 'done' | 'error';

interface PoseState {
  status: Status;
  b64:    string | null;
  error:  string | null;
}

function emptyPose(): PoseState { return { status: 'idle', b64: null, error: null }; }

function initPoses(): Record<PetState, PoseState> {
  return Object.fromEntries(ALL_POSES.map(p => [p, emptyPose()])) as Record<PetState, PoseState>;
}

function friendlyError(msg: string | null): string {
  if (!msg) return '未知错误';
  if (msg.includes('quota') || msg.includes('preConsumedQuota')) return '配额不足，已自动重试。如仍失败请稍后点击「重新生成」';
  if (msg.includes('消息流') || msg.includes('traceid')) return '连接异常，已自动重试。请重试';
  if (msg.includes('429')) return '请求过频，请稍后重试';
  if (msg.includes('timeout') || msg.includes('504')) return '生成超时（约90-150秒），请重试';
  return msg.slice(0, 200);
}

// ── Sub-components ────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      padding: 20, marginBottom: 16, ...style,
    }}>{children}</div>
  );
}

function PoseCard({ pose, state, onRegenerate }: {
  pose: PetState; state: PoseState; onRegenerate: (p: PetState) => void;
}) {
  const info = POSE_INFO[pose];
  const src  = state.b64
    ? (state.b64.startsWith('data:') ? state.b64 : `data:image/png;base64,${state.b64}`)
    : null;

  return (
    <div style={{
      background: state.status === 'done' ? '#FAFFFE' : '#FAFAFA',
      border: `1.5px solid ${
        state.status === 'done'    ? 'rgba(52,199,89,0.3)'   :
        state.status === 'error'   ? 'rgba(255,59,48,0.3)'   :
        state.status === 'loading' ? `${ACCENT}33`           : 'rgba(0,0,0,0.08)'
      }`,
      borderRadius: 12, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Preview */}
      <div style={{
        height: 130, background: state.status === 'done' ? 'transparent' : '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {state.status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <Loader style={{ width: 20, height: 20, color: ACCENT, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 10, fontFamily: FM, color: '#AEAEB2', marginTop: 6 }}>生成中…</div>
            <div style={{ fontSize: 9, fontFamily: FM, color: '#C7C7CC', marginTop: 2 }}>约90-150s</div>
          </div>
        )}
        {state.status === 'done' && src && (
          <img src={src} style={{ height: '100%', width: '100%', objectFit: 'contain', imageRendering: 'pixelated', padding: 4 }} />
        )}
        {state.status === 'error' && (
          <div style={{ textAlign: 'center', padding: '0 10px' }}>
            <AlertCircle style={{ width: 18, height: 18, color: '#FF3B30' }} />
            <div style={{ fontSize: 9, fontFamily: FM, color: '#FF3B30', marginTop: 5, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {friendlyError(state.error)}
            </div>
          </div>
        )}
        {state.status === 'idle' && (
          <div style={{ fontSize: 22, opacity: 0.15 }}>?</div>
        )}
        {state.status === 'done' && (
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <CheckCircle style={{ width: 14, height: 14, color: '#34C759' }} />
          </div>
        )}
      </div>

      {/* Label + button */}
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600, color: '#1D1D1F' }}>{info.label}</span>
          <span style={{ fontSize: 9, fontFamily: FM, color: '#AEAEB2' }}>{info.englishLabel.toUpperCase()}</span>
        </div>
        <button
          onClick={() => onRegenerate(pose)}
          disabled={state.status === 'loading'}
          style={{
            height: 26, width: '100%', background: 'transparent',
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6,
            fontSize: 10, fontFamily: FM, color: '#6E6E73',
            cursor: state.status === 'loading' ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            opacity: state.status === 'loading' ? 0.4 : 1,
          }}
        >
          <RefreshCw style={{ width: 10, height: 10 }} /> 重新生成
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

interface Props {
  character: Character;
  onBack: () => void;
  onDone: (character: Character) => void;
}

export function SpriteGenPage({ character, onBack, onDone }: Props) {
  const [mode, setMode]             = useState<Mode>('ai');
  const [poses, setPoses]           = useState<Record<PetState, PoseState>>(initPoses);
  const [photoSrc, setPhotoSrc]     = useState<string | null>(null);
  const [anchor, setAnchor]         = useState('');
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [running, setRunning]       = useState(false);
  const [saved, setSaved]           = useState(false);

  // Raw (white-bg) b64 of the idle sprite — used as reference for other poses
  const referenceRef = useRef<string | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const fileRef      = useRef<HTMLInputElement>(null);

  // ── Load existing sprites on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await SpriteStore.getAll(character.id, ALL_POSES);
      if (cancelled) return;
      const anyFound = ALL_POSES.some(p => existing[p] != null);
      if (!anyFound) return;
      setPoses(prev => {
        // Never overwrite poses that are currently being generated
        if (ALL_POSES.some(p => prev[p].status === 'loading')) return prev;
        const next = { ...prev };
        ALL_POSES.forEach(p => {
          if (existing[p]) next[p] = { status: 'done', b64: existing[p], error: null };
        });
        return next;
      });
      if (existing['idle']) referenceRef.current = existing['idle'];
    })();
    return () => { cancelled = true; };
  }, [character.id]);

  const donePoses  = ALL_POSES.filter(p => poses[p].status === 'done').length;
  const allDone    = donePoses === ALL_POSES.length;

  const updatePose = useCallback((pose: PetState, update: Partial<PoseState>) => {
    setPoses(prev => ({ ...prev, [pose]: { ...prev[pose], ...update } }));
  }, []);

  // ── AI extract visual appearance ───────────────────────────
  const handleExtractAppearance = useCallback(async () => {
    setAnchorLoading(true);
    try {
      const result = await extractVisualAppearance({
        name: character.name,
        title: character.title,
        era: character.era,
        description: character.description,
        tags: character.tags,
        soulProfile: character.soulProfile ?? null,
      });
      setAnchor(result.trim());
    } catch (e) {
      setAnchor(`${character.name}, ${character.title}, ${character.era}. ${character.description.slice(0, 150)}`);
    } finally {
      setAnchorLoading(false);
    }
  }, [character]);

  // ── Generate a single pose (with automatic retry) ─────────
  const generateOne = useCallback(async (pose: PetState, signal: AbortSignal) => {
    updatePose(pose, { status: 'loading', error: null });
    try {
      const rawB64 = await withRetry(async () => {
        if (signal.aborted) throw new Error('abort');

        if (mode === 'photo' && photoSrc) {
          const prompt = buildPhotoPixelPrompt(character, pose) + (anchor ? ` Also match: ${anchor}` : '');
          return (await pixelatePhoto(photoSrc, prompt, signal)).b64;
        }
        if (pose === 'idle' || !referenceRef.current) {
          const prompt = buildSpritePrompt(character, pose, anchor || undefined);
          const b64 = (await generatePixelSprite(prompt, signal)).b64;
          if (pose === 'idle') referenceRef.current = b64;
          return b64;
        }
        return (await generatePoseFromReference(
          referenceRef.current,
          POSE_INFO[pose].desc,
          signal,
        )).b64;
      }, 2, 12000);

      const b64 = await makeTransparentAsync(rawB64);
      await SpriteStore.save(character.id, pose, b64);
      updatePose(pose, { status: 'done', b64 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('abort')) updatePose(pose, { status: 'error', error: msg });
    }
  }, [mode, photoSrc, character, anchor, updatePose]);

  // ── Generate all (idle first → reference → rest) ──────────
  const generateAll = useCallback(async (posesToGen: PetState[] = ALL_POSES) => {
    setRunning(true);
    setSaved(false);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // If not regenerating idle, load existing idle as reference
    if (!posesToGen.includes('idle')) {
      const existingIdle = await SpriteStore.get(character.id, 'idle');
      if (existingIdle) referenceRef.current = existingIdle;
    }

    // Always generate idle first so it can be reference for the rest
    const ordered: PetState[] = posesToGen.includes('idle')
      ? ['idle', ...posesToGen.filter(p => p !== 'idle')]
      : posesToGen;

    // Reset targeted poses to idle
    setPoses(prev => {
      const next = { ...prev };
      ordered.forEach(p => { next[p] = emptyPose(); });
      return next;
    });

    for (let i = 0; i < ordered.length; i++) {
      if (signal.aborted) break;
      await generateOne(ordered[i], signal);
      if (i < ordered.length - 1) await sleep(2000);
    }

    setRunning(false);
  }, [character.id, generateOne]);

  const handleGenerateAll = useCallback(() => generateAll(), [generateAll]);

  const handleRegenerate = useCallback(async (pose: PetState) => {
    // Load reference if regenerating non-idle and reference not in memory
    if (pose !== 'idle' && !referenceRef.current) {
      const existing = await SpriteStore.get(character.id, 'idle');
      if (existing) referenceRef.current = existing;
    }
    abortRef.current = new AbortController();
    generateOne(pose, abortRef.current.signal);
  }, [character.id, generateOne]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setPoses(prev => {
      const next = { ...prev };
      ALL_POSES.forEach(p => { if (next[p].status === 'loading') next[p] = emptyPose(); });
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const updated: Character = { ...character, hasPixelSprites: true };
    CharacterStore.save(updated);
    setSaved(true);
    setTimeout(() => onDone(updated), 700);
  }, [character, onDone]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const canGenerate = mode === 'ai' || (mode === 'photo' && !!photoSrc);

  return (
    <div style={{ minHeight: '100%', background: '#F5F5F7', padding: '28px 28px 40px', fontFamily: F }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontFamily: FM, color: '#6E6E73',
          }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} /> 返回
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
            像素灵魂工坊
          </h1>
          <div style={{ fontSize: 11, fontFamily: FM, color: '#AEAEB2', marginTop: 2, letterSpacing: '0.06em' }}>
            PIXEL SPRITE FORGE · {character.name.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <Card>
        <div style={{ fontSize: 11, fontFamily: FM, color: '#6E6E73', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          生成模式
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { key: 'ai'    as Mode, label: '✨ AI 智能生成', desc: '根据角色资料自动构建像素形象' },
            { key: 'photo' as Mode, label: '📸 照片像素化',  desc: '上传照片，AI 转换为像素精灵' },
          ]).map(({ key, label, desc }) => (
            <div
              key={key}
              onClick={() => { setMode(key); setPhotoSrc(null); }}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${mode === key ? ACCENT : 'rgba(0,0,0,0.08)'}`,
                background: mode === key ? `${ACCENT}09` : '#FAFAFA',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: mode === key ? ACCENT : '#1D1D1F', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 11, fontFamily: FM, color: '#AEAEB2' }}>{desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Photo upload */}
      {mode === 'photo' && (
        <Card>
          <div style={{ fontSize: 11, fontFamily: FM, color: '#6E6E73', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            上传参考照片
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          {photoSrc ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <img src={photoSrc} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }} />
              <div>
                <div style={{ fontSize: 13, color: '#34C759', fontWeight: 500, marginBottom: 6 }}>✓ 照片已上传</div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontFamily: FM, color: '#6E6E73', cursor: 'pointer' }}
                >
                  更换照片
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '1.5px dashed rgba(0,0,0,0.12)', borderRadius: 10, padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                cursor: 'pointer', transition: 'all 0.15s', background: '#FAFAFA',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${ACCENT}55`; e.currentTarget.style.background = `${ACCENT}05`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.background = '#FAFAFA'; }}
            >
              <Camera style={{ width: 28, height: 28, color: '#AEAEB2' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>点击上传照片</div>
                <div style={{ fontSize: 11, fontFamily: FM, color: '#C7C7CC', marginTop: 3 }}>PNG / JPG / WebP · 最大 10MB</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Appearance Anchor */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 11, fontFamily: FM, color: '#6E6E73', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ✦ 形象锚定
            </span>
            <span style={{ fontSize: 10, fontFamily: FM, color: '#C7C7CC', marginLeft: 8 }}>
              — 控制九张图外貌一致性
            </span>
          </div>
          <button
            onClick={handleExtractAppearance}
            disabled={anchorLoading}
            style={{
              background: anchorLoading ? '#F5F5F7' : `${ACCENT}0F`,
              border: `1px solid ${anchorLoading ? 'rgba(0,0,0,0.08)' : `${ACCENT}33`}`,
              borderRadius: 7, padding: '5px 12px', cursor: anchorLoading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontFamily: FM,
              color: anchorLoading ? '#AEAEB2' : ACCENT,
              transition: 'all 0.15s',
            }}
          >
            {anchorLoading
              ? <><Loader style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> AI 分析中…</>
              : <><Sparkles style={{ width: 11, height: 11 }} /> AI 自动分析外貌</>
            }
          </button>
        </div>

        <div style={{ fontSize: 11, fontFamily: FM, color: '#C7C7CC', marginBottom: 8 }}>
          描述发色、肤色、服装颜色等具体细节 → 点"AI 自动分析"从角色语料中提取，或手动填写
        </div>

        <textarea
          value={anchor}
          onChange={e => setAnchor(e.target.value)}
          placeholder="例：Long dark brown curly hair, fair porcelain skin, wearing a white ball gown with green floral pattern and dark green trim, large green eyes…"
          rows={4}
          style={{
            width: '100%', resize: 'vertical', boxSizing: 'border-box',
            border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8, outline: 'none',
            padding: '8px 12px', fontSize: 12.5, fontFamily: F, lineHeight: 1.65,
            color: '#1D1D1F', background: anchor ? '#FFFFF8' : '#FAFAFA',
            transition: 'background 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = `${ACCENT}70`)}
          onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
        />

        {!anchor && (
          <div style={{ fontSize: 10, fontFamily: FM, color: '#FF9500', marginTop: 6 }}>
            ⚠ 未填写形象锚定 → 九张图可能外貌不一致。建议先点「AI 自动分析外貌」
          </div>
        )}

        <div style={{ fontSize: 10, fontFamily: FM, color: '#C7C7CC', marginTop: 6 }}>
          生成策略：第1张（待机·呼吸）用文本生成，后8张以第1张为参考仅改动作 → 确保一致性
        </div>
      </Card>

      {/* Progress bar */}
      {donePoses > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: FM, color: '#6E6E73' }}>生成进度</span>
            <span style={{ fontSize: 11, fontFamily: FM, color: allDone ? '#34C759' : ACCENT }}>
              {donePoses} / {ALL_POSES.length}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width 0.4s ease',
              background: allDone ? '#34C759' : ACCENT,
              width: `${(donePoses / ALL_POSES.length) * 100}%`,
            }} />
          </div>
        </div>
      )}

      {/* 3×3 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {ALL_POSES.map(pose => (
          <PoseCard key={pose} pose={pose} state={poses[pose]} onRegenerate={handleRegenerate} />
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!running ? (
          <button
            onClick={handleGenerateAll}
            disabled={!canGenerate}
            style={{
              height: 40, padding: '0 22px',
              background: !canGenerate ? '#E5E5EA' : ACCENT,
              border: 'none', borderRadius: 10,
              color: !canGenerate ? '#AEAEB2' : '#FFFFFF',
              fontFamily: F, fontSize: 14, fontWeight: 500,
              cursor: !canGenerate ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (canGenerate) e.currentTarget.style.background = '#0077ED'; }}
            onMouseLeave={e => { if (canGenerate) e.currentTarget.style.background = ACCENT; }}
          >
            <Zap style={{ width: 15, height: 15 }} />
            {donePoses === 0 ? '生成全部9个动作' : '全部重新生成'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              height: 40, padding: '0 22px',
              background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)',
              borderRadius: 10, color: '#FF3B30',
              fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            ⏹ 停止生成
          </button>
        )}

        {allDone && !running && (
          <button
            onClick={handleSave}
            style={{
              height: 40, padding: '0 22px',
              background: saved ? '#34C759' : '#1D1D1F',
              border: 'none', borderRadius: 10,
              color: '#FFFFFF', fontFamily: F, fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saved
              ? <><CheckCircle style={{ width: 15, height: 15 }} /> 已保存！</>
              : <><Download style={{ width: 15, height: 15 }} /> 保存像素形象</>
            }
          </button>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 10, fontFamily: FM, color: '#C7C7CC', letterSpacing: '0.06em' }}>
        预计费用: 1张文生图 $0.03 + 8张图编辑 $0.24 = $0.27 · 约 20-25 分钟
      </div>
    </div>
  );
}
