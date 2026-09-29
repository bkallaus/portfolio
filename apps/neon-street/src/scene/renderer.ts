import { type Camera, NEAR, project, groundDepth, wallDepth } from '../lib/camera';
import { type Building, buildingAt, type City, FACADE_X, type Row, SHOP_HEIGHT, SIDEWALK } from '../lib/city';
import { createValueNoise } from '../lib/noise';
import type { Viewport } from '../lib/parallax';
import { type Petal, petalScaleX } from '../lib/petals';
import { createRng } from '../lib/rng';
import { type Ctx, createSurface, type Surface, withState } from './canvas';
import type { LayerFrame } from './frame';
import { ATMOSPHERE } from './palette';
import { SPRITE_SIZE } from './petalSprites';
import { paintSky } from './sky';
import {
  type Assets,
  BACKDROP,
  BRIDGE_PPM,
  FACADE_HEIGHT,
  FACADE_PPM,
  GROUND_LENGTH,
  GROUND_PPM,
  MIP_LEVELS,
  SHOP_PPM,
  TEXTURE_LENGTH,
  TREE_SIZE,
} from './textures';

const COLUMN = 2;
const QUALITY = [
  { scale: 1, column: 2 },
  { scale: 0.8, column: 3 },
  { scale: 0.62, column: 4 },
];
const ROW = 2;
const FAR = 800;
const FOG_DISTANCE = 240;
const MIRROR_SHRINK = 4;
const TREE_X = FACADE_X - SIDEWALK * 0.55;

type Drop = { x: number; y: number; length: number; speed: number; alpha: number };

type Draw = { depth: number; draw: () => void };

const fogAt = (depth: number): number => Math.min(0.92, 1 - Math.exp(-depth / FOG_DISTANCE));

const mipLevel = (texelsPerPixel: number): number =>
  Math.max(0, Math.min(MIP_LEVELS - 1, Math.floor(Math.log2(Math.max(1, texelsPerPixel)))));

const wrap = (value: number, length: number): number => ((value % length) + length) % length;

