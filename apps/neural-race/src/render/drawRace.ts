import { CAR_HALF_WIDTH, CAR_LENGTH, sensorAngles } from '../engine/car';
import type { Race } from '../engine/race';
import type { Track } from '../engine/track';

export type Viewport = { scale: number; offsetX: number; offsetY: number };

export const SURFACE = '#20242c';
export const WALL = '#525a67';
export const BACKDROP = '#0c0e13';

export function fitViewport(track: Track, width: number, height: number, padding = 28): Viewport {
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

  ctx.setLineDash([10, 18]);
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = Math.max(1, 1.5 * view.scale);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = WALL;
  ctx.lineWidth = Math.max(1.5, 2.5 * view.scale);
  tracePath(ctx, track.leftWall, view);
  ctx.stroke();
  tracePath(ctx, track.rightWall, view);
  ctx.stroke();

  drawStartLine(ctx, track, view);
}

function drawSensors(
  ctx: CanvasRenderingContext2D,
  race: Race,
  index: number,
  view: Viewport,
): void {
  const racer = race.racers[index];
  const { state, spec } = racer;
  const angles = sensorAngles(spec.sensors);

  angles.forEach((angle, ray) => {
    const reach = state.sensorReadings[ray] ?? spec.sensors.range;
    const direction = state.heading + angle;
    const originX = state.x * view.scale + view.offsetX;
    const originY = state.y * view.scale + view.offsetY;
    const endX = (state.x + Math.cos(direction) * reach) * view.scale + view.offsetX;
    const endY = (state.y + Math.sin(direction) * reach) * view.scale + view.offsetY;
    const proximity = 1 - reach / spec.sensors.range;

    ctx.strokeStyle = `rgba(120, 220, 255, ${0.16 + proximity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = `rgba(120, 220, 255, ${0.3 + proximity * 0.6})`;
    ctx.beginPath();
    ctx.arc(endX, endY, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  race: Race,
  index: number,
  view: Viewport,
  leaderId: string,
): void {
  const { state, spec } = race.racers[index];
  const length = CAR_LENGTH * view.scale;
  const width = CAR_HALF_WIDTH * 2 * view.scale;

  ctx.save();
  ctx.translate(state.x * view.scale + view.offsetX, state.y * view.scale + view.offsetY);
  ctx.rotate(state.heading);
  ctx.globalAlpha = state.alive ? 1 : 0.28;

  if (state.alive && spec.id === leaderId) {
    ctx.shadowColor = spec.color;
    ctx.shadowBlur = 14;
  }

  ctx.fillStyle = spec.color;
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
  selectedIndex: number,
): void {
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, width, height);

  drawTrack(ctx, race.track, view);

  const leader = [...race.racers]
    .filter((racer) => racer.state.alive)
    .sort((a, b) => b.state.distance - a.state.distance)[0];
  const leaderId = leader ? leader.spec.id : '';

  if (race.racers[selectedIndex]) {
    ctx.globalAlpha = race.racers[selectedIndex].state.alive ? 1 : 0.35;
    drawSensors(ctx, race, selectedIndex, view);
    ctx.globalAlpha = 1;
  }
  for (let index = 0; index < race.racers.length; index++) {
    drawCar(ctx, race, index, view, leaderId);
  }
}
