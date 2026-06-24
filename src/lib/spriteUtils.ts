/**
 * Remove white/near-white background using edge flood-fill.
 * Same algorithm as useTransparentSprite hook, but as a plain async function
 * so it can be called outside React components (e.g. at save time).
 */
export function makeTransparentAsync(src: string): Promise<string> {
  return new Promise((resolve) => {
    const fullSrc = src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      const w = canvas.width, h = canvas.height;
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];

      const seed = (x: number, y: number) => {
        const idx = y * w + x;
        if (!visited[idx]) { visited[idx] = 1; queue.push(idx); }
      };

      for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
      for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

      while (queue.length > 0) {
        const pi = queue.pop()!;
        const di = pi * 4;
        if (data[di] < 230 || data[di + 1] < 230 || data[di + 2] < 230) continue;
        data[di + 3] = 0;
        const x = pi % w, y = Math.floor(pi / w);
        if (x > 0)     seed(x - 1, y);
        if (x < w - 1) seed(x + 1, y);
        if (y > 0)     seed(x, y - 1);
        if (y < h - 1) seed(x, y + 1);
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(fullSrc); // fallback to original on failure
    img.src = fullSrc;
  });
}

/**
 * Auto-build an appearance anchor string from character data.
 * This gets prepended to every sprite prompt to enforce visual consistency.
 */
export function buildAppearanceAnchor(char: {
  name: string;
  title: string;
  era: string;
  tags: string[];
  description: string;
}): string {
  const parts = [
    `${char.name} (${char.title}, ${char.era})`,
  ];
  if (char.description) {
    parts.push(char.description.slice(0, 180));
  }
  if (char.tags?.length) {
    parts.push(`Visual traits: ${char.tags.slice(0, 6).join(', ')}`);
  }
  return parts.join('. ');
}
