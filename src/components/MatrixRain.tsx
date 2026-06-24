import { useEffect, useRef } from "react";

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz漢字孔明兵法隆中対淡泊明志宁静致远死而后已知天易逆天难人和用兵";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const fontSize = 14;
    const columns = Math.floor(w / fontSize);
    const drops: number[] = Array(columns).fill(1);
    const speeds: number[] = Array(columns).fill(0).map(() => Math.random() * 0.5 + 0.3);
    const brightness: number[] = Array(columns).fill(0).map(() => Math.random());

    function draw() {
      ctx.fillStyle = "rgba(5, 5, 5, 0.06)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Lead character brighter
        ctx.fillStyle = `rgba(0, 255, 65, ${0.8 + brightness[i] * 0.2})`;
        ctx.font = `${fontSize}px "Courier New", monospace`;
        ctx.fillText(char, x, y);

        // Trailing fade
        if (drops[i] > 0) {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.15 + brightness[i] * 0.1})`;
          ctx.fillText(char, x, y - fontSize);
        }

        drops[i] += speeds[i];

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
          speeds[i] = Math.random() * 0.5 + 0.3;
          brightness[i] = Math.random();
        }
      }
    }

    let animId: number;
    function animate() {
      draw();
      animId = requestAnimationFrame(animate);
    }
    animate();

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 0.35,
        pointerEvents: "none",
      }}
    />
  );
}
