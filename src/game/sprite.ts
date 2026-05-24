// Сборка 2D-спрайта танка в "карандашном" стиле на offscreen-канвасе.
// Каждая категория деталей рисуется отдельной функцией со switch по id —
// поэтому части различаются не только размером, но и формой/дизайном.
import { darken, sketchCircle, sketchLine, sketchRect } from './sketch';
import type { TankStats } from './types';

export interface TankSprite {
  canvas: HTMLCanvasElement;
  pivotX: number;
  pivotY: number;
  tipDist: number;
}

const INK = '#27241d';
const METAL = '#6f6a5d';
const METAL_DARK = '#4a463c';

export function buildSprite(stats: TankStats): TankSprite {
  const margin = 18;
  const bodyLen = stats.len;
  const bodyWid = stats.wid;
  const barrel = stats.blen;
  const ov = stats.thick;
  const pivotX = bodyLen / 2 + margin;
  const pivotY = bodyWid / 2 + ov + margin;
  const W = pivotX + (bodyLen / 2 + barrel) + margin + 6;
  const H = pivotY * 2;

  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W);
  cv.height = Math.ceil(H);
  const ctx = cv.getContext('2d')!;
  const cx = pivotX;
  const cy = pivotY;
  const body = stats.color;
  const body2 = darken(stats.color, 0.7);

  // тень снизу
  ctx.fillStyle = 'rgba(0,0,0,.10)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 5, bodyLen / 2 + 4, bodyWid / 2 + ov, 0, 0, 7);
  ctx.fill();

  drawTracks(ctx, cx, cy, stats);
  drawHull(ctx, cx, cy, stats, body, body2);
  drawCannon(ctx, cx, cy, stats); // ствол под башней
  drawTurret(ctx, cx, cy, stats, body2);

  if (stats.faceId) drawFace(ctx, cx, cy, bodyLen, bodyWid, stats.faceId);

  return { canvas: cv, pivotX, pivotY, tipDist: bodyLen / 2 + barrel + 4 };
}

// ---------- ГУСЕНИЦЫ ----------
function drawTracks(ctx: CanvasRenderingContext2D, cx: number, cy: number, stats: TankStats): void {
  const bodyLen = stats.len;
  const bodyWid = stats.wid;
  const ov = stats.thick;
  const trkLen = bodyLen + 10;
  const offs = [-(bodyWid / 2 + ov / 2 - 2), bodyWid / 2 + ov / 2 - 2];

  offs.forEach((off) => {
    const top = cy + off - ov / 2;
    sketchRect(ctx, cx - trkLen / 2, top, trkLen, ov, { fill: '#3a352b', color: '#1c1a14', w: 2, r: 4 });

    if (stats.trackId === 'sport') {
      // два больших катка
      [-trkLen * 0.28, trkLen * 0.28].forEach((dx) => {
        sketchCircle(ctx, cx + dx, cy + off, ov * 0.42, { fill: '#5a5347', color: '#1c1a14', w: 1.6 });
      });
    } else if (stats.trackId === 'siege') {
      // широкие зубья-«грунтозацепы»
      for (let x = cx - trkLen / 2 + 4; x < cx + trkLen / 2 - 4; x += 11) {
        ctx.fillStyle = '#1c1a14';
        ctx.beginPath();
        ctx.moveTo(x, top + 1);
        ctx.lineTo(x + 6, top + ov / 2);
        ctx.lineTo(x, top + ov - 1);
        ctx.closePath();
        ctx.fill();
      }
    } else if (stats.trackId === 'heavy') {
      // массивные звенья + болты
      for (let x = cx - trkLen / 2 + 5; x < cx + trkLen / 2 - 3; x += 10) {
        sketchRect(ctx, x, top + 1, 7, ov - 2, { color: '#1c1a14', w: 1.4, passes: 1 });
      }
    } else {
      // light / medium — частые звенья (мелкие у light)
      const step = stats.trackId === 'light' ? 6 : 8;
      for (let x = cx - trkLen / 2 + 5; x < cx + trkLen / 2 - 3; x += step) {
        sketchLine(ctx, x, top + 1, x, top + ov - 1, { color: '#1c1a14', w: 1.4, passes: 1, wob: 0.6 });
      }
    }
  });
}

