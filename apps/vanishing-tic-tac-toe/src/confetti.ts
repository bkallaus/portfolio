type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  life: number;
};

const GRAVITY = 0.14;
const DRAG = 0.992;
const FADE_PER_FRAME = 0.006;
const PARTICLE_COUNT = 160;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createParticles(count: number, colors: string[]): Particle[] {
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight / 3;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 9;
    return {
      x: originX + (Math.random() - 0.5) * 120,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    };
  });
}

export function launchConfetti(colors: string[]): void {
  if (prefersReducedMotion()) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const scale = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * scale;
  canvas.height = window.innerHeight * scale;
  context.scale(scale, scale);
  document.body.appendChild(canvas);

  let particles = createParticles(PARTICLE_COUNT, colors);

  const step = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((particle) => particle.life > 0 && particle.y < window.innerHeight + 40);

    for (const particle of particles) {
      particle.vx *= DRAG;
      particle.vy = particle.vy * DRAG + GRAVITY;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;
      particle.life -= FADE_PER_FRAME;

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.globalAlpha = Math.max(particle.life, 0);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      context.restore();
    }

    if (particles.length > 0) {
      requestAnimationFrame(step);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(step);
}
