// Боевой движок: симуляция на 2D-канвасе. Вся кинематика и столкновения
// считаются в WASM-ядре (physics.wasm) — JS только читает результаты из scratch
// и рисует кадр.
import { sBoom, sHit, sShoot } from './audio';
import { COUNTRIES } from './parts';
import { rnd, sketchCircle, sketchLine, sketchRect } from './sketch';
import { buildSprite, type TankSprite } from './sprite';
import { computeStats } from './stats';
import type { PlayerConfig, TankStats } from './types';
import type { PhysicsModule } from '../wasm/loader';

export const ARENA_W = 960;
export const ARENA_H = 600;

export type BattleMode = 'versus' | 'bot';

interface Controls {
  fwd: string;
  back: string;
  left: string;
  right: string;
  fire: string;
  ring: string;
}

interface Tank {
  i: number;
  cfg: PlayerConfig;
  st: TankStats;
  spr: TankSprite;
  x: number;
  y: number;
  angle: number;
  spd: number;
  hp: number;
  maxHp: number;
  lastShot: number;
  ctrl: Controls;
  flash: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  dmg: number;
  life: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Obstacle {
  x: number;
  y: number;
  r: number;
  type: 'box' | 'rock';
}

export interface BattleCallbacks {
  onHp: (hp1: number, hp2: number) => void;
  onWin: (winnerIndex: number) => void;
}

const P1_CONTROLS: Controls = { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space', ring: '#2f6fb0' };
const P2_CONTROLS: Controls = {
  fwd: 'ArrowUp',
  back: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: 'Enter',
  ring: '#c0392b',
};

export class BattleEngine {
  private ctx: CanvasRenderingContext2D;
  private phys: PhysicsModule;
  private scratch: Float64Array;
  private mode: BattleMode;
  private cb: BattleCallbacks;

  private tanks: Tank[] = [];
  private bullets: Bullet[] = [];
  private parts: Particle[] = [];
  private obstacles: Obstacle[] = [];
  private bg: HTMLCanvasElement;

  private keys: Record<string, boolean> = {};
  private running = false;
  private over = false;
  private last = 0;
  private rafId = 0;
  private winTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    configs: [PlayerConfig, PlayerConfig],
    mode: BattleMode,
    phys: PhysicsModule,
    cb: BattleCallbacks
  ) {
    canvas.width = ARENA_W;
    canvas.height = ARENA_H;
    this.ctx = canvas.getContext('2d')!;
    this.phys = phys;
    this.scratch = phys.scratch;
    this.mode = mode;
    this.cb = cb;
    this.bg = document.createElement('canvas');

    this.spawnObstacles();
    this.makeBackground();
    this.tanks = configs.map((cfg, i) => this.makeTank(cfg, i));
  }

  private makeTank(cfg: PlayerConfig, i: number): Tank {
    const st = computeStats(cfg);
    const spr = buildSprite(st);
    return {
      i,
      cfg,
      st,
      spr,
      x: i === 0 ? ARENA_W * 0.13 : ARENA_W * 0.87,
      y: ARENA_H / 2,
      angle: i === 0 ? 0 : Math.PI,
      spd: 0,
      hp: st.maxHp,
      maxHp: st.maxHp,
      lastShot: 0,
      ctrl: i === 0 ? P1_CONTROLS : P2_CONTROLS,
      flash: 0,
    };
  }

  private spawnObstacles(): void {
    const W = ARENA_W;
    const H = ARENA_H;
    const spots: [number, number, 'box' | 'rock'][] = [
      [W * 0.5, H * 0.5, 'box'],
      [W * 0.28, H * 0.3, 'rock'],
      [W * 0.72, H * 0.7, 'rock'],
      [W * 0.28, H * 0.72, 'box'],
      [W * 0.72, H * 0.3, 'box'],
      [W * 0.5, H * 0.16, 'rock'],
      [W * 0.5, H * 0.84, 'rock'],
    ];
    this.obstacles = spots.map((s) => ({ x: s[0], y: s[1], r: s[2] === 'box' ? 26 : 24, type: s[2] }));
  }

  private makeBackground(): void {
    const W = ARENA_W;
    const H = ARENA_H;
    this.bg.width = W;
    this.bg.height = H;
    const c = this.bg.getContext('2d')!;
    c.fillStyle = '#f3ead2';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.5;
    for (let y = 70; y < H; y += 95) {
      sketchLine(c, 10, y + Math.sin(y) * 4, W - 10, y + Math.cos(y) * 6, {
        color: '#b9aaae',
        w: 1.4,
        passes: 1,
        wob: 2.4,
      });
    }
    c.globalAlpha = 1;
    this.obstacles.forEach((o) => {
      if (o.type === 'box') {
        sketchRect(c, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2, { fill: '#cdb37e', color: '#27241d', w: 2.4, r: 4 });
        sketchLine(c, o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r, { color: '#8a7444', w: 1.6, passes: 1 });
        sketchLine(c, o.x + o.r, o.y - o.r, o.x - o.r, o.y + o.r, { color: '#8a7444', w: 1.6, passes: 1 });
      } else {
        sketchCircle(c, o.x, o.y, o.r, { fill: '#b9b2a3', color: '#27241d', w: 2.4 });
        sketchLine(c, o.x - o.r * 0.4, o.y - o.r * 0.2, o.x + o.r * 0.3, o.y + o.r * 0.3, {
          color: '#7d776b',
          w: 1.4,
          passes: 1,
        });
      }
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.over = false;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.cb.onHp(this.hpRatio(0), this.hpRatio(1));
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.winTimeout) clearTimeout(this.winTimeout);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private hpRatio(i: number): number {
    const t = this.tanks[i];
    return (t.hp / t.maxHp) * 100;
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(2.4, (now - this.last) / 16.67);
    this.last = now;
    if (!this.over) this.update(dt, now);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // Ввод бота для танка #2: едет к врагу и стреляет, когда наведён.
  private botInput(bot: Tank, target: Tank): { move: number; turn: number; fire: boolean } {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const desired = Math.atan2(dy, dx);
    let diff = desired - bot.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.abs(diff) < 0.05 ? 0 : diff > 0 ? 1 : -1;
    const dist = Math.hypot(dx, dy);
    const move = dist > 220 ? 1 : dist < 130 ? -1 : 0;
    const fire = Math.abs(diff) < 0.16;
    return { move, turn, fire };
  }

  private update(dt: number, now: number): void {
    const ex = this.phys.exports;
    const s = this.scratch;

    this.tanks.forEach((t) => {
      let move: number;
      let turn: number;
      let firing: boolean;

      if (this.mode === 'bot' && t.i === 1) {
        const bi = this.botInput(t, this.tanks[0]);
        move = bi.move;
        turn = bi.turn;
        firing = bi.fire;
      } else {
        const k = t.ctrl;
        move = (this.keys[k.fwd] ? 1 : 0) - (this.keys[k.back] ? 1 : 0);
        turn = (this.keys[k.right] ? 1 : 0) - (this.keys[k.left] ? 1 : 0);
        firing = !!this.keys[k.fire];
      }

      // кинематика в WASM
      ex.stepTank(t.x, t.y, t.angle, t.spd, move, turn, t.st.speed, t.st.turn, dt);
      t.x = s[0];
      t.y = s[1];
      t.angle = s[2];
      t.spd = s[3];

      // стены в WASM
      ex.clampToArena(t.x, t.y, t.spd, t.st.radius, ARENA_W, ARENA_H);
      t.x = s[0];
      t.y = s[1];
      t.spd = s[2];

      // препятствия в WASM
      this.obstacles.forEach((o) => {
        ex.pushOutOfCircle(t.x, t.y, t.spd, t.st.radius, o.x, o.y, o.r);
        t.x = s[0];
        t.y = s[1];
        t.spd = s[2];
      });

      // стрельба
      if (firing && now - t.lastShot >= t.st.reload) {
        t.lastShot = now;
        t.flash = 6;
        const a = t.angle;
        this.bullets.push({
          x: t.x + Math.cos(a) * t.spr.tipDist,
          y: t.y + Math.sin(a) * t.spr.tipDist,
          vx: Math.cos(a) * t.st.bspeed,
          vy: Math.sin(a) * t.st.bspeed,
          owner: t.i,
          dmg: t.st.dmg,
          life: 140,
          size: t.st.bsize,
        });
        sShoot(t.st.cannon);
      }
      if (t.flash > 0) t.flash -= dt;
    });

    // расталкивание танков (WASM)
    if (this.tanks.length === 2) {
      const [a, b] = this.tanks;
      ex.separateCircles(a.x, a.y, a.st.radius, b.x, b.y, b.st.radius);
      if (s[4] === 1) {
        a.x = s[0];
        a.y = s[1];
        b.x = s[2];
        b.y = s[3];
        a.spd *= 0.6;
        b.spd *= 0.6;
      }
    }

    // пули
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bl = this.bullets[i];
      bl.x += bl.vx * dt;
      bl.y += bl.vy * dt;
      bl.life -= dt;
      let dead = bl.life <= 0 || bl.x < 0 || bl.x > ARENA_W || bl.y < 0 || bl.y > ARENA_H;
      if (!dead) {
        for (const o of this.obstacles) {
          if (ex.circleHit(bl.x, bl.y, o.x, o.y, o.r + bl.size)) {
            dead = true;
            this.sparks(bl.x, bl.y, '#9c8c5a', 5);
            break;
          }
        }
      }
      if (!dead) {
        for (const t of this.tanks) {
          if (t.i !== bl.owner && t.hp > 0 && ex.circleHit(bl.x, bl.y, t.x, t.y, t.st.radius + bl.size)) {
            t.hp -= bl.dmg;
            dead = true;
            sHit();
            this.sparks(bl.x, bl.y, t.st.color, 9);
            if (t.hp <= 0) {
              t.hp = 0;
              this.explode(t);
            }
            break;
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }

    // частицы
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }

    this.cb.onHp(this.hpRatio(0), this.hpRatio(1));
  }

  private sparks(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7;
      const sp = rnd(1, 4);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(10, 26), color, size: rnd(1.5, 3.5) });
    }
  }

  private explode(t: Tank): void {
    this.over = true;
    sBoom();
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * 7;
      const sp = rnd(1, 7);
      this.parts.push({
        x: t.x,
        y: t.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rnd(20, 55),
        color: i % 3 ? '#e8541e' : '#3a352b',
        size: rnd(2, 6),
      });
    }
    const winner = t.i === 0 ? 1 : 0;
    this.winTimeout = setTimeout(() => this.cb.onWin(winner), 900);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.drawImage(this.bg, 0, 0);

    this.bullets.forEach((bl) => {
      ctx.fillStyle = '#27241d';
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, bl.size, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bl.x - bl.vx, bl.y - bl.vy);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
    });

    this.tanks.forEach((t) => {
      if (t.hp <= 0) return;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.strokeStyle = t.ctrl.ring;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, t.st.radius + 7, 0, 7);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.rotate(t.angle);
      ctx.drawImage(t.spr.canvas, -t.spr.pivotX, -t.spr.pivotY);
      if (t.flash > 0) {
        ctx.fillStyle = 'rgba(255,200,60,' + t.flash / 6 + ')';
        ctx.beginPath();
        ctx.arc(t.spr.tipDist - 2, 0, 7, 0, 7);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = t.ctrl.ring;
      ctx.font = 'bold 18px "Permanent Marker", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('P' + (t.i + 1), t.x, t.y - t.st.radius - 12);
    });

    this.parts.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

export function flagGradient(countryId: string): string {
  const c = COUNTRIES[countryId].cols;
  return `linear-gradient(180deg,${c[0]} 33%,${c[1]} 33% 66%,${c[2]} 66%)`;
}
