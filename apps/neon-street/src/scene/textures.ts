import { SHOP_HEIGHT } from '../lib/city';
import { createValueNoise } from '../lib/noise';
import { between, chance, createRng, pick, type Rng } from '../lib/rng';
import { airConditioners, facade, neonEdge } from './buildings';
import { alpha, createSurface, mix, softGlow, withState } from './canvas';
import type { LayerFrame } from './frame';
import { ATMOSPHERE, NEON, NEON_CYCLE, SAKURA, SIGNS_JP } from './palette';
import { createPetalSprites, type PetalSprites } from './petalSprites';
import { paintSakura } from './sakura';
import { storefront } from './shops';
import { billboard, horizontalSign, verticalSign } from './signs';
import { paintTowers } from './skyline';

export const TEXTURE_LENGTH = 32;
export const FACADE_PPM = 8;
export const FACADE_HEIGHT = 250;
export const SHOP_PPM = 20;
export const GROUND_PPM = 14;
export const GROUND_LENGTH = 60;
export const GROUND_WIDTH = 18;
export const BACKDROP = { z: 880, halfWidth: 700, height: 300 };
export const TREE_SIZE = { width: 9, height: 9 };
export const BRIDGE_PPM = 12;

export type Mipmap = HTMLCanvasElement[];

export type Sprite = {
  canvas: HTMLCanvasElement;
  mirror: HTMLCanvasElement;
  pad: number;
  bodyWidth: number;
  bodyHeight: number;
};

export type Assets = {
  facades: Mipmap[];
  facadeMirrors: HTMLCanvasElement[];
  shops: Mipmap[];
  shopMirrors: HTMLCanvasElement[];
  ground: Mipmap;
  signs: Sprite[];
  trees: HTMLCanvasElement[];
  bridge: HTMLCanvasElement;
  backdrop: HTMLCanvasElement;
  petals: PetalSprites;
};

export const MIP_LEVELS = 5;

export function mipmap(source: HTMLCanvasElement, levels = MIP_LEVELS): Mipmap {
  const chain = [source];
  for (let level = 1; level < levels; level++) {
    const previous = chain[level - 1];
    const next = createSurface(Math.max(1, previous.width / 2), Math.max(1, previous.height / 2));
    next.ctx.imageSmoothingQuality = 'high';
    next.ctx.drawImage(previous, 0, 0, next.width, next.height);
    chain.push(next.canvas);
  }
  return chain;
}

export function mirrored(source: HTMLCanvasElement, shrink: number): HTMLCanvasElement {
  const surface = createSurface(Math.max(1, source.width / shrink), Math.max(1, source.height / shrink));
  surface.ctx.translate(0, surface.height);
  surface.ctx.scale(1, -1);
  surface.ctx.drawImage(source, 0, 0, surface.width, surface.height);
  return surface.canvas;
}

function paintFacade(rng: Rng): HTMLCanvasElement {
  const surface = createSurface(TEXTURE_LENGTH * FACADE_PPM, FACADE_HEIGHT * FACADE_PPM);
  const { ctx, width, height } = surface;
  let x = 0;
  while (x < width) {
    const w = Math.min(width - x, between(rng, width * 0.3, width * 0.7));
    facade(ctx, rng, x, 0, w, height, {
      body: pick(rng, ['#0b0914', '#0d0a17', '#0a0c16', '#100a12', '#0c0b10']),
      haze: ATMOSPHERE.fog,
      hazeAmount: 0.04,
      cell: between(rng, 10, 15),
      litRatio: between(rng, 0.14, 0.38),
      rim: 0,
    });
    x += w;
  }
  withState(ctx, () => {
    ctx.fillStyle = 'rgba(3, 2, 6, 0.6)';
    const floor = 3.4 * FACADE_PPM;
    for (let y = height - floor; y > 0; y -= floor) ctx.fillRect(0, y, width, 2);
  });
  airConditioners(ctx, rng, 0, height * 0.4, width, height, 8);
  for (let i = 0; i < 3; i++) {
    if (chance(rng, 0.6)) {
      neonEdge(ctx, between(rng, 4, width - 6), height - between(rng, 120, 200) * FACADE_PPM, height - between(rng, 5, 60) * FACADE_PPM, pick(rng, NEON_CYCLE), 2.4);
    }
  }
  for (let i = 0; i < 4; i++) {
    const y = height - between(rng, 14, 110) * FACADE_PPM;
    if (chance(rng, 0.45)) {
      const w = between(rng, 9, 20) * FACADE_PPM;
      billboard(ctx, rng, between(rng, 0, width - w), y, w, w * between(rng, 0.45, 0.65));
    } else if (chance(rng, 0.5)) {
      horizontalSign(ctx, rng, between(rng, 0.25, 0.75) * width, y, width * 0.45, pick(rng, NEON_CYCLE), pick(rng, ['HOTEL', 'KIRIN', '電脳', 'NEO', 'BAR', '酒場']));
    }
  }
  return surface.canvas;
}

