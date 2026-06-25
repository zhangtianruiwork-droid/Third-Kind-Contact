import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Flame, CheckCircle, RotateCcw, Upload, X, FileText, Sparkles } from 'lucide-react';
import { distillSoul } from '../lib/soul';
import { extractTextFromFile } from '../lib/fileExtract';
import { CharacterStore } from '../lib/store';
import type { Character, SoulProfile, WizardStep } from '../lib/types';

const F      = `-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif`;
const FM     = `'SF Mono','Roboto Mono',ui-monospace,monospace`;
const ACCENT = '#0071E3';

interface SummonPageProps {
  onComplete: (characterId: string) => void;
  onBack: () => void;
}

interface FormData {
  name: string; era: string; avatar: string; description: string;
}
type CorpusMode = 'auto' | 'manual';

// ─── shared sub-components ───────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '20px 20px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontFamily: FM, color: '#AEAEB2',
      letterSpacing: '0.14em', textTransform: 'uppercase' as const,
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontFamily: FM, color: '#6E6E73', marginBottom: 5, letterSpacing: '0.04em' }}>
        {children}
      </div>
    </div>
  );
}

function Input({
  value, onChange, placeholder, multiline, rows, style,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  multiline?: boolean; rows?: number; style?: React.CSSProperties;
}) {
  const common: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: '#FAFAFA', border: '1.5px solid rgba(0,0,0,0.1)',
    borderRadius: 8, padding: '9px 12px',
    fontSize: 13.5, fontFamily: F, color: '#1D1D1F',
    outline: 'none', transition: 'border-color 0.15s',
    ...style,
  };
  if (multiline) return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 4}
      style={{ ...common, resize: 'none' as const, lineHeight: 1.6 }}
      onFocus={e => (e.target.style.borderColor = `${ACCENT}70`)}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
    />
  );
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={common}
      onFocus={e => (e.target.style.borderColor = `${ACCENT}70`)}
      onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
    />
  );
}

function Btn({
  onClick, primary, danger, disabled, children, style,
}: {
  onClick: () => void; primary?: boolean; danger?: boolean;
  disabled?: boolean; children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    height: 38, padding: '0 20px', border: 'none', borderRadius: 8,
    fontSize: 14, fontFamily: F, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 7,
    transition: 'background 0.15s', opacity: disabled ? 0.4 : 1, ...style,
  };
  if (primary) return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base, background: ACCENT, color: '#FFFFFF',
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = '#0077ED')}
      onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
    >{children}</button>
  );
  if (danger) return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base, background: 'rgba(255,59,48,0.08)',
      border: '1px solid rgba(255,59,48,0.2)', color: '#FF3B30',
    }}>{children}</button>
  );
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base, background: '#F5F5F7',
      border: '1px solid rgba(0,0,0,0.1)', color: '#1D1D1F',
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = '#EBEBEB')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F5F5F7')}
    >{children}</button>
  );
}

