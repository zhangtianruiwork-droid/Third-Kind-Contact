import { useState, useEffect } from 'react';

// Flood-fill from image edges to remove white/near-white background pixels.
// Interior white (collar, shirt) is preserved because it's not edge-connected.
export function useTransparentSprite(src: string): string {
  const [dataUrl, setDataUrl] = useState(src);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];

      const seed = (x: number, y: number) => {
        const idx = y * w + x;
        if (!visited[idx]) { visited[idx] = 1; queue.push(idx); }
      };

      for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
      for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

      while (queue.length > 0) {
        const pixIdx = queue.pop()!;
        const di = pixIdx * 4;
        const r = data[di], g = data[di + 1], b = data[di + 2];
        if (r < 230 || g < 230 || b < 230) continue; // not near-white, stop spreading
        data[di + 3] = 0; // make transparent
        const x = pixIdx % w, y = Math.floor(pixIdx / w);
        if (x > 0) seed(x - 1, y);
        if (x < w - 1) seed(x + 1, y);
        if (y > 0) seed(x, y - 1);
        if (y < h - 1) seed(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = src;
  }, [src]);

  return dataUrl;
}
