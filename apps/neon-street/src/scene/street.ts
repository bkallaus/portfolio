import { between, chance, pick, type Rng } from '../lib/rng';
import { alpha, createSurface, type Ctx, ellipticGlow, mix, softGlow, withState } from './canvas';
import { airConditioners, facade } from './buildings';
import { type LayerFrame, vh, vw } from './frame';
import { NEON, NEON_CYCLE, SIGNS_EN, SIGNS_JP } from './palette';
import { paintSakura } from './sakura';
import { cable, horizontalSign, lanternString, verticalSign } from './signs';

function storefront(ctx: Ctx, rng: Rng, x: number, width: number, ground: number, height: number): void {
  const color = pick(rng, NEON_CYCLE);
  const shutter = chance(rng, 0.2);
  const interior = pick(rng, ['#ffcf8f', '#ffe7c4', '#ffb3d4', '#bff3ff']);
  const top = ground - height;
  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, top, 0, ground);
    g.addColorStop(0, mix(interior, '#3a1a28', 0.25));
    g.addColorStop(1, mix(interior, '#2a1018', 0.6));
    ctx.fillStyle = shutter ? '#26222c' : g;
    ctx.fillRect(x, top, width, height);
    if (shutter) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let y = top; y < ground; y += 3) ctx.fillRect(x, y, width, 1);
      ctx.fillStyle = alpha(color, 0.12);
      ctx.fillRect(x, top, width, height);
    } else {
      ctx.fillStyle = 'rgba(20, 10, 16, 0.75)';
      for (let i = 0; i < 4; i++) {
        const px = x + between(rng, 0.1, 0.9) * width;
        const ph = height * between(rng, 0.45, 0.62);
        ctx.beginPath();
        ctx.ellipse(px, ground - ph, ph * 0.09, ph * 0.11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(px - ph * 0.14, ground - ph * 0.88, ph * 0.28, ph * 0.88);
      }
      ctx.fillStyle = '#120c12';
      for (let m = x; m < x + width; m += width / Math.ceil(width / 38)) ctx.fillRect(m, top, 2, height);
      ctx.fillRect(x, top + height * 0.3, width, 2);
    }
    ellipticGlow(ctx, x + width / 2, ground, width * 0.8, height * 0.9, interior, shutter ? 0.04 : 0.14);

    ctx.fillStyle = mix(color, '#160812', 0.55);
    ctx.beginPath();
    ctx.moveTo(x - 6, top);
    ctx.lineTo(x + width + 6, top);
    ctx.lineTo(x + width + 12, top + height * 0.16);
    ctx.lineTo(x - 12, top + height * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = mix(color, NEON.white, 0.4);
    ctx.fillRect(x - 12, top + height * 0.16 - 2, width + 24, 2);
  });
  horizontalSign(ctx, rng, x + width / 2, top - height * 0.3, width * 0.55, color, pick(rng, chance(rng, 0.35) ? SIGNS_JP : SIGNS_EN));
}

function reflect(frame: LayerFrame, curb: number): void {
  const { ctx, width, height } = frame;
  const source = vh(frame, 0.55);
  const depth = height - curb;
  const snapshot = createSurface(width, source);
  snapshot.ctx.drawImage(ctx.canvas, 0, (curb - source) * (ctx.canvas.height / height), ctx.canvas.width, source * (ctx.canvas.height / height), 0, 0, width, source);
  withState(ctx, () => {
    ctx.translate(0, curb);
    ctx.scale(1, -depth / source);
    ctx.translate(0, -source);
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(3px)';
    ctx.drawImage(snapshot.canvas, 0, 0, width, source);
  });
}

