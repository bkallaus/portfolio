import { between, pick, type Rng } from '../lib/rng';
import { alpha, type Ctx, ellipticGlow, mix, softGlow, withState } from './canvas';
import { NEON, SIGN_FONT_EN, SIGN_FONT_JP } from './palette';

function neonText(ctx: Ctx, text: string, x: number, y: number, color: string, size: number, lineWidth: number): void {
  withState(ctx, () => {
    ctx.lineJoin = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.9;
    ctx.strokeStyle = alpha(color, 0.55);
    ctx.lineWidth = lineWidth * 2.6;
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = size * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = mix(color, NEON.white, 0.75);
    ctx.lineWidth = Math.max(0.6, lineWidth * 0.4);
    ctx.strokeText(text, x, y);
  });
}

function litText(ctx: Ctx, text: string, x: number, y: number, color: string, size: number): void {
  withState(ctx, () => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.6;
    ctx.fillStyle = mix(color, NEON.white, 0.55);
    ctx.fillText(text, x, y);
    ctx.shadowBlur = size * 0.15;
    ctx.fillText(text, x, y);
  });
}

export function verticalSign(
  ctx: Ctx,
  rng: Rng,
  x: number,
  top: number,
  width: number,
  text: string,
  color: string,
): number {
  const glyphs = [...text];
  const size = width * 0.62;
  const height = glyphs.length * size * 1.12 + width * 0.5;
  const style = rng();
  ellipticGlow(ctx, x + width / 2, top + height / 2, width * 2.4, height * 0.85, color, 0.22);
  withState(ctx, () => {
    ctx.fillStyle = style < 0.5 ? '#0a0710' : mix(color, '#150a18', 0.82);
    ctx.fillRect(x, top, width, height);
    ctx.strokeStyle = alpha(color, 0.9);
    ctx.lineWidth = Math.max(1, width * 0.05);
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 0.4;
    ctx.strokeRect(x + width * 0.08, top + width * 0.08, width * 0.84, height - width * 0.16);
  });
  ctx.font = `700 ${size}px ${SIGN_FONT_JP}`;
  glyphs.forEach((glyph, index) => {
    const cy = top + width * 0.25 + size * 0.56 + index * size * 1.12;
    if (style < 0.5) neonText(ctx, glyph, x + width / 2, cy, color, size, Math.max(1, size * 0.07));
    else litText(ctx, glyph, x + width / 2, cy, color, size);
  });
  withState(ctx, () => {
    ctx.strokeStyle = '#050308';
    ctx.lineWidth = Math.max(1, width * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, top);
    ctx.lineTo(x + width * 0.3, top - width * 0.3);
    ctx.moveTo(x + width * 0.3, top + height);
    ctx.lineTo(x + width * 0.3, top + height + width * 0.3);
    ctx.stroke();
  });
  return height;
}

export function horizontalSign(
  ctx: Ctx,
  rng: Rng,
  cx: number,
  cy: number,
  maxWidth: number,
  color: string,
  text = pick(rng, ['RAMEN', 'BAR', 'HOTEL', 'OPEN 24H', 'NOODLES', 'SAKE']),
): void {
  const jp = /[^\x20-\x7e]/.test(text);
  const size = Math.min(maxWidth / (text.length * (jp ? 1.05 : 0.68)), maxWidth * 0.22, 46);
  ctx.font = `${jp ? 700 : 600} ${size}px ${jp ? SIGN_FONT_JP : SIGN_FONT_EN}`;
  softGlow(ctx, cx, cy, maxWidth * 0.75, color, 0.16);
  if (rng() < 0.6) neonText(ctx, text, cx, cy, color, size, Math.max(1, size * 0.08));
  else {
    const boxWidth = ctx.measureText(text).width + size;
    withState(ctx, () => {
      const gradient = ctx.createLinearGradient(0, cy - size * 0.7, 0, cy + size * 0.7);
      gradient.addColorStop(0, mix(color, '#1a0a16', 0.55));
      gradient.addColorStop(1, mix(color, '#07030a', 0.75));
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.5;
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - boxWidth / 2, cy - size * 0.7, boxWidth, size * 1.4);
      ctx.strokeStyle = alpha(color, 0.8);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - boxWidth / 2 + 3, cy - size * 0.7 + 3, boxWidth - 6, size * 1.4 - 6);
    });
    litText(ctx, text, cx, cy + size * 0.04, color, size);
  }
}