// ---------- КОРПУС ----------
function drawHull(ctx: CanvasRenderingContext2D, cx: number, cy: number, stats: TankStats, body: string, body2: string): void {
  const L = stats.len;
  const Wd = stats.wid;
  const x0 = cx - L / 2;
  const y0 = cy - Wd / 2;

  if (stats.hullId === 'scout') {
    // скошенный нос
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + Wd * 0.22);
    ctx.lineTo(x0 + L * 0.78, y0);
    ctx.lineTo(x0 + L, cy);
    ctx.lineTo(x0 + L * 0.78, y0 + Wd);
    ctx.lineTo(x0, y0 + Wd * 0.78);
    ctx.closePath();
    ctx.fill();
    sketchLine(ctx, x0, y0 + Wd * 0.22, x0 + L * 0.78, y0, { color: INK, w: 2.4 });
    sketchLine(ctx, x0 + L * 0.78, y0, x0 + L, cy, { color: INK, w: 2.4 });
    sketchLine(ctx, x0 + L, cy, x0 + L * 0.78, y0 + Wd, { color: INK, w: 2.4 });
    sketchLine(ctx, x0 + L * 0.78, y0 + Wd, x0, y0 + Wd * 0.78, { color: INK, w: 2.4 });
    sketchLine(ctx, x0, y0 + Wd * 0.78, x0, y0 + Wd * 0.22, { color: INK, w: 2.4 });
  } else {
    const r = stats.hullId === 'glass' ? 14 : stats.hullId === 'bunker' || stats.hullId === 'fortress' ? 3 : 8;
    sketchRect(ctx, x0, y0, L, Wd, { fill: body, color: INK, w: 2.6, r });
  }

  // акцентная полоса страны
  ctx.globalAlpha = 0.9;
  sketchRect(ctx, x0 + 5, cy - 3, L - 10, 6, { fill: body2, color: body2, w: 1, passes: 1 });
  ctx.globalAlpha = 1;

  if (stats.hullId === 'glass') {
    // блик-«фонарь»
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(cx - L * 0.1, cy - Wd * 0.16, L * 0.18, Wd * 0.12, -0.3, 0, 7);
    ctx.fill();
  } else if (stats.hullId === 'bunker' || stats.hullId === 'fortress') {
    // навесные плиты + болты
    sketchRect(ctx, x0 + 3, y0 + 3, L - 6, Wd - 6, { color: darken(body, 0.6), w: 1.4, passes: 1 });
    const bolts: [number, number][] = [
      [x0 + 7, y0 + 6], [x0 + 7, y0 + Wd - 6], [x0 + L - 7, y0 + 6], [x0 + L - 7, y0 + Wd - 6],
    ];
    if (stats.hullId === 'fortress') {
      // боковые экраны
      sketchRect(ctx, x0 + L * 0.2, y0 - 3, L * 0.6, 4, { fill: darken(body, 0.7), color: INK, w: 1.4, passes: 1 });
      sketchRect(ctx, x0 + L * 0.2, y0 + Wd - 1, L * 0.6, 4, { fill: darken(body, 0.7), color: INK, w: 1.4, passes: 1 });
    }
    ctx.fillStyle = INK;
    bolts.forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 1.7, 0, 7);
      ctx.fill();
    });
  } else {
    // стандартные заклёпки
    ctx.fillStyle = INK;
    [[x0 + 8, y0 + 7], [x0 + 8, y0 + Wd - 7]].forEach(([bx, by]) => {
      ctx.beginPath();
      ctx.arc(bx, by, 1.6, 0, 7);
      ctx.fill();
    });
  }
}

// ---------- БАШНЯ ----------
function drawTurret(ctx: CanvasRenderingContext2D, cx: number, cy: number, stats: TankStats, body2: string): void {
  const r = stats.tsize / 1.6;
  const tx = cx - 3;
  if (stats.turretId === 'twin') {
    // приплюснутая «спарка» — широкий овал
    ctx.save();
    ctx.translate(tx, cy);
    ctx.scale(1.25, 0.85);
    sketchCircle(ctx, 0, 0, r, { fill: body2, color: INK, w: 2.4 });
    ctx.restore();
    sketchRect(ctx, tx - r * 0.3, cy - r * 0.7, r * 0.6, r * 1.4, { color: INK, w: 1.4, passes: 1 });
  } else if (stats.turretId === 'big') {
    // высокая гранёная башня (шестигранник) + люк
    const n = 6;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 6;
      pts.push([tx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.05]);
    }
    ctx.fillStyle = body2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    sketchCircle(ctx, tx - r * 0.3, cy - r * 0.3, r * 0.32, { color: INK, w: 1.6 }); // люк
  } else {
    // small — низкая круглая
    sketchCircle(ctx, tx, cy, r, { fill: body2, color: INK, w: 2.4 });
  }
}