function wetStreet(frame: LayerFrame, curb: number): void {
  const { ctx, width, height, rng } = frame;
  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, curb, 0, height);
    g.addColorStop(0, '#0a0810');
    g.addColorStop(1, '#141019');
    ctx.fillStyle = g;
    ctx.fillRect(0, curb, width, height - curb);
  });
  reflect(frame, curb);
  withState(ctx, () => {
    for (let i = 0; i < 1400; i++) {
      const y = between(rng, curb, height);
      const t = (y - curb) / (height - curb);
      ctx.fillStyle = `rgba(4, 3, 8, ${between(rng, 0.2, 0.5)})`;
      ctx.fillRect(between(rng, 0, width), y, between(rng, 10, 70) * (0.4 + t), between(rng, 0.6, 1.8) * (0.5 + t));
    }
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255, 220, 240, ${between(rng, 0.05, 0.22)})`;
      ctx.fillRect(between(rng, 0, width), between(rng, curb, height), between(rng, 2, 12), 0.8);
    }
    const lane = curb + (height - curb) * 0.55;
    for (let x = between(rng, -40, 0); x < width; x += 150) {
      ctx.fillStyle = 'rgba(230, 220, 200, 0.16)';
      ctx.fillRect(x, lane, 80, 3);
    }
  });
}

export function paintStreet(frame: LayerFrame): void {
  const { ctx, width, height, rng, groundY } = frame;
  const shopHeight = vh(frame, 0.13);
  const curb = groundY + vh(frame, 0.04);
  const tops: Array<{ x: number; top: number; w: number }> = [];

  let x = -vw(frame, 0.05);
  while (x < width) {
    const w = between(rng, vw(frame, 0.2), vw(frame, 0.34));
    const h = vh(frame, between(rng, 0.7, 1.2));
    const top = groundY - h;
    facade(ctx, rng, x, top, w, groundY - shopHeight, { body: '#0a0810', haze: '#2b1a45', hazeAmount: 0.05, cell: between(rng, 13, 19), litRatio: 0.2, rim: 1 });
    airConditioners(ctx, rng, x, top + h * 0.1, w, groundY - shopHeight * 1.6, 11);
    withState(ctx, () => {
      ctx.fillStyle = '#07050a';
      for (let f = top + 48; f < groundY - shopHeight - 20; f += 96) {
        if (!chance(rng, 0.5)) continue;
        ctx.fillRect(x + w * 0.1, f, w * 0.8, 3);
        for (let r = x + w * 0.1; r < x + w * 0.9; r += 6) ctx.fillRect(r, f - 14, 1, 14);
        ctx.fillRect(x + w * 0.1, f - 14, w * 0.8, 1.5);
      }
    });
    storefront(ctx, rng, x + w * 0.05, w * 0.9, groundY, shopHeight);
    if (chance(rng, 0.8)) {
      const sw = between(rng, 34, 46);
      verticalSign(ctx, rng, x + w - sw * 0.5, top + h * between(rng, 0.15, 0.4), sw, pick(rng, SIGNS_JP), pick(rng, NEON_CYCLE));
    }
    tops.push({ x, top, w });

    const gap = between(rng, vw(frame, 0.02), vw(frame, 0.06));
    withState(ctx, () => {
      ctx.fillStyle = '#050309';
      ctx.fillRect(x + w, groundY - vh(frame, 0.5), gap, vh(frame, 0.5));
    });
    ellipticGlow(ctx, x + w + gap / 2, groundY - vh(frame, 0.06), gap * 0.8, vh(frame, 0.1), pick(rng, [NEON.cyan, NEON.amber, NEON.pink]), 0.3);
    x += w + gap;
  }

  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i];
    const b = tops[i + 1];
    const y1 = groundY - shopHeight * between(rng, 1.6, 2.6);
    lanternString(ctx, rng, a.x + a.w * 0.6, y1, b.x + b.w * 0.4, y1 + between(rng, -20, 20), between(rng, 10, 24));
  }

  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, groundY, 0, curb);
    g.addColorStop(0, '#1d1822');
    g.addColorStop(1, '#141019');
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY, width, curb - groundY);
    ctx.fillStyle = 'rgba(255, 140, 200, 0.25)';
    ctx.fillRect(0, curb - 2, width, 1.5);
    ctx.fillStyle = '#07050a';
    ctx.fillRect(0, curb, width, 4);
  });

  const treeScale = frame.viewportHeight / 900;
  for (const fraction of [0.16, 0.63]) {
    const tx = width * (fraction + between(rng, -0.04, 0.04));
    paintSakura(ctx, rng, { x: tx, y: curb - 6, angle: -Math.PI / 2 + between(rng, -0.08, 0.08), length: vh(frame, 0.15), thickness: 14 * treeScale, levels: 6, scale: 1.4 * treeScale });
  }

  for (let i = 0; i < 5; i++) {
    const y1 = groundY - vh(frame, between(rng, 0.25, 0.8));
    cable(ctx, -10, y1, width + 10, y1 + between(rng, -60, 60), between(rng, 20, 70), between(rng, 1, 2.2));
  }

  wetStreet(frame, curb);

  for (let i = 0; i < 4; i++) {
    softGlow(ctx, between(rng, 0, width), curb + (height - curb) * between(rng, 0.2, 0.8), vw(frame, 0.08), pick(rng, NEON_CYCLE), 0.08);
  }
}
