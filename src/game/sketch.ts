// "Карандашные" примитивы рисования — дрожащие линии под детский рисунок.

export function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export interface StrokeOpts {
  w?: number;
  color?: string;
  passes?: number;
  wob?: number;
  fill?: string;
  r?: number;
}

export function sketchLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  o: StrokeOpts = {}
): void {
  const w = o.w ?? 2.2;
  const col = o.color ?? '#27241d';
  const passes = o.passes ?? 2;
  const wob = o.wob ?? 1.3;
  ctx.lineWidth = w;
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segs = Math.max(2, Math.round(len / 15));
  for (let p = 0; p < passes; p++) {
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const edge = i === 0 || i === segs;
      const x = x1 + (x2 - x1) * t + (edge ? 0 : rnd(-wob, wob));
      const y = y1 + (y2 - y1) * t + (edge ? 0 : rnd(-wob, wob));
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

export function roundFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export function sketchRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  o: StrokeOpts = {}
): void {
  if (o.fill) {
    ctx.fillStyle = o.fill;
    roundFill(ctx, x, y, w, h, o.r ?? 6);
  }
  sketchLine(ctx, x, y, x + w, y, o);
  sketchLine(ctx, x + w, y, x + w, y + h, o);
  sketchLine(ctx, x + w, y + h, x, y + h, o);
  sketchLine(ctx, x, y + h, x, y, o);
}

export function sketchCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  o: StrokeOpts = {}
): void {
  const N = 18;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * (r + rnd(-1, 1.4)), cy + Math.sin(a) * (r + rnd(-1, 1.4))]);
  }
  if (o.fill) {
    ctx.fillStyle = o.fill;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = o.w ?? 2.2;
  ctx.strokeStyle = o.color ?? '#27241d';
  ctx.lineCap = 'round';
  for (let p = 0; p < (o.passes ?? 2); p++) {
    ctx.beginPath();
    pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])));
    ctx.closePath();
    ctx.stroke();
  }
}

export function darken(hex: string, f: number): string {
  const c = hex.replace('#', '');
  let r = parseInt(c.substr(0, 2), 16);
  let g = parseInt(c.substr(2, 2), 16);
  let b = parseInt(c.substr(4, 2), 16);
  r = Math.round(r * f);
  g = Math.round(g * f);
  b = Math.round(b * f);
  return `rgb(${r},${g},${b})`;
}