function paintShops(rng: Rng): HTMLCanvasElement {
  const surface = createSurface(TEXTURE_LENGTH * SHOP_PPM, SHOP_HEIGHT * SHOP_PPM);
  const { ctx, width, height } = surface;
  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#14101b');
    g.addColorStop(1, '#0c0a10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  });
  const shopHeight = 4.1 * SHOP_PPM;
  let x = 0;
  while (x < width - 40) {
    const w = Math.min(width - x, between(rng, 5, 10) * SHOP_PPM);
    storefront(ctx, rng, x + 8, w - 16, height, shopHeight);
    withState(ctx, () => {
      ctx.fillStyle = '#07050a';
      ctx.fillRect(x, 0, 8, height);
    });
    x += w;
  }
  return surface.canvas;
}

function paintGround(rng: Rng): HTMLCanvasElement {
  const surface = createSurface(GROUND_WIDTH * GROUND_PPM, GROUND_LENGTH * GROUND_PPM);
  const { ctx, width, height } = surface;
  const m = GROUND_PPM;
  const noise = createValueNoise(91);
  const sidewalk = 2.4 * m;

  ctx.fillStyle = '#0d0b12';
  ctx.fillRect(0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise(x / 9, y / 9) * 0.6 + noise(x / 2.2, y / 2.2) * 0.4;
      const puddle = noise(x / 60 + 20, y / 90);
      const i = (y * width + x) * 4;
      const wet = puddle > 0.62 ? 0.55 : 1;
      image.data[i] = (14 + n * 16) * wet;
      image.data[i + 1] = (11 + n * 12) * wet;
      image.data[i + 2] = (20 + n * 18) * wet;
    }
  }
  ctx.putImageData(image, 0, 0);

  withState(ctx, () => {
    for (const x0 of [0, width - sidewalk]) {
      ctx.fillStyle = 'rgba(60, 50, 70, 0.55)';
      ctx.fillRect(x0, 0, sidewalk, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let y = 0; y < height; y += m * 0.6) ctx.fillRect(x0, y, sidewalk, 1);
      for (let x = x0; x < x0 + sidewalk; x += m * 0.6) ctx.fillRect(x, 0, 1, height);
    }
    ctx.fillStyle = 'rgba(190, 170, 200, 0.4)';
    ctx.fillRect(sidewalk - 3, 0, 3, height);
    ctx.fillRect(width - sidewalk, 0, 3, height);

    ctx.fillStyle = 'rgba(255, 196, 90, 0.55)';
    ctx.fillRect(width / 2 - 3, 0, 2, height);
    ctx.fillRect(width / 2 + 1, 0, 2, height);
    ctx.fillStyle = 'rgba(235, 230, 240, 0.4)';
    for (let y = 0; y < height; y += 9 * m) {
      ctx.fillRect(sidewalk + 3.3 * m - 1, y, 2, 4 * m);
      ctx.fillRect(width - sidewalk - 3.3 * m - 1, y, 2, 4 * m);
    }
    ctx.fillStyle = 'rgba(235, 230, 240, 0.5)';
    const crossing = 18 * m;
    for (let x = sidewalk + 0.3 * m; x < width - sidewalk - 0.3 * m; x += 1.1 * m) ctx.fillRect(x, crossing, 0.6 * m, 4 * m);
    ctx.fillRect(sidewalk, crossing - 1.2 * m, width - sidewalk * 2, 0.35 * m);

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(30, 26, 36, 0.9)';
      ctx.beginPath();
      ctx.ellipse(between(rng, sidewalk + m, width - sidewalk - m), between(rng, 0, height), 0.35 * m, 0.35 * m, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 1600; i++) {
      const gutter = chance(rng, 0.7);
      const x = gutter ? (chance(rng, 0.5) ? between(rng, 0, sidewalk + 0.6 * m) : between(rng, width - sidewalk - 0.6 * m, width)) : between(rng, 0, width);
      ctx.fillStyle = alpha(pick(rng, SAKURA), between(rng, 0.35, 0.85));
      ctx.beginPath();
      ctx.ellipse(x, between(rng, 0, height), between(rng, 0.5, 1.4), between(rng, 0.8, 2), rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = alpha(pick(rng, [NEON.pink, NEON.cyan, '#ffffff', NEON.amber]), between(rng, 0.04, 0.16));
      ctx.fillRect(between(rng, 0, width), between(rng, 0, height), between(rng, 0.6, 1.4), between(rng, 3, 14));
    }
  });
  return surface.canvas;
}

function paintSign(rng: Rng): Sprite {
  const bodyWidth = 40;
  const pad = 90;
  const text = pick(rng, SIGNS_JP);
  const bodyHeight = [...text].length * 40 * 0.62 * 1.12 + 20;
  const surface = createSurface(bodyWidth + pad * 2, bodyHeight + pad * 2);
  verticalSign(surface.ctx, rng, pad, pad, bodyWidth, text, pick(rng, NEON_CYCLE));
  return { canvas: surface.canvas, mirror: mirrored(surface.canvas, 2), pad, bodyWidth, bodyHeight };
}

function paintTree(rng: Rng): HTMLCanvasElement {
  const surface = createSurface(640, 640);
  paintSakura(surface.ctx, rng, {
    x: 320,
    y: 636,
    angle: -Math.PI / 2 + between(rng, -0.1, 0.1),
    length: 120,
    thickness: 13,
    levels: 6,
    scale: 1.25,
  });
  return surface.canvas;
}

function paintBridge(rng: Rng): HTMLCanvasElement {
  const surface = createSurface(18 * BRIDGE_PPM, 5 * BRIDGE_PPM);
  const { ctx, width, height } = surface;
  withState(ctx, () => {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#1a1622');
    g.addColorStop(1, '#0a080e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    const band = ctx.createLinearGradient(0, height * 0.3, 0, height * 0.7);
    band.addColorStop(0, '#ffd6a0');
    band.addColorStop(1, '#b0607a');
    ctx.fillStyle = band;
    ctx.fillRect(0, height * 0.3, width, height * 0.38);
    ctx.fillStyle = '#0a070c';
    for (let x = 0; x < width; x += 14) ctx.fillRect(x, height * 0.3, 2, height * 0.38);
    for (let i = 0; i < 6; i++) {
      const px = between(rng, 10, width - 10);
      ctx.fillRect(px - 2, height * 0.42, 4, height * 0.26);
      ctx.beginPath();
      ctx.arc(px, height * 0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = NEON.pink;
    ctx.shadowBlur = 8;
    ctx.fillStyle = mix(NEON.pink, NEON.white, 0.4);
    ctx.fillRect(0, height - 3, width, 2);
  });
  return surface.canvas;
}

function paintBackdrop(): HTMLCanvasElement {
  const width = 1600;
  const height = 700;
  const surface = createSurface(width, height);
  const frame: LayerFrame = {
    ctx: surface.ctx,
    width,
    height,
    viewportWidth: width,
    viewportHeight: height,
    margin: 0,
    groundY: height,
    rng: createRng(37),
    noise: createValueNoise(37),
  };
  paintTowers(frame);
  softGlow(surface.ctx, width / 2, height, width * 0.35, ATMOSPHERE.pollution, 0.4);
  return surface.canvas;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

export async function buildAssets(seed: number, counts: { facades: number; shops: number; signs: number; trees: number }): Promise<Assets> {
  const rng = createRng(seed);
  const facades: Mipmap[] = [];
  for (let i = 0; i < counts.facades; i++) {
    facades.push(mipmap(paintFacade(rng)));
    if (i % 2 === 1) await nextFrame();
  }
  const shops: Mipmap[] = [];
  for (let i = 0; i < counts.shops; i++) shops.push(mipmap(paintShops(rng)));
  await nextFrame();
  const ground = mipmap(paintGround(rng));
  const signs = Array.from({ length: counts.signs }, () => paintSign(rng));
  await nextFrame();
  const trees = Array.from({ length: counts.trees }, () => paintTree(rng));
  return {
    facades,
    facadeMirrors: facades.map((chain) => mirrored(chain[2], 1)),
    shops,
    shopMirrors: shops.map((chain) => mirrored(chain[1], 1)),
    ground,
    signs,
    trees,
    bridge: paintBridge(rng),
    backdrop: paintBackdrop(),
    petals: createPetalSprites(),
  };
}

