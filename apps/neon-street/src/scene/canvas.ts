export type Ctx = CanvasRenderingContext2D;

export type Surface = {
  canvas: HTMLCanvasElement;
  ctx: Ctx;
  width: number;
  height: number;
};

export function createSurface(width: number, height: number, scale = 1): Surface {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(scale, scale);
  return { canvas, ctx, width, height };
}

export function withState(ctx: Ctx, draw: () => void): void {
  ctx.save();
  draw();
  ctx.restore();
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const channel = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `#${((1 << 24) | (channel(0) << 16) | (channel(1) << 8) | channel(2)).toString(16).slice(1)}`;
}

export function alpha(hex: string, opacity: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function softGlow(ctx: Ctx, x: number, y: number, radius: number, color: string, strength: number): void {
  withState(ctx, () => {
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, alpha(color, strength));
    gradient.addColorStop(0.35, alpha(color, strength * 0.35));
    gradient.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });
}

export function ellipticGlow(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  strength: number,
): void {
  withState(ctx, () => {
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    softGlow(ctx, 0, 0, rx, color, strength);
  });
}

export function hazeBand(ctx: Ctx, width: number, top: number, bottom: number, color: string, peak: number): void {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, alpha(color, 0));
  gradient.addColorStop(0.7, alpha(color, peak * 0.8));
  gradient.addColorStop(1, alpha(color, peak));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, width, bottom - top);
}

export function blurInto(target: Ctx, source: HTMLCanvasElement, blur: number, width: number, height: number): void {
  withState(target, () => {
    target.filter = `blur(${blur}px)`;
    target.drawImage(source, 0, 0, width, height);
  });
}

export function bloom(ctx: Ctx, width: number, height: number, radius: number, strength: number): void {
  const source = createSurface(width * 0.5, height * 0.5);
  source.ctx.drawImage(ctx.canvas, 0, 0, width * 0.5, height * 0.5);
  withState(ctx, () => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(source.canvas, 0, 0, width, height);
  });
}
