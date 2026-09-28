import { type Field, type Petal, petalScaleX, spawnPetal, stepPetal, wrapPetal, type Weather } from '../lib/petals';
import { createRng, type Rng } from '../lib/rng';
import { type PetalSprites, SPRITE_SIZE } from './petalSprites';

export type PetalFieldOptions = {
  count: number;
  minDepth: number;
  maxDepth: number;
  blurFrom: number;
  rain: number;
  seed: number;
};

type Drop = { x: number; y: number; length: number; speed: number; alpha: number };

export class PetalField {
  private petals: Petal[] = [];
  private drops: Drop[] = [];
  private rng: Rng;
  private field: Field = { width: 1, height: 1 };
  private ctx: CanvasRenderingContext2D;

  constructor(
    private canvas: HTMLCanvasElement,
    private sprites: PetalSprites,
    private options: PetalFieldOptions,
  ) {
    this.rng = createRng(options.seed);
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  resize(width: number, height: number, ratio: number): void {
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.field = { width, height };
    const area = (width * height) / (1440 * 900);
    const count = Math.round(this.options.count * Math.min(1.4, Math.max(0.45, area)));
    this.petals = Array.from({ length: count }, () =>
      spawnPetal(this.rng, this.field, this.options.minDepth, this.options.maxDepth, false),
    ).sort((a, b) => a.depth - b.depth);
    this.drops = Array.from({ length: Math.round(this.options.rain * Math.max(0.5, area)) }, () => this.spawnDrop(true));
  }

  private spawnDrop(anywhere: boolean): Drop {
    const near = this.rng();
    return {
      x: this.rng() * this.field.width * 1.2,
      y: anywhere ? this.rng() * this.field.height : -40,
      length: 10 + near * 26,
      speed: 900 + near * 900,
      alpha: 0.05 + near * 0.13,
    };
  }

  step(dt: number, weather: Weather): void {
    for (const petal of this.petals) {
      stepPetal(petal, dt, weather);
      wrapPetal(petal, this.field);
    }
    for (const drop of this.drops) {
      drop.y += drop.speed * dt - weather.cameraShift * 0.8;
      drop.x -= drop.speed * dt * 0.12;
      if (drop.y > this.field.height + 40 || drop.x < -40) Object.assign(drop, this.spawnDrop(false));
      if (drop.y < -60) drop.y += this.field.height + 80;
    }
  }

  draw(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.field.width, this.field.height);

    if (this.drops.length) {
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (const drop of this.drops) {
        ctx.strokeStyle = `rgba(210, 225, 255, ${drop.alpha})`;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.length * 0.12, drop.y - drop.length);
        ctx.stroke();
      }
    }

    for (const petal of this.petals) {
      const soft = petal.depth >= this.options.blurFrom;
      const sprite = (soft ? this.sprites.soft : this.sprites.sharp)[petal.variant];
      const size = (petal.size * 2.1 * SPRITE_SIZE) / 36;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const ratio = this.canvas.width / this.field.width;
      ctx.translate(petal.x * ratio, petal.y * ratio);
      ctx.rotate(petal.angle);
      ctx.scale(petalScaleX(petal) * ratio, ratio);
      ctx.globalAlpha = Math.min(1, 0.45 + petal.depth * 0.5);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    }
    const ratio = this.canvas.width / this.field.width;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalAlpha = 1;
  }
}