function StepDots({ step }: { step: WizardStep }) {
  const labels = ['信息', '语料', '蒸馏', '召唤'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {labels.map((label, i) => {
        const s = (i + 1) as WizardStep;
        const active = s === step;
        const done = s < step;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontFamily: FM, fontWeight: 600,
                background: active ? ACCENT : done ? `${ACCENT}20` : '#F0F0F0',
                color: active ? '#FFFFFF' : done ? ACCENT : '#AEAEB2',
                border: `1.5px solid ${active ? ACCENT : done ? `${ACCENT}50` : 'rgba(0,0,0,0.1)'}`,
                transition: 'all 0.25s',
              }}>
                {done ? '✓' : s}
              </div>
              <span style={{ fontSize: 10, fontFamily: FM, color: active ? ACCENT : '#AEAEB2', letterSpacing: '0.05em' }}>
                {label}
              </span>
            </div>
            {s < 4 && (
              <div style={{
                width: 48, height: 1.5,
                background: done ? `${ACCENT}50` : 'rgba(0,0,0,0.08)',
                margin: '0 4px', marginBottom: 18,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────

export function SummonPage({ onComplete, onBack }: SummonPageProps) {
  const [step, setStep]               = useState<WizardStep>(1);
  const [form, setForm]               = useState<FormData>({ name: '', era: '', avatar: '⚔️', description: '' });
  const [corpusMode, setCorpusMode]   = useState<CorpusMode>('auto');
  const [corpusText, setCorpusText]   = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [extracting, setExtracting]   = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const [distillProgress, setDistillProgress] = useState(0);
  const [distillLog, setDistillLog]   = useState('');
  const [soulProfile, setSoulProfile] = useState<SoulProfile | null>(null);
  const [error, setError]             = useState('');
  const logRef     = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = (key: keyof FormData, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('文件过大，请控制在 5MB 以内'); return; }
    setError(''); setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setCorpusText(text);
      setUploadedFile({
        name: file.name,
        size: file.size < 1024 ? `${file.size}B`
          : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)}KB`
          : `${(file.size / 1024 / 1024).toFixed(1)}MB`,
      });
      setCorpusMode('manual');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '文件解析失败');
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearFile = () => {
    setUploadedFile(null); setCorpusText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startDistillation = async () => {
    if (!form.name.trim()) { setError('请输入英灵名号'); return; }
    if (!form.era.trim())  { setError('请输入所处时代'); return; }
    if (!form.description.trim()) { setError('请输入简要介绍'); return; }
    if (corpusMode === 'manual' && corpusText.trim().length < 50) {
      setError('语料太短，建议至少 50 字以上，或切换到「AI 自动获取」模式'); return;
    }
    setError(''); setStep(3); setDistillProgress(0); setDistillLog(''); setSoulProfile(null);

    const phases = [12, 28, 44, 60, 75, 90];
    let pi = 0;
    const timer = setInterval(() => {
      if (pi < phases.length) { setDistillProgress(phases[pi]); pi++; } else clearInterval(timer);
    }, 3000);

    try {
      const corpus = corpusMode === 'manual' && corpusText.trim() ? corpusText.trim() : null;
      const profile = await distillSoul(form.name, form.era, form.description, corpus, raw => {
        setDistillLog(raw.slice(-600));
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      });
      clearInterval(timer); setDistillProgress(100); setSoulProfile(profile); setStep(4);
    } catch (e: unknown) {
      clearInterval(timer);
      setError(e instanceof Error ? e.message : '蒸馏失败，请检查 API 设置后重试');
      setStep(2);
    }
  };

  const confirmSummon = () => {
    if (!soulProfile) return;
    const character: Character = {
      id: `char_${Date.now()}`,
      name: form.name, title: form.era, era: form.era,
      avatar: form.avatar || '⚔️',
      tags: soulProfile.coreTraits.slice(0, 3).map(t => t.name),
      description: form.description,
      systemPrompt: soulProfile.systemPrompt,
      soulProfile, isPrebuilt: false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    CharacterStore.save(character);
    onComplete(character.id);
  };

  return (
    <div style={{
      minHeight: '100%', background: '#F5F5F7',
      padding: '28px 32px 40px', fontFamily: F,
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: FM, color: '#AEAEB2', letterSpacing: '0.2em', marginBottom: 8 }}>
            SUMMONING RITUAL · 召唤仪式
          </div>
          <h2 style={{
            fontFamily: F, fontSize: 26, fontWeight: 700,
            color: '#1D1D1F', margin: '0 0 6px', letterSpacing: '-0.02em',
          }}>
            {step <= 2 ? '召唤英灵' : step === 3 ? '蒸馏中…' : '确认召唤'}
          </h2>
          <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
            {step <= 2
              ? '描述英灵，注入语料，召唤历史的灵魂入殿'
              : step === 3
              ? `正在从语料中提炼 ${form.name} 的核心灵魂…`
              : '灵魂档案已生成，确认后永久驻留英灵殿'}
          </p>
        </div>

        <StepDots step={step} />

        {/* ── Step 1 + 2: Info + Corpus ── */}
        {(step === 1 || step === 2) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 01 Basic Info */}
            <Card>
              <SectionTitle>01 · 英灵信息</SectionTitle>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 14 }}>
                <div>
                  <FieldLabel>英灵名号 *</FieldLabel>
                  <Input value={form.name} onChange={v => updateForm('name', v)} placeholder="????? / ??" />
                </div>
                <div>
                  <FieldLabel>头像</FieldLabel>
                  <Input value={form.avatar} onChange={v => updateForm('avatar', v)} placeholder="⚔️"
                    style={{ textAlign: 'center', fontSize: 20 }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel>所处时代 *</FieldLabel>
                <Input value={form.era} onChange={v => updateForm('era', v)}
                  placeholder="如：三国时期 · 181-234年" />
              </div>

              <div>
                <FieldLabel>简要介绍 * (100字以上)</FieldLabel>
                <Input value={form.description} onChange={v => updateForm('description', v)}
                  placeholder="身份背景、主要事迹、性格特点…" multiline rows={4} />
                <div style={{ fontSize: 11, fontFamily: FM, color: '#C7C7CC', textAlign: 'right', marginTop: 4 }}>
                  {form.description.length} 字
                </div>
              </div>
            </Card>

            {/* 02 Corpus */}
            <Card>
              <SectionTitle>02 · 灵魂语料</SectionTitle>

              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([
                  { mode: 'auto' as CorpusMode, label: 'AI 自动获取', Icon: Sparkles },
                  { mode: 'manual' as CorpusMode, label: '手动提供语料', Icon: FileText },
                ]).map(({ mode, label, Icon }) => (
                  <button key={mode} onClick={() => setCorpusMode(mode)} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontFamily: FM,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: corpusMode === mode ? `${ACCENT}10` : 'transparent',
                    border: `1.5px solid ${corpusMode === mode ? ACCENT : 'rgba(0,0,0,0.1)'}`,
                    color: corpusMode === mode ? ACCENT : '#6E6E73',
                  }}>
                    <Icon style={{ width: 13, height: 13 }} />
                    {label}
                  </button>
                ))}
              </div>

              {corpusMode === 'auto' ? (
                <div style={{
                  display: 'flex', gap: 12, padding: '14px 16px',
                  background: `${ACCENT}07`, border: `1px solid ${ACCENT}20`,
                  borderRadius: 8,
                }}>
                  <Sparkles style={{ width: 18, height: 18, color: ACCENT, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, color: '#1D1D1F', margin: '0 0 5px', lineHeight: 1.6 }}>
                      AI 将基于内置历史/文学知识，自动为
                      <strong style={{ color: ACCENT }}> {form.name || '该角色'} </strong>
                      构建语料档案。
                    </p>
                    <p style={{ fontSize: 11, color: '#6E6E73', margin: 0 }}>
                      推荐用于知名历史人物或经典虚构角色。
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `1.5px dashed ${dragOver ? ACCENT : 'rgba(0,0,0,0.12)'}`,
                      borderRadius: 8, padding: '18px 16px', cursor: 'pointer',
                      background: dragOver ? `${ACCENT}05` : '#FAFAFA',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                      accept=".txt,.md,.docx,.pdf,.csv"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                    {extracting ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: 22, height: 22, border: `2px solid ${ACCENT}40`,
                          borderTopColor: ACCENT, borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite', margin: '0 auto 8px',
                        }} />
                        <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>正在解析文件…</p>
                      </div>
                    ) : uploadedFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText style={{ width: 18, height: 18, color: ACCENT }} />
                          <div>
                            <p style={{ fontSize: 13, color: '#1D1D1F', margin: 0 }}>{uploadedFile.name}</p>
                            <p style={{ fontSize: 11, fontFamily: FM, color: '#AEAEB2', margin: 0 }}>
                              {uploadedFile.size} · {corpusText.length} 字
                            </p>
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); clearFile(); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AEAEB2', padding: 4 }}>
                          <X style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <Upload style={{ width: 24, height: 24, color: '#AEAEB2', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 13, color: '#6E6E73', margin: '0 0 4px' }}>点击或拖拽上传文件</p>
                        <p style={{ fontSize: 11, color: '#AEAEB2', margin: 0 }}>支持 TXT · MD · DOCX · PDF（≤ 5MB）</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p style={{ fontSize: 12, color: '#AEAEB2', fontFamily: FM, margin: '0 0 6px' }}>也可直接粘贴文本</p>
                    <Input value={corpusText} onChange={setCorpusText}
                      placeholder="粘贴著作原文、名言语录、历史记载…（建议 500 字以上）"
                      multiline rows={6}
                      style={{ fontFamily: FM, fontSize: 12, lineHeight: 1.65 }} />
                    <div style={{ fontSize: 11, fontFamily: FM, color: '#C7C7CC', textAlign: 'right', marginTop: 4 }}>
                      {corpusText.length} 字
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {error && (
              <div style={{
                fontSize: 13, color: '#FF3B30',
                border: '1px solid rgba(255,59,48,0.2)', borderRadius: 8,
                padding: '10px 14px', background: 'rgba(255,59,48,0.04)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={onBack}>
                <ArrowLeft style={{ width: 15, height: 15 }} /> 返回
              </Btn>
              <button onClick={startDistillation} style={{
                flex: 1, height: 38, background: ACCENT, color: '#FFFFFF',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontFamily: F, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 7, transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0077ED')}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
              >
                <Flame style={{ width: 15, height: 15 }} />
                {corpusMode === 'auto' ? '开始蒸馏（AI 自动获取语料）' : '开始蒸馏'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Distilling ── */}
        {step === 3 && (
          <Card style={{ textAlign: 'center', padding: '36px 24px' }}>
            {/* Progress ring */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
              background: `conic-gradient(${ACCENT} ${distillProgress * 3.6}deg, #F0F0F0 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: 62, height: 62, borderRadius: '50%',
                background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontFamily: FM, color: ACCENT, fontWeight: 600,
              }}>
                {distillProgress}%
              </div>
            </div>

            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 600, color: '#1D1D1F', margin: '0 0 6px' }}>
              灵魂蒸馏中…
            </h3>
            <p style={{ fontSize: 13, color: '#6E6E73', margin: '0 0 20px' }}>
              正在从语料中提炼 <strong style={{ color: ACCENT }}>{form.name}</strong> 的核心灵魂
            </p>

            {/* Progress bar */}
            <div style={{
              height: 3, background: '#F0F0F0', borderRadius: 2, margin: '0 auto 20px', maxWidth: 320,
            }}>
              <div style={{
                height: '100%', background: ACCENT, borderRadius: 2,
                width: `${distillProgress}%`, transition: 'width 1s ease',
              }} />
            </div>

            {/* Log */}
            <div ref={logRef} style={{
              background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 8, padding: '12px 14px',
              maxHeight: 120, overflowY: 'auto',
              textAlign: 'left', fontSize: 11, fontFamily: FM,
              color: '#6E6E73', lineHeight: 1.65,
              wordBreak: 'break-all',
            }}>
              {distillLog
                ? distillLog
                : <span style={{ animation: 'blink 1s ease-in-out infinite', display: 'inline-block' }}>
                    正在连接蒸馏炉…
                  </span>}
            </div>
          </Card>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && soulProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <CheckCircle style={{ width: 36, height: 36, color: '#34C759', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
                <strong style={{ color: ACCENT }}>{form.name}</strong> 的灵魂档案已生成，确认后召唤入殿
              </p>
            </div>

            {/* Core traits */}
            <Card>
              <SectionTitle>核心性格特征</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {soulProfile.coreTraits.slice(0, 5).map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: 12 }}>
                    <span style={{
                      fontSize: 11, fontFamily: FM, color: ACCENT,
                      width: 52, flexShrink: 0, paddingTop: 1,
                    }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: '#3C3C43', lineHeight: 1.6 }}>{t.description}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Language style */}
            <Card>
              <SectionTitle>语言风格</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {soulProfile.languageStyle.vocabulary.slice(0, 8).map(v => (
                  <span key={v} style={{
                    fontSize: 11, fontFamily: FM, color: ACCENT,
                    background: `${ACCENT}0F`,
                    border: `1px solid ${ACCENT}25`,
                    padding: '2px 8px', borderRadius: 4,
                  }}>{v}</span>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#6E6E73', margin: 0, fontFamily: FM }}>
                自称：{soulProfile.languageStyle.selfRef} · 称呼对方：{soulProfile.languageStyle.otherRef}
              </p>
            </Card>

            {/* Mental models */}
            <Card>
              <SectionTitle>心智模型 · 方法论</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {soulProfile.mentalModels.slice(0, 4).map(m => (
                  <div key={m.name} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: ACCENT, fontSize: 12, flexShrink: 0, marginTop: 1 }}>◆</span>
                    <span style={{ fontSize: 12, color: '#3C3C43', lineHeight: 1.6 }}>
                      <strong style={{ color: '#1D1D1F' }}>{m.name}</strong> — {m.description}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Signature interactions */}
            <Card>
              <SectionTitle>标志性互动方式</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {soulProfile.dialogueProtocols.signature.slice(0, 4).map((s, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#3C3C43', margin: 0, lineHeight: 1.6 }}>· {s}</p>
                ))}
              </div>
            </Card>

            {error && (
              <div style={{
                fontSize: 13, color: '#FF3B30',
                border: '1px solid rgba(255,59,48,0.2)', borderRadius: 8,
                padding: '10px 14px', background: 'rgba(255,59,48,0.04)',
              }}>⚠ {error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => { setStep(2); setSoulProfile(null); setError(''); }}>
                <RotateCcw style={{ width: 14, height: 14 }} /> 重新蒸馏
              </Btn>
              <button onClick={confirmSummon} style={{
                flex: 1, height: 38, background: ACCENT, color: '#FFFFFF',
                border: 'none', borderRadius: 8,
                fontSize: 14, fontFamily: F, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 7, transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0077ED')}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
              >
                <Flame style={{ width: 15, height: 15 }} /> 确认召唤入殿
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