export class StreetRenderer {
  private ctx: Ctx;
  private viewport: Viewport = { width: 1, height: 1 };
  private scale = 1;
  private quality = 0;
  private devicePixelRatio = 1;
  private column = COLUMN;
  private sky: HTMLCanvasElement | null = null;
  private mirror: Surface = createSurface(1, 1);
  private glow: Surface = createSurface(1, 1);
  private drops: Drop[] = [];
  private rng = createRng(17);

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: Assets,
    private city: City,
    private rain: number,
  ) {
    this.ctx = canvas.getContext('2d') as Ctx;
  }

  resize(viewport: Viewport, devicePixelRatio: number): void {
    this.viewport = viewport;
    this.devicePixelRatio = devicePixelRatio || 1;
    this.scale = Math.min(this.devicePixelRatio, 1.25) * QUALITY[this.quality].scale;
    this.column = QUALITY[this.quality].column;
    this.canvas.width = Math.round(viewport.width * this.scale);
    this.canvas.height = Math.round(viewport.height * this.scale);
    this.mirror = createSurface(viewport.width / MIRROR_SHRINK, viewport.height / MIRROR_SHRINK);
    this.glow = createSurface(Math.max(1, this.canvas.width / 6), Math.max(1, this.canvas.height / 6));
    this.sky = this.paintSky(viewport);
    const area = (viewport.width * viewport.height) / (1440 * 900);
    this.drops = Array.from({ length: Math.round(this.rain * Math.max(0.5, area)) }, () => this.spawnDrop(true));
  }

  degrade(): boolean {
    if (this.quality >= QUALITY.length - 1) return false;
    this.quality++;
    this.resize(this.viewport, this.devicePixelRatio);
    return true;
  }

  private paintSky(viewport: Viewport): HTMLCanvasElement {
    const surface = createSurface(viewport.width, viewport.height);
    const frame: LayerFrame = {
      ctx: surface.ctx,
      width: viewport.width,
      height: viewport.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      margin: 0,
      groundY: viewport.height,
      rng: createRng(11),
      noise: createValueNoise(11),
    };
    paintSky(frame);
    return surface.canvas;
  }

  render(camera: Camera, petals: Petal[], dt: number): void {
    const { ctx } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;

    if (this.sky) ctx.drawImage(this.sky, camera.x * -6, (camera.cy - this.viewport.height * 0.46) * 0.3 - 20, this.viewport.width, this.viewport.height + 40);
    this.drawBackdrop(camera);

    for (const row of this.city.back) this.drawRow(row, camera);
    for (const row of this.city.front) this.drawRow(row, camera);

    this.drawGround(camera);
    this.drawReflections(camera);

    withState(ctx, () => {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(camera.cx, camera.cy, 0, camera.cx, camera.cy, this.viewport.width * 0.35);
      g.addColorStop(0, 'rgba(255, 90, 160, 0.3)');
      g.addColorStop(0.4, 'rgba(160, 60, 200, 0.1)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    });

    this.drawObjects(camera, petals);
    this.bloom();
    this.drawRain(dt);
  }

  private drawBackdrop(camera: Camera): void {
    const left = project(camera, -BACKDROP.halfWidth, BACKDROP.height, BACKDROP.z + camera.z * 0.2);
    const right = project(camera, BACKDROP.halfWidth, 0, BACKDROP.z + camera.z * 0.2);
    if (!left || !right) return;
    this.ctx.drawImage(this.assets.backdrop, left.x, left.y, right.x - left.x, right.y - left.y);
  }

  private drawRow(row: Row, camera: Camera): void {
    const visible = row.buildings.filter((b) => b.z1 > camera.z + NEAR && b.z0 < camera.z + FAR);
    for (let i = visible.length - 1; i >= 0; i--) this.drawMass(row, visible[i], camera);
    this.drawColumns(row, camera);
  }

  private drawMass(row: Row, building: Building, camera: Camera): void {
    const { ctx } = this;
    const inner = row.side * row.x;
    const outer = row.side * row.outer;
    const fog = fogAt(Math.max(NEAR, building.z0 - camera.z));

    const nearTop = project(camera, inner, building.height, building.z0);
    const nearBase = project(camera, outer, 0, building.z0);
    if (nearTop && nearBase) {
      const x0 = Math.min(nearTop.x, nearBase.x);
      const width = Math.abs(nearBase.x - nearTop.x);
      const texture = this.assets.facades[building.texture];
      const level = mipLevel(FACADE_PPM / (nearTop.scale * this.scale));
      const source = texture[level];
      const factor = FACADE_PPM / 2 ** level;
      const srcHeight = Math.min(building.height, FACADE_HEIGHT) * factor;
      ctx.drawImage(source, 0, source.height - srcHeight, Math.min(source.width, (row.outer - row.x) * factor), srcHeight, x0, nearTop.y, width, nearBase.y - nearTop.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x0, nearTop.y, width, nearBase.y - nearTop.y);
      this.fog(x0, nearTop.y, width, nearBase.y - nearTop.y, fog);
    }

    if (camera.y > building.height) {
      const z0 = Math.max(building.z0, camera.z + NEAR + 0.05);
      const corners = [
        project(camera, inner, building.height, z0),
        project(camera, inner, building.height, building.z1),
        project(camera, outer, building.height, building.z1),
        project(camera, outer, building.height, z0),
      ];
      if (corners.every(Boolean)) {
        ctx.beginPath();
        corners.forEach((corner, index) => {
          if (!corner) return;
          if (index === 0) ctx.moveTo(corner.x, corner.y);
          else ctx.lineTo(corner.x, corner.y);
        });
        ctx.closePath();
        ctx.fillStyle = '#0b0910';
        ctx.fill();
        ctx.globalAlpha = fog;
        ctx.fillStyle = ATMOSPHERE.fog;
        ctx.fill();
        ctx.globalAlpha = 1;
        const [a, b] = corners;
        if (a && b) {
          ctx.strokeStyle = row.side < 0 ? 'rgba(59, 232, 255, 0.35)' : 'rgba(255, 79, 158, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  private fog(x: number, y: number, width: number, height: number, amount: number): void {
    const { ctx } = this;
    ctx.globalAlpha = amount;
    ctx.fillStyle = ATMOSPHERE.fog;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;
  }

  private drawColumns(row: Row, camera: Camera): void {
    const { ctx } = this;
    const wallX = row.side * row.x;
    const start = row.side < 0 ? 0 : Math.floor(camera.cx);
    const end = row.side < 0 ? Math.ceil(camera.cx) : this.viewport.width;
    const distance = Math.abs(wallX - camera.x);

    const column = this.column;
    for (let sx = start; sx < end; sx += column) {
      const depth = wallDepth(camera, sx + column / 2, wallX);
      if (depth === null || depth < NEAR || depth > FAR) continue;
      const z = camera.z + depth;
      const building = buildingAt(row, z);
      if (!building) continue;

      const s = camera.focal / depth;
      const base = camera.cy + camera.y * s;
      const top = camera.cy - (building.height - camera.y) * s;
      if (top > this.viewport.height || base < 0) continue;

      const along = (depth * depth * column) / (camera.focal * distance);
      const u = wrap((row.side < 0 ? z - building.z0 : building.z1 - z) + building.u, TEXTURE_LENGTH);
      const shopTop = row.storefronts ? camera.cy - (SHOP_HEIGHT - camera.y) * s : base;
      const upperHeight = Math.min(FACADE_HEIGHT, building.height - (row.storefronts ? SHOP_HEIGHT : 0));

      if (upperHeight > 0 && shopTop > 0) {
        const level = mipLevel(FACADE_PPM / (s * this.scale));
        const source = this.assets.facades[building.texture][level];
        const factor = FACADE_PPM / 2 ** level;
        const srcX = u * factor;
        const srcWidth = Math.max(0.5, Math.min(along * factor, source.width - srcX));
        const srcHeight = upperHeight * factor;
        ctx.drawImage(source, srcX, source.height - srcHeight, srcWidth, srcHeight, sx, top, column + 0.5, shopTop - top);
      }
      if (row.storefronts && shopTop < this.viewport.height) {
        const level = mipLevel(SHOP_PPM / (s * this.scale));
        const source = this.assets.shops[building.shop][level];
        const factor = SHOP_PPM / 2 ** level;
        const srcX = u * factor;
        const srcWidth = Math.max(0.5, Math.min(along * factor, source.width - srcX));
        ctx.drawImage(source, srcX, 0, srcWidth, source.height, sx, shopTop, column + 0.5, base - shopTop);
      }
      this.fog(sx, top, column + 0.5, base - top, fogAt(depth));
    }
  }

  private drawGround(camera: Camera): void {
    const { ctx } = this;
    const from = Math.max(0, Math.floor(camera.cy) + 1);
    const rowHeight = this.column === COLUMN ? ROW : this.column;
    for (let y = from; y < this.viewport.height; y += rowHeight) {
      const depth = groundDepth(camera, y + rowHeight / 2);
      if (depth === null || depth > FAR) continue;
      const s = camera.focal / depth;
      const left = camera.cx + (-FACADE_X - camera.x) * s;
      const right = camera.cx + (FACADE_X - camera.x) * s;
      const rowLength = (depth * depth * rowHeight) / (camera.focal * camera.y);
      const level = mipLevel(GROUND_PPM / (s * this.scale));
      const source = this.assets.ground[level];
      const factor = GROUND_PPM / 2 ** level;
      const v = wrap(camera.z + depth, GROUND_LENGTH) * factor;
      const srcHeight = Math.max(0.5, Math.min(rowLength * factor, source.height - v));
      ctx.drawImage(source, 0, source.height - v - srcHeight, source.width, srcHeight, left, y, right - left, rowHeight + 0.5);
      this.fog(left, y, right - left, rowHeight + 0.5, fogAt(depth));
    }
  }

  private drawReflections(camera: Camera): void {
    const mirror = this.mirror.ctx;
    mirror.setTransform(1 / MIRROR_SHRINK, 0, 0, 1 / MIRROR_SHRINK, 0, 0);
    mirror.clearRect(0, 0, this.viewport.width, this.viewport.height);
    const step = this.column * 2;

    for (const row of this.city.front) {
      const wallX = row.side * row.x;
      const start = row.side < 0 ? 0 : Math.floor(camera.cx);
      const end = row.side < 0 ? Math.ceil(camera.cx) : this.viewport.width;
      const distance = Math.abs(wallX - camera.x);
      for (let sx = start; sx < end; sx += step) {
        const depth = wallDepth(camera, sx + step / 2, wallX);
        if (depth === null || depth < NEAR || depth > FAR * 0.6) continue;
        const z = camera.z + depth;
        const building = buildingAt(row, z);
        if (!building) continue;
        const s = camera.focal / depth;
        const base = camera.cy + camera.y * s;
        if (base > this.viewport.height) continue;
        const along = (depth * depth * step) / (camera.focal * distance);
        const u = wrap((row.side < 0 ? z - building.z0 : building.z1 - z) + building.u, TEXTURE_LENGTH);
        mirror.globalAlpha = 1 - fogAt(depth);

        const shop = this.assets.shopMirrors[building.shop];
        const shopFactor = shop.width / TEXTURE_LENGTH;
        mirror.drawImage(shop, u * shopFactor, 0, Math.max(0.5, Math.min(along * shopFactor, shop.width - u * shopFactor)), shop.height, sx, base, step, SHOP_HEIGHT * s);

        const upper = this.assets.facadeMirrors[building.texture];
        const upperFactor = upper.width / TEXTURE_LENGTH;
        const reach = Math.min(28, building.height - SHOP_HEIGHT);
        if (reach > 0) {
          mirror.drawImage(upper, u * upperFactor, 0, Math.max(0.5, Math.min(along * upperFactor, upper.width - u * upperFactor)), reach * upperFactor, sx, base + SHOP_HEIGHT * s, step, reach * s);
        }
      }
    }

    for (const sign of this.city.signs) {
      const depth = sign.z - camera.z;
      if (depth < NEAR || depth > FAR * 0.5) continue;
      const sprite = this.assets.signs[sign.sprite];
      const box = this.signBox(camera, sign.side, sign.z, sign.y, sign.depth, sprite, true);
      if (!box) continue;
      mirror.globalAlpha = 1 - fogAt(depth);
      mirror.drawImage(sprite.mirror, box.x, box.y, box.width, box.height);
    }
    mirror.globalAlpha = 1;

    withState(this.ctx, () => {
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.globalAlpha = 0.5;
      this.ctx.drawImage(this.mirror.canvas, 0, 0, this.viewport.width, this.viewport.height);
    });
  }

  private signBox(
    camera: Camera,
    side: number,
    z: number,
    y: number,
    reach: number,
    sprite: Assets['signs'][number],
    mirrored: boolean,
  ): { x: number; y: number; width: number; height: number } | null {
    const metresPerPixel = reach / sprite.bodyWidth;
    const bodyHeight = sprite.bodyHeight * metresPerPixel;
    const pad = sprite.pad * metresPerPixel;
    const inner = side * (FACADE_X - reach) - side * pad;
    const outer = side * FACADE_X + side * pad;
    const top = mirrored ? -(y - pad) : y + bodyHeight + pad;
    const bottom = mirrored ? -(y + bodyHeight + pad) : y - pad;
    const a = project(camera, Math.min(inner, outer), top, z);
    const b = project(camera, Math.max(inner, outer), bottom, z);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
  }

  private drawObjects(camera: Camera, petals: Petal[]): void {
    const { ctx } = this;
    const draws: Draw[] = [];
    const fade = (depth: number) => 1 - fogAt(depth) * 0.85;

    for (const bridge of this.city.bridges) {
      const depth = bridge.z0 - camera.z;
      if (depth < NEAR || depth > FAR) continue;
      draws.push({ depth, draw: () => this.drawBridge(camera, bridge, fogAt(depth)) });
    }

    for (const sign of this.city.signs) {
      const depth = sign.z - camera.z;
      if (depth < 2.5 || depth > FAR) continue;
      draws.push({
        depth,
        draw: () => {
          const sprite = this.assets.signs[sign.sprite];
          const box = this.signBox(camera, sign.side, sign.z, sign.y, sign.depth, sprite, false);
          if (!box) return;
          ctx.globalAlpha = fade(depth);
          ctx.drawImage(sprite.canvas, box.x, box.y, box.width, box.height);
          ctx.globalAlpha = 1;
        },
      });
    }

    for (const tree of this.city.trees) {
      const depth = tree.z - camera.z;
      if (depth < 1.2 || depth > FAR * 0.6) continue;
      draws.push({
        depth,
        draw: () => {
          const a = project(camera, tree.side * TREE_X - TREE_SIZE.width / 2, TREE_SIZE.height, tree.z);
          const b = project(camera, tree.side * TREE_X + TREE_SIZE.width / 2, 0, tree.z);
          if (!a || !b) return;
          ctx.globalAlpha = fade(depth);
          ctx.drawImage(this.assets.trees[tree.variant], a.x, a.y, b.x - a.x, b.y - a.y);
          ctx.globalAlpha = 1;
        },
      });
    }

    for (const cable of this.city.cables) {
      const depth = cable.z - camera.z;
      if (depth < 2 || depth > FAR * 0.5) continue;
      draws.push({ depth, draw: () => this.drawCable(camera, cable, fade(depth)) });
    }

    for (const petal of petals) {
      const depth = petal.z - camera.z;
      if (depth < NEAR || depth > 60) continue;
      draws.push({ depth, draw: () => this.drawPetal(camera, petal) });
    }

    draws.sort((a, b) => b.depth - a.depth);
    for (const item of draws) item.draw();
  }

  private drawBridge(camera: Camera, bridge: City['bridges'][number], fog: number): void {
    const { ctx } = this;
    const face = [project(camera, -FACADE_X, bridge.top, bridge.z0), project(camera, FACADE_X, bridge.bottom, bridge.z0)];
    const plane = (y: number) => [
      project(camera, -FACADE_X, y, bridge.z0),
      project(camera, FACADE_X, y, bridge.z0),
      project(camera, FACADE_X, y, bridge.z1),
      project(camera, -FACADE_X, y, bridge.z1),
    ];
    const slab = camera.y < bridge.bottom ? plane(bridge.bottom) : camera.y > bridge.top ? plane(bridge.top) : [];
    if (slab.length && slab.every(Boolean)) {
      ctx.beginPath();
      slab.forEach((p, i) => {
        if (!p) return;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = camera.y < bridge.bottom ? '#140f1a' : '#0c0a11';
      ctx.fill();
      this.fillFog(fog);
    }
    const [a, b] = face;
    if (!a || !b) return;
    ctx.drawImage(this.assets.bridge, 0, 0, 18 * BRIDGE_PPM, this.assets.bridge.height, a.x, a.y, b.x - a.x, b.y - a.y);
    this.fog(a.x, a.y, b.x - a.x, b.y - a.y, fog);
  }

  private fillFog(amount: number): void {
    const { ctx } = this;
    ctx.globalAlpha = amount;
    ctx.fillStyle = ATMOSPHERE.fog;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawCable(camera: Camera, cable: City['cables'][number], opacity: number): void {
    const { ctx } = this;
    const a = project(camera, -FACADE_X, cable.left, cable.z);
    const b = project(camera, FACADE_X, cable.right, cable.z);
    const mid = project(camera, 0, (cable.left + cable.right) / 2 - cable.sag * 2, cable.z);
    if (!a || !b || !mid) return;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = '#050307';
    ctx.lineWidth = Math.max(0.6, a.scale * 0.035);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
    ctx.stroke();
    if (cable.lanterns) {
      const count = 9;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < count; i++) {
        const t = i / count;
        const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x;
        const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y + a.scale * 0.3;
        const r = Math.max(1.5, a.scale * 0.22);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, 'rgba(255, 220, 160, 0.95)');
        g.addColorStop(0.25, 'rgba(255, 70, 50, 0.6)');
        g.addColorStop(1, 'rgba(255, 40, 40, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }

  private drawPetal(camera: Camera, petal: Petal): void {
    const p = project(camera, petal.x, petal.y, petal.z);
    if (!p) return;
    const size = petal.size * p.scale * (SPRITE_SIZE / (SPRITE_SIZE * 0.72));
    if (size < 0.6 || p.x < -size || p.x > this.viewport.width + size || p.y < -size || p.y > this.viewport.height + size) return;
    const { ctx } = this;
    const sprites = p.depth < 1.6 ? this.assets.petals.soft : this.assets.petals.sharp;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(petal.angle);
    ctx.scale(petalScaleX(petal), 1);
    ctx.globalAlpha = 1 - fogAt(p.depth) * 0.9;
    ctx.drawImage(sprites[petal.variant], -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private bloom(): void {
    const { ctx } = this;
    const glow = this.glow.ctx;
    glow.setTransform(1, 0, 0, 1, 0, 0);
    glow.imageSmoothingQuality = 'high';
    glow.clearRect(0, 0, this.glow.canvas.width, this.glow.canvas.height);
    glow.drawImage(this.canvas, 0, 0, this.glow.canvas.width, this.glow.canvas.height);
    withState(ctx, () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32;
      ctx.drawImage(this.glow.canvas, 0, 0, this.canvas.width, this.canvas.height);
    });
  }

  private spawnDrop(anywhere: boolean): Drop {
    const near = this.rng();
    return {
      x: this.rng() * this.viewport.width * 1.2,
      y: anywhere ? this.rng() * this.viewport.height : -40,
      length: 10 + near * 26,
      speed: 900 + near * 900,
      alpha: 0.05 + near * 0.13,
    };
  }

  private drawRain(dt: number): void {
    if (!this.drops.length) return;
    const { ctx } = this;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (const drop of this.drops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * dt * 0.12;
      if (drop.y > this.viewport.height + 40 || drop.x < -40) Object.assign(drop, this.spawnDrop(false));
      ctx.strokeStyle = `rgba(210, 225, 255, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.length * 0.12, drop.y - drop.length);
      ctx.stroke();
    }
  }
}
