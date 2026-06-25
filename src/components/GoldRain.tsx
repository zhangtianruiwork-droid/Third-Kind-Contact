import { useEffect, useRef } from 'react';

const CHARS =
  '英灵殿魂档案协议召唤蒸馏回路意识矩阵星图战术策略知行合一' +
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function GoldRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const fontSize = 15;
    const columns = Math.floor(w / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -50);
    const speeds: number[] = Array(columns).fill(0).map(() => Math.random() * 0.4 + 0.15);
    const bright: number[] = Array(columns).fill(0).map(() => Math.random());

    function draw() {
      ctx.fillStyle = 'rgba(5, 8, 22, 0.052)';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Lead glyphs are subtle so UI panels stay readable.
        ctx.fillStyle = bright[i] > 0.6
          ? `rgba(242, 199, 92, ${0.34 + bright[i] * 0.22})`
          : `rgba(89, 243, 255, ${0.26 + bright[i] * 0.18})`;
        ctx.font = `${fontSize}px "Noto Serif SC", "SimSun", serif`;
        ctx.fillText(char, x, y);

        // trailing fade
        if (drops[i] > 1) {
          ctx.fillStyle = `rgba(143, 123, 255, ${0.05 + bright[i] * 0.06})`;
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y - fontSize);
        }

        drops[i] += speeds[i];

        if (y > h && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
          speeds[i] = Math.random() * 0.4 + 0.15;
          bright[i] = Math.random();
        }
      }
    }

    let animId: number;
    const animate = () => { draw(); animId = requestAnimationFrame(animate); };
    animate();

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0, opacity: 0.2,
        pointerEvents: 'none',
      }}
    />
  );
}