// ---------- ПУШКА (ствол) ----------
function drawCannon(ctx: CanvasRenderingContext2D, cx: number, cy: number, stats: TankStats): void {
  const bx0 = cx - 3;
  const bw = stats.bw;
  const tipX = cx + stats.len / 2 + stats.blen - 6;
  const kind = stats.cannonKind;

  if (kind === 'flame') {
    // тонкая трубка + раздутое сопло + бак у основания
    sketchRect(ctx, bx0, cy - bw * 0.35, tipX - bx0 - 6, bw * 0.7, { fill: METAL, color: INK, w: 2, r: 3 });
    ctx.fillStyle = '#b5482a';
    ctx.beginPath();
    ctx.moveTo(tipX - 8, cy - bw * 0.4);
    ctx.lineTo(tipX + 2, cy - bw * 1.1);
    ctx.lineTo(tipX + 2, cy + bw * 1.1);
    ctx.lineTo(tipX - 8, cy + bw * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    sketchCircle(ctx, bx0 + 4, cy - bw * 1.1, bw * 0.7, { fill: '#c0392b', color: INK, w: 1.6 }); // баллон
  } else if (kind === 'electric') {
    // стержень с кольцами-катушками + два электрода
    sketchRect(ctx, bx0, cy - bw * 0.4, tipX - bx0 - 6, bw * 0.8, { fill: METAL_DARK, color: INK, w: 2, r: 2 });
    for (let i = 1; i <= 3; i++) {
      const rx = bx0 + (tipX - bx0) * (0.4 + i * 0.16);
      sketchCircle(ctx, rx, cy, bw * 0.9, { color: '#7fc7e6', w: 1.8, passes: 1 });
    }
    sketchLine(ctx, tipX - 4, cy - bw * 0.9, tipX + 4, cy - bw * 1.4, { color: '#cfefff', w: 2 });
    sketchLine(ctx, tipX - 4, cy + bw * 0.9, tipX + 4, cy + bw * 1.4, { color: '#cfefff', w: 2 });
  } else if (kind === 'fart') {
    // труба-туба с большим раструбом на конце
    sketchRect(ctx, bx0, cy - bw * 0.4, (tipX - bx0) * 0.6, bw * 0.8, { fill: METAL, color: INK, w: 2, r: 3 });
    ctx.fillStyle = '#9bc24a';
    ctx.beginPath();
    ctx.moveTo(bx0 + (tipX - bx0) * 0.6, cy - bw * 0.5);
    ctx.lineTo(tipX + 4, cy - bw * 1.4);
    ctx.lineTo(tipX + 4, cy + bw * 1.4);
    ctx.lineTo(bx0 + (tipX - bx0) * 0.6, cy + bw * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (kind === 'chicken') {
    // короб-курятник на конце с торчащей куриной головой
    sketchRect(ctx, bx0, cy - bw * 0.3, (tipX - bx0) * 0.55, bw * 0.6, { fill: METAL, color: INK, w: 2, r: 3 });
    const boxX = bx0 + (tipX - bx0) * 0.5;
    sketchRect(ctx, boxX, cy - bw * 1.1, (tipX - boxX) + 4, bw * 2.2, { fill: '#d8b25a', color: INK, w: 2.2, r: 3 });
    // решётка
    for (let gx = boxX + 4; gx < tipX; gx += 5) sketchLine(ctx, gx, cy - bw, gx, cy + bw, { color: '#8a6a2a', w: 1.2, passes: 1 });
    // курья голова
    sketchCircle(ctx, tipX + 2, cy - bw * 0.4, bw * 0.5, { fill: '#fdfdf5', color: INK, w: 1.4 });
    ctx.fillStyle = '#e8941e';
    ctx.beginPath();
    ctx.moveTo(tipX + 2 + bw * 0.5, cy - bw * 0.4);
    ctx.lineTo(tipX + 2 + bw, cy - bw * 0.2);
    ctx.lineTo(tipX + 2 + bw * 0.5, cy - bw * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (stats.cannon === 'mg') {
    // тонкий ствол с перфорированным кожухом
    sketchRect(ctx, bx0, cy - bw * 0.5, tipX - bx0, bw, { fill: METAL, color: INK, w: 1.8, r: 2 });
    for (let gx = bx0 + (tipX - bx0) * 0.45; gx < tipX - 3; gx += 4) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(gx, cy, 1, 0, 7);
      ctx.fill();
    }
  } else if (stats.cannon === 'howitzer') {
    // короткий толстый ствол + большой дульный тормоз
    const hl = (tipX - bx0) * 0.78;
    sketchRect(ctx, bx0, cy - bw * 0.6, hl, bw * 1.2, { fill: METAL, color: INK, w: 2.2, r: 3 });
    sketchRect(ctx, bx0 + hl - 2, cy - bw * 0.9, bw * 1.4, bw * 1.8, { fill: METAL_DARK, color: INK, w: 2, r: 2 });
  } else {
    // gun — классический ствол + дуло
    sketchRect(ctx, bx0, cy - bw / 2, tipX - bx0, bw, { fill: METAL, color: INK, w: 2, r: 3 });
    sketchRect(ctx, tipX - 8, cy - bw / 2 - 1.5, 8, bw + 3, { fill: METAL_DARK, color: INK, w: 1.8, r: 2 });
  }
}

// Мультяшное «лицо» танка-персонажа, смотрит вперёд (по +X).
function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, wid: number, faceId: string): void {
  const ex = cx + len * 0.2;
  const eyeOff = wid * 0.2;
  const eyeR = Math.max(3, wid * 0.11);
  const cool = faceId === 'cool';

  const eye = (ey: number) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR, 0, 7);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.4, ey, eyeR * 0.5, 0, 7); // зрачок смотрит вперёд
    ctx.fill();
  };

  if (cool) {
    // солнечные очки
    ctx.fillStyle = '#1a1714';
    ctx.fillRect(ex - eyeR, cy - eyeOff - eyeR, eyeR * 2, eyeR * 2);
    ctx.fillRect(ex - eyeR, cy + eyeOff - eyeR, eyeR * 2, eyeR * 2);
    sketchLine(ctx, ex, cy - eyeOff, ex, cy + eyeOff, { color: '#1a1714', w: 2, passes: 1 });
  } else {
    eye(cy - eyeOff);
    eye(cy + eyeOff);
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  if (faceId === 'angry' || faceId === 'grumpy') {
    ctx.beginPath();
    ctx.moveTo(ex - eyeR, cy - eyeOff - eyeR);
    ctx.lineTo(ex + eyeR, cy - eyeOff - eyeR * 0.2);
    ctx.moveTo(ex - eyeR, cy + eyeOff + eyeR);
    ctx.lineTo(ex + eyeR, cy + eyeOff + eyeR * 0.2);
    ctx.stroke();
  }

  const mx = cx + len * 0.34;
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  if (faceId === 'fang') {
    ctx.fillStyle = '#5a1410';
    ctx.beginPath();
    ctx.ellipse(mx, cy, wid * 0.14, wid * 0.22, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(mx - wid * 0.06, cy + i * wid * 0.07);
      ctx.lineTo(mx + wid * 0.12, cy + i * wid * 0.07 - 2);
      ctx.lineTo(mx + wid * 0.12, cy + i * wid * 0.07 + 2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (faceId === 'happy' || faceId === 'silly' || faceId === 'cool') {
    ctx.beginPath();
    ctx.arc(mx - 2, cy, wid * 0.16, -Math.PI * 0.15, Math.PI * 0.15);
    ctx.stroke();
    if (faceId === 'silly') {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(mx + wid * 0.1, cy + wid * 0.06, 3, 0, 7);
      ctx.fill();
    }
  } else if (faceId === 'derp') {
    ctx.beginPath();
    ctx.arc(mx, cy + wid * 0.04, wid * 0.08, 0, 7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(mx - wid * 0.12, cy + 3);
    ctx.lineTo(mx - wid * 0.04, cy - 2);
    ctx.lineTo(mx + wid * 0.04, cy + 3);
    ctx.lineTo(mx + wid * 0.12, cy - 2);
    ctx.stroke();
  }
}