export function billboard(ctx: Ctx, rng: Rng, x: number, y: number, width: number, height: number): void {
  const a = pick(rng, [NEON.pink, NEON.cyan, NEON.magenta, NEON.violet]);
  const b = pick(rng, [NEON.amber, NEON.aqua, NEON.pink, NEON.cyan]);
  ellipticGlow(ctx, x + width / 2, y + height / 2, width * 1.1, height * 1.3, a, 0.28);
  withState(ctx, () => {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, mix(a, '#000000', 0.25));
    gradient.addColorStop(0.55, mix(a, b, 0.5));
    gradient.addColorStop(1, mix(b, '#000000', 0.3));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    const fx = x + width * between(rng, 0.25, 0.4);
    const fy = y + height * 0.55;
    const fr = height * 0.42;
    const face = ctx.createRadialGradient(fx - fr * 0.2, fy - fr * 0.3, fr * 0.1, fx, fy, fr);
    face.addColorStop(0, 'rgba(255, 240, 248, 0.85)');
    face.addColorStop(0.6, alpha(mix(a, NEON.white, 0.4), 0.55));
    face.addColorStop(1, alpha(a, 0));
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(fx, fy, fr * 0.7, fr, 0, 0, Math.PI * 2);
    ctx.fill();

    const label = pick(rng, ['夜桜', '電脳', 'SAKURA', 'KIRIN', 'NEO', 'ZAIBATSU']);
    const jp = /[^\x20-\x7e]/.test(label);
    const size = Math.min(height * 0.36, (width * 0.5) / (label.length * (jp ? 1 : 0.62)));
    ctx.font = `700 ${size}px ${jp ? SIGN_FONT_JP : SIGN_FONT_EN}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 250, 252, 0.92)';
    ctx.shadowColor = b;
    ctx.shadowBlur = size * 0.5;
    ctx.fillText(label, x + width * 0.7, y + height * 0.45);

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(20, 0, 30, 0.35)';
    for (let line = y; line < y + height; line += 3) ctx.fillRect(x, line, width, 1);
  });
}

export function lanternString(ctx: Ctx, rng: Rng, x1: number, y1: number, x2: number, y2: number, sag: number): void {
  const count = Math.max(3, Math.floor(Math.abs(x2 - x1) / between(rng, 26, 40)));
  withState(ctx, () => {
    ctx.strokeStyle = '#0b0609';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag * 2, x2, y2);
    ctx.stroke();
  });
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (Math.max(y1, y2) + sag * 2) + t * t * y2;
    const r = between(rng, 5, 7.5);
    const color = rng() < 0.8 ? '#ff4a3a' : NEON.amber;
    softGlow(ctx, x, y + r, r * 4.5, color, 0.35);
    withState(ctx, () => {
      const g = ctx.createRadialGradient(x - r * 0.3, y + r * 0.7, r * 0.2, x, y + r, r * 1.2);
      g.addColorStop(0, '#fff0c8');
      g.addColorStop(0.45, color);
      g.addColorStop(1, mix(color, '#300000', 0.6));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y + r, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0a08';
      ctx.fillRect(x - r * 0.5, y - 1, r, 2);
      ctx.fillRect(x - r * 0.5, y + r * 2.05, r, 2);
    });
  }
}

export function cable(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, sag: number, width: number): void {
  withState(ctx, () => {
    ctx.strokeStyle = '#040306';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 80, 170, 0.18)';
    ctx.lineWidth = Math.max(0.5, width * 0.35);
    ctx.beginPath();
    ctx.moveTo(x1, y1 - width * 0.3);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag - width * 0.3, x2, y2 - width * 0.3);
    ctx.stroke();
  });
}
