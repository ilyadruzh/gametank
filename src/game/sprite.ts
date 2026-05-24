// Сборка 2D-спрайта танка в "карандашном" стиле на offscreen-канвасе.
import { darken, sketchCircle, sketchLine, sketchRect } from './sketch';
import type { TankStats } from './types';

export interface TankSprite {
  canvas: HTMLCanvasElement;
  pivotX: number;
  pivotY: number;
  tipDist: number;
}

export function buildSprite(stats: TankStats): TankSprite {
  const margin = 16;
  const bodyLen = stats.len;
  const bodyWid = stats.wid;
  const barrel = stats.blen;
  const ov = stats.thick;
  const pivotX = bodyLen / 2 + margin;
  const pivotY = bodyWid / 2 + ov + margin;
  const W = pivotX + (bodyLen / 2 + barrel) + margin;
  const H = pivotY * 2;

  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W);
  cv.height = Math.ceil(H);
  const ctx = cv.getContext('2d')!;
  const cx = pivotX;
  const cy = pivotY;
  const body = stats.color;
  const body2 = darken(stats.color, 0.7);
  const metal = '#6f6a5d';

  // тень снизу
  ctx.fillStyle = 'rgba(0,0,0,.10)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 5, bodyLen / 2 + 4, bodyWid / 2 + ov, 0, 0, 7);
  ctx.fill();

  // гусеницы (сверху и снизу корпуса)
  const trkLen = bodyLen + 10;
  [-(bodyWid / 2 + ov / 2 - 2), bodyWid / 2 + ov / 2 - 2].forEach((off) => {
    sketchRect(ctx, cx - trkLen / 2, cy + off - ov / 2, trkLen, ov, {
      fill: '#3a352b',
      color: '#1c1a14',
      w: 2,
      r: 4,
    });
    for (let x = cx - trkLen / 2 + 5; x < cx + trkLen / 2 - 3; x += 8) {
      sketchLine(ctx, x, cy + off - ov / 2 + 1, x, cy + off + ov / 2 - 1, {
        color: '#1c1a14',
        w: 1.4,
        passes: 1,
        wob: 0.6,
      });
    }
  });

  // корпус
  sketchRect(ctx, cx - bodyLen / 2, cy - bodyWid / 2, bodyLen, bodyWid, {
    fill: body,
    color: '#27241d',
    w: 2.6,
    r: 8,
  });
  // полоска-акцент цвета страны
  ctx.globalAlpha = 0.9;
  sketchRect(ctx, cx - bodyLen / 2 + 5, cy - 3, bodyLen - 10, 6, { fill: body2, color: body2, w: 1, passes: 1 });
  ctx.globalAlpha = 1;

  // башня
  sketchCircle(ctx, cx - 3, cy, stats.tsize / 1.6, { fill: body2, color: '#27241d', w: 2.4 });
  // ствол
  sketchRect(ctx, cx - 3, cy - stats.bw / 2, bodyLen / 2 + barrel - (bodyLen / 2 - 3 - 3), stats.bw, {
    fill: metal,
    color: '#27241d',
    w: 2,
    r: 3,
  });
  // дуло
  sketchRect(ctx, cx - 3 + (bodyLen / 2 + barrel) - 10, cy - stats.bw / 2 - 1.5, 8, stats.bw + 3, {
    fill: '#4a463c',
    color: '#27241d',
    w: 1.8,
    r: 2,
  });
  // заклёпки
  ctx.fillStyle = '#27241d';
  [
    [-bodyLen / 2 + 8, -bodyWid / 2 + 7],
    [-bodyLen / 2 + 8, bodyWid / 2 - 7],
  ].forEach((d) => {
    ctx.beginPath();
    ctx.arc(cx + d[0], cy + d[1], 1.6, 0, 7);
    ctx.fill();
  });

  return { canvas: cv, pivotX, pivotY, tipDist: bodyLen / 2 + barrel + 4 };
}
