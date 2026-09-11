import type { Race } from '../engine/race';
import { CAR_HALF_WIDTH, CAR_LENGTH } from '../engine/runner';
import type { Track } from '../engine/track';

export type Viewport = { scale: number; offsetX: number; offsetY: number };

const SURFACE = '#20242c';
const WALL = '#525a67';
const BACKDROP = '#0c0e13';

export function fitViewport(track: Track, width: number, height: number, padding = 26): Viewport {
  const spanX = track.bounds.maxX - track.bounds.minX;
  const spanY = track.bounds.maxY - track.bounds.minY;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  return {
    scale,
    offsetX: (width - spanX * scale) / 2 - track.bounds.minX * scale,
    offsetY: (height - spanY * scale) / 2 - track.bounds.minY * scale,
  };
}

function tracePath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], view: Viewport): void {
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = point.x * view.scale + view.offsetX;
    const y = point.y * view.scale + view.offsetY;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawStartLine(ctx: CanvasRenderingContext2D, track: Track, view: Viewport): void {
  const point = track.centerline[0];
  const normal = track.normals[0];
  const squares = 8;
  const size = (track.halfWidth * 2) / squares;
  for (let i = 0; i < squares; i++) {
    const offset = -track.halfWidth + size * i;
    const x = (point.x + normal.x * offset) * view.scale + view.offsetX;
    const y = (point.y + normal.y * offset) * view.scale + view.offsetY;
    ctx.fillStyle = i % 2 === 0 ? '#f2f4f8' : '#2b303a';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(normal.y, normal.x));
    ctx.fillRect(-size * view.scale * 0.5, 0, size * view.scale, size * view.scale);
    ctx.restore();
  }
}

export function drawTrack(ctx: CanvasRenderingContext2D, track: Track, view: Viewport): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  tracePath(ctx, track.centerline, view);
  ctx.strokeStyle = SURFACE;
  ctx.lineWidth = track.halfWidth * 2 * view.scale;
  ctx.stroke();

  ctx.strokeStyle = WALL;
  ctx.lineWidth = Math.max(1.5, 2.5 * view.scale);
  tracePath(ctx, track.leftWall, view);
  ctx.stroke();
  tracePath(ctx, track.rightWall, view);
  ctx.stroke();

  drawStartLine(ctx, track, view);
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  runner: Race['runners'][number],
  view: Viewport,
  highlight: boolean,
): void {
  const length = CAR_LENGTH * view.scale;
  const width = CAR_HALF_WIDTH * 2 * view.scale;

  ctx.save();
  ctx.translate(runner.x * view.scale + view.offsetX, runner.y * view.scale + view.offsetY);
  ctx.rotate(runner.heading);

  if (highlight) {
    ctx.shadowColor = runner.setup.color;
    ctx.shadowBlur = 16;
  }

  ctx.fillStyle = runner.setup.color;
  ctx.beginPath();
  ctx.moveTo(length / 2, 0);
  ctx.lineTo(-length / 2, -width / 2);
  ctx.lineTo(-length / 3, 0);
  ctx.lineTo(-length / 2, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRace(
  ctx: CanvasRenderingContext2D,
  race: Race,
  view: Viewport,
  width: number,
  height: number,
  highlightId: string,
  showLine: boolean,
): void {
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, width, height);

  drawTrack(ctx, race.track, view);

  if (showLine) {
    tracePath(ctx, race.line.points, view);
    ctx.setLineDash([9, 11]);
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.45)';
    ctx.lineWidth = Math.max(1, 1.8 * view.scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const runner of race.runners) {
    drawCar(ctx, runner, view, runner.setup.id === highlightId);
  }
}
