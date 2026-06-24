import { useEffect, useRef } from 'react';

const CHARS = 'THIRDKINDCONTACTSOULARCHIVECOMPANIONSTUDIOLOCALFIRST0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function GoldRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId = 0;
    const fontSize = 15;
    const drops: number[] = [];

    const reset = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      drops.length = 0;
      for (let i = 0; i < Math.floor(width / fontSize); i += 1) {
        drops.push(Math.random() * -50);
      }
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 8, 22, 0.052)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

      for (let i = 0; i < drops.length; i += 1) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(242,199,92,0.42)' : 'rgba(89,243,255,0.32)';
        ctx.fillText(char, x, y);
        drops[i] += 0.25 + (i % 5) * 0.05;
        if (y > height && Math.random() > 0.975) drops[i] = Math.random() * -20;
      }

      animationId = requestAnimationFrame(draw);
    };

    reset();
    draw();
    window.addEventListener('resize', reset);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', reset);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.2,
        pointerEvents: 'none',
      }}
    />
  );
}
