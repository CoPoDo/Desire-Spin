/**
 * Casino-chip confetti shower for big wins. Single shared canvas
 * pinned at fixed inset:0, RAF-driven physics loop. Adapted from the
 * old House Edge `fireConfetti()` helper but generalised so per-slot
 * themes can pass their own colour palette.
 *
 * Usage:
 *   import { fireConfetti } from '@/lib/confetti';
 *   fireConfetti({ colors: ['#ff5fa2','#ffd166','#fff'] });
 *
 * The canvas is created lazily on first call and reused thereafter.
 */

type Chip = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  rot: number;
  vr: number;
  life: number;
};

const CHIPS: Chip[] = [];
let canvasEl: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let active = false;

const DEFAULT_COLORS = ['#F5C56F', '#E5A93A', '#FFE9A8', '#C8932E', '#10B981', '#F5F0E4'];

function resize() {
  if (!canvasEl) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvasEl.width = Math.floor(window.innerWidth * dpr);
  canvasEl.height = Math.floor(window.innerHeight * dpr);
  canvasEl.style.width = window.innerWidth + 'px';
  canvasEl.style.height = window.innerHeight + 'px';
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function ensureCanvas() {
  if (canvasEl) return;
  canvasEl = document.createElement('canvas');
  canvasEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  canvasEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvasEl);
  ctx = canvasEl.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function step() {
  if (!ctx || !canvasEl) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (let i = CHIPS.length - 1; i >= 0; i--) {
    const c = CHIPS[i]!;
    c.vy += 0.55;
    c.vx *= 0.99;
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.vr;
    c.life -= 0.008;
    if (c.life <= 0 || c.y > window.innerHeight + 40) {
      CHIPS.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.max(0, c.life);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  if (CHIPS.length) {
    requestAnimationFrame(step);
  } else {
    active = false;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/** Spawn `count` chips fountaining outward from the screen centre.
 *  `colors` lets each slot use its own palette so Bonanza wins fountain
 *  hot-pink chips, Olympus wins fountain gold + amethyst, etc. */
export function fireConfetti(opts: { count?: number; colors?: string[] } = {}) {
  ensureCanvas();
  const colors = opts.colors ?? DEFAULT_COLORS;
  const count = opts.count ?? 80;
  for (let i = 0; i < count; i++) {
    CHIPS.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 60,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 16 - 6,
      r: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    });
  }
  if (!active) {
    active = true;
    requestAnimationFrame(step);
  }
}
