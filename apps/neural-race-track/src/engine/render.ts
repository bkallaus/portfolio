import { SENSOR_RANGE } from './car';
import type { Simulation } from './simulation';
import { fromAngle, type Vec } from './vec';

type View = { scale: number; offsetX: number; offsetY: number };

export type RenderOptions = {
  width: number;
  height: number;
  selectedId: string | null;
  showSensors: boolean;
};

const computeView = (sim: Simulation, width: number, height: number): View => {
  const { min, max } = sim.track.bounds;
  const padding = 48;
  const worldWidth = max.x - min.x;
  const worldHeight = max.y - min.y;
  const scale = Math.min((width - padding * 2) / worldWidth, (height - padding * 2) / worldHeight);
  const offsetX = width / 2 - ((min.x + max.x) / 2) * scale;
  const offsetY = height / 2 - ((min.y + max.y) / 2) * scale;
  return { scale, offsetX, offsetY };
};

const project = (view: View, point: Vec): Vec => ({
  x: point.x * view.scale + view.offsetX,
  y: point.y * view.scale + view.offsetY,
});

const tracePath = (ctx: CanvasRenderingContext2D, view: View, points: Vec[], close: boolean) => {
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = project(view, point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  if (close) ctx.closePath();
};

const drawRoad = (ctx: CanvasRenderingContext2D, view: View, sim: Simulation) => {
  const { leftWall, rightWall } = sim.track;
  ctx.beginPath();
  leftWall.forEach((point, index) => {
    const screen = project(view, point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  for (let i = rightWall.length - 1; i >= 0; i--) {
    const screen = project(view, rightWall[i]);
    ctx.lineTo(screen.x, screen.y);
  }
  ctx.closePath();
  ctx.fillStyle = '#2a2f3a';
  ctx.fill();
};

const drawWalls = (ctx: CanvasRenderingContext2D, view: View, sim: Simulation) => {
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#e8ecf4';
  tracePath(ctx, view, sim.track.leftWall, true);
  ctx.stroke();
  tracePath(ctx, view, sim.track.rightWall, true);
  ctx.stroke();
};

const drawCenterline = (ctx: CanvasRenderingContext2D, view: View, sim: Simulation) => {
  ctx.save();
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(240, 200, 90, 0.55)';
  tracePath(ctx, view, sim.track.centerline, true);
  ctx.stroke();
  ctx.restore();
};

const drawStartLine = (ctx: CanvasRenderingContext2D, view: View, sim: Simulation) => {
  const { start, width } = sim.track;
  const normal = fromAngle(start.heading + Math.PI / 2);
  const a = project(view, {
    x: start.position.x + normal.x * (width / 2),
    y: start.position.y + normal.y * (width / 2),
  });
  const b = project(view, {
    x: start.position.x - normal.x * (width / 2),
    y: start.position.y - normal.y * (width / 2),
  });
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();
};

const drawSensors = (
  ctx: CanvasRenderingContext2D,
  view: View,
  car: Simulation['cars'][number],
) => {
  const origin = project(view, car.position);
  for (const reading of car.sensors) {
    const hit = project(view, reading.hit);
    const proximity = 1 - reading.distance / SENSOR_RANGE;
    ctx.strokeStyle = `rgba(120, 220, 160, ${0.25 + proximity * 0.5})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(hit.x, hit.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,0.9)';
    ctx.beginPath();
    ctx.arc(hit.x, hit.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawCar = (
  ctx: CanvasRenderingContext2D,
  view: View,
  car: Simulation['cars'][number],
  selected: boolean,
) => {
  const center = project(view, car.position);
  const size = 8;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(car.heading);
  ctx.globalAlpha = car.alive ? 1 : 0.28;
  ctx.beginPath();
  ctx.moveTo(size * 1.4, 0);
  ctx.lineTo(-size, size * 0.85);
  ctx.lineTo(-size, -size * 0.85);
  ctx.closePath();
  ctx.fillStyle = car.config.color;
  ctx.fill();
  if (selected) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  ctx.restore();
  if (!car.alive) {
    ctx.fillStyle = 'rgba(255,90,90,0.9)';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('✕', center.x, center.y - 12);
  }
};

export const render = (
  ctx: CanvasRenderingContext2D,
  sim: Simulation,
  options: RenderOptions,
) => {
  const { width, height } = options;
  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, width, height);
  const view = computeView(sim, width, height);
  drawRoad(ctx, view, sim);
  drawCenterline(ctx, view, sim);
  drawWalls(ctx, view, sim);
  drawStartLine(ctx, view, sim);
  const selected = sim.cars.find((car) => car.config.id === options.selectedId) ?? null;
  if (selected && options.showSensors) drawSensors(ctx, view, selected);
  for (const car of sim.cars) drawCar(ctx, view, car, car.config.id === options.selectedId);
};
