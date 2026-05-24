// Боевой движок: симуляция на 2D-канвасе. Вся кинематика и столкновения
// считаются в WASM-ядре (physics.wasm) — JS только читает результаты из scratch
// и рисует кадр.
import { sBoom, setEngineLevel, sHit, sMine, sShoot, startEngineHum, stopEngineHum } from './audio';
import { COUNTRIES } from './parts';
import { rnd, sketchCircle, sketchLine, sketchRect } from './sketch';
import { buildSprite, type TankSprite } from './sprite';
import { computeStats } from './stats';
import type { CannonKind, Difficulty, PlayerConfig, TankStats, Theme } from './types';
import type { ObjectiveKind } from './missions';
import type { PhysicsModule } from '../wasm/loader';

// Размер канваса (вьюпорт рендера) и размеры большого мира.
export const ARENA_W = 1280;
export const ARENA_H = 800;
export const WORLD_W = 3600;
export const WORLD_H = 2400;
export const MAX_SEP = 760; // макс. расстояние между танками (тезер)

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type BattleMode = 'versus' | 'bot' | 'campaign';

export interface BattleObjective {
  kind: ObjectiveKind;
  duration?: number; // секунды (для 'survive')
}

const MINE_DAMAGE = 40;

const DIFF_PARAMS: Record<Difficulty, { tol: number; react: number; fireGate: number; band: [number, number]; orbit: number }> = {
  easy: { tol: 0.3, react: 0.45, fireGate: 0.6, band: [120, 210], orbit: 0.2 },
  normal: { tol: 0.18, react: 0.75, fireGate: 0.85, band: [150, 250], orbit: 0.55 },
  hard: { tol: 0.11, react: 1.0, fireGate: 1.0, band: [180, 300], orbit: 0.85 },
};

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
  // состояние ИИ
  botStrafe: number;
  botStrafeUntil: number;
  botAimErr: number;
  // «стволность» — сколько снарядов веером за выстрел (цифры 1..9)
  shotCount: number;
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
  kind: CannonKind;
  bounces: number;
  push: number;
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
  destructible: boolean;
  hp: number;
  maxHp: number;
  sprite: HTMLCanvasElement;
}

interface Mine {
  x: number;
  y: number;
  r: number;
  triggerR: number;
  armed: boolean;
}

export interface BattleCallbacks {
  onHp: (hp1: number, hp2: number) => void;
  onWin: (winnerIndex: number) => void;
  onTimer?: (secondsLeft: number) => void;
  onBurst?: (burst1: number, burst2: number) => void;
}

export interface BattleOptions {
  difficulty?: Difficulty;
  objective?: BattleObjective;
  theme?: Theme;
  seed?: number;
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
  private mines: Mine[] = [];
  private renderEnabled = true;
  private cam: Camera = { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1 };

  private canvas: HTMLCanvasElement;
  private keys: Record<string, boolean> = {};
  private mouse = { x: WORLD_W / 2, y: WORLD_H / 2 };
  private mouseDown = false;
  private running = false;
  private over = false;
  private last = 0;
  private rafId = 0;
  private winTimeout: ReturnType<typeof setTimeout> | null = null;

  private difficulty: Difficulty;
  private objective?: BattleObjective;
  private theme: Theme;
  private startTime = 0;
  private lastTimerShown = -1;

  constructor(
    canvas: HTMLCanvasElement,
    configs: [PlayerConfig, PlayerConfig],
    mode: BattleMode,
    phys: PhysicsModule,
    cb: BattleCallbacks,
    opts: BattleOptions = {}
  ) {
    canvas.width = ARENA_W;
    canvas.height = ARENA_H;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.phys = phys;
    this.scratch = phys.scratch;
    this.mode = mode;
    this.cb = cb;
    this.difficulty = opts.difficulty ?? 'normal';
    this.objective = opts.objective;
    this.theme = opts.theme ?? 'day';

    this.generateWorld(opts.seed ?? (Math.random() * 1e9) | 0);
    this.tanks = configs.map((cfg, i) => this.makeTank(cfg, i));
    this.cam = computeCamera(this.tanks, ARENA_W, ARENA_H);
  }

  setRenderEnabled(on: boolean): void {
    this.renderEnabled = on;
  }

  /** Снимок состояния для внешнего рендера (3D-режим). Только числа. */
  snapshot() {
    return {
      over: this.over,
      tanks: this.tanks.map((t) => ({ i: t.i, x: t.x, y: t.y, angle: t.angle, hp: t.hp, maxHp: t.maxHp, flash: t.flash })),
      bullets: this.bullets.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, size: b.size, kind: b.kind })),
      obstacles: this.obstacles.map((o) => ({ x: o.x, y: o.y, r: o.r, type: o.type, hp: o.hp, maxHp: o.maxHp })),
      mines: this.mines.map((m) => ({ x: m.x, y: m.y, r: m.r, armed: m.armed })),
      particles: this.parts.map((p) => ({ x: p.x, y: p.y, size: p.size, color: p.color, life: p.life })),
    };
  }

  private aiControlled(t: Tank): boolean {
    return (this.mode === 'bot' || this.mode === 'campaign') && t.i === 1;
  }

  private obstacleSprite(type: 'box' | 'rock', r: number, damage: number): HTMLCanvasElement {
    const pad = 8;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(r * 2 + pad * 2);
    const c = cv.getContext('2d')!;
    const cx = cv.width / 2;
    const cy = cv.height / 2;
    if (type === 'box') {
      sketchRect(c, cx - r, cy - r, r * 2, r * 2, { fill: '#cdb37e', color: '#27241d', w: 2.4, r: 4 });
      sketchLine(c, cx - r, cy - r, cx + r, cy + r, { color: '#8a7444', w: 1.6, passes: 1 });
      sketchLine(c, cx + r, cy - r, cx - r, cy + r, { color: '#8a7444', w: 1.6, passes: 1 });
    } else {
      sketchCircle(c, cx, cy, r, { fill: '#b9b2a3', color: '#27241d', w: 2.4 });
      sketchLine(c, cx - r * 0.4, cy - r * 0.2, cx + r * 0.3, cy + r * 0.3, { color: '#7d776b', w: 1.4, passes: 1 });
    }
    // трещины при повреждении
    if (damage >= 1) {
      sketchLine(c, cx - r * 0.5, cy - r * 0.6, cx + r * 0.1, cy + r * 0.2, { color: '#5a4a2a', w: 1.6, passes: 1 });
    }
    if (damage >= 2) {
      sketchLine(c, cx + r * 0.4, cy - r * 0.4, cx - r * 0.2, cy + r * 0.6, { color: '#5a4a2a', w: 1.6, passes: 1 });
    }
    return cv;
  }

  private makeTank(cfg: PlayerConfig, i: number): Tank {
    const st = computeStats(cfg);
    const spr = buildSprite(st);
    return {
      i,
      cfg,
      st,
      spr,
      x: WORLD_W / 2 + (i === 0 ? -280 : 280),
      y: WORLD_H / 2,
      angle: i === 0 ? 0 : Math.PI,
      spd: 0,
      hp: st.maxHp,
      maxHp: st.maxHp,
      lastShot: 0,
      ctrl: i === 0 ? P1_CONTROLS : P2_CONTROLS,
      flash: 0,
      botStrafe: Math.random() < 0.5 ? 1 : -1,
      botStrafeUntil: 0,
      botAimErr: 0,
      shotCount: 1,
    };
  }

  private fireShot(t: Tank): void {
    const offsets = fanAngles(t.shotCount, 0.14 * (t.shotCount - 1));
    for (const off of offsets) this.spawnBullet(t, t.angle + off);
  }

  private spawnBullet(t: Tank, angle: number): void {
    this.bullets.push({
      x: t.x + Math.cos(angle) * t.spr.tipDist,
      y: t.y + Math.sin(angle) * t.spr.tipDist,
      vx: Math.cos(angle) * t.st.bspeed,
      vy: Math.sin(angle) * t.st.bspeed,
      owner: t.i,
      dmg: t.st.dmg,
      life: t.st.blife,
      size: t.st.bsize,
      kind: t.st.cannonKind,
      bounces: t.st.bounces,
      push: t.st.push,
    });
  }

  // Процедурная генерация мира: сеяный PRNG раскидывает препятствия и мины,
  // оставляя центральную полосу свободной для спавна танков.
  private generateWorld(seed: number): void {
    let s = seed >>> 0;
    const rng = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const cx = WORLD_W / 2;
    const cy = WORLD_H / 2;
    const farFromSpawn = (x: number, y: number) => Math.hypot(x - cx, y - cy) > 200;

    this.obstacles = [];
    const N = 52;
    let guard = 0;
    while (this.obstacles.length < N && guard++ < N * 8) {
      const x = 120 + rng() * (WORLD_W - 240);
      const y = 120 + rng() * (WORLD_H - 240);
      if (!farFromSpawn(x, y)) continue;
      if (this.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < 120)) continue;
      const isBox = rng() < 0.6;
      const r = isBox ? 28 : 26;
      this.obstacles.push({
        x,
        y,
        r,
        type: isBox ? 'box' : 'rock',
        destructible: isBox,
        hp: isBox ? 30 : 0,
        maxHp: isBox ? 30 : 0,
        sprite: this.obstacleSprite(isBox ? 'box' : 'rock', r, 0),
      });
    }

    this.mines = [];
    const M = 14;
    guard = 0;
    while (this.mines.length < M && guard++ < M * 10) {
      const x = 160 + rng() * (WORLD_W - 320);
      const y = 160 + rng() * (WORLD_H - 320);
      if (!farFromSpawn(x, y)) continue;
      if (this.obstacles.some((o) => Math.hypot(o.x - x, o.y - y) < 60)) continue;
      this.mines.push({ x, y, r: 9, triggerR: 26, armed: true });
    }
  }

  // Земля рисуется процедурно в видимой области (поддержка большого мира).
  private drawGround(ctx: CanvasRenderingContext2D, view: { x0: number; y0: number; x1: number; y1: number }): void {
    const night = this.theme === 'night';
    ctx.fillStyle = night ? '#10151c' : '#f3ead2';
    ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    // сетка-«каракули»
    ctx.strokeStyle = night ? '#27344a' : '#d9cdb2';
    ctx.lineWidth = 2;
    const grid = 220;
    const gx0 = Math.floor(view.x0 / grid) * grid;
    const gy0 = Math.floor(view.y0 / grid) * grid;
    ctx.beginPath();
    for (let x = gx0; x < view.x1; x += grid) {
      ctx.moveTo(x, view.y0);
      ctx.lineTo(x, view.y1);
    }
    for (let y = gy0; y < view.y1; y += grid) {
      ctx.moveTo(view.x0, y);
      ctx.lineTo(view.x1, y);
    }
    ctx.stroke();
    // граница мира
    ctx.strokeStyle = night ? '#3a4a63' : '#b9802b';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.over = false;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    startEngineHum();
    this.cb.onHp(this.hpRatio(0), this.hpRatio(1));
    this.last = performance.now();
    this.startTime = this.last;
    if (this.objective?.kind === 'survive' && this.objective.duration) {
      this.cb.onTimer?.(this.objective.duration);
      this.lastTimerShown = this.objective.duration;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.running = false;
    stopEngineHum();
    cancelAnimationFrame(this.rafId);
    if (this.winTimeout) clearTimeout(this.winTimeout);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // экранные CSS-пиксели -> внутренние пиксели вьюпорта -> мировые координаты
    const px = ((e.clientX - rect.left) / rect.width) * ARENA_W;
    const py = ((e.clientY - rect.top) / rect.height) * ARENA_H;
    this.mouse.x = (px - ARENA_W / 2) / this.cam.zoom + this.cam.x;
    this.mouse.y = (py - ARENA_H / 2) / this.cam.zoom + this.cam.y;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = true;
      e.preventDefault();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }
    this.setBurstFromKey(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  // Цифры задают «стволность»: P1 — Digit1..9, P2 — Numpad1..9.
  private setBurstFromKey(code: string): void {
    const m1 = /^Digit([1-9])$/.exec(code);
    if (m1 && this.tanks[0]) this.tanks[0].shotCount = +m1[1];
    const m2 = /^Numpad([1-9])$/.exec(code);
    if (m2 && this.tanks[1]) this.tanks[1].shotCount = +m2[1];
    if (m1 || m2) this.cb.onBurst?.(this.tanks[0].shotCount, this.tanks[1].shotCount);
  }

  private hpRatio(i: number): number {
    const t = this.tanks[i];
    return (t.hp / t.maxHp) * 100;
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(2.4, (now - this.last) / 16.67);
    this.last = now;
    if (!this.over) this.update(dt, now);
    if (this.renderEnabled) this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // Ввод бота: наводится с поправкой на сложность, держит дистанцию под свою
  // пушку и «орбитит» вокруг цели, чтобы сложнее было попасть.
  private botInput(bot: Tank, target: Tank, now: number, dt: number): { move: number; turn: number; fire: boolean } {
    const p = DIFF_PARAMS[this.difficulty];
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const dist = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);

    // ошибка прицела: периодически подмешиваем промах, который затухает
    if (now > bot.botStrafeUntil) {
      bot.botStrafe = Math.random() < 0.5 ? 1 : -1;
      bot.botStrafeUntil = now + 700 + Math.random() * 900;
      bot.botAimErr = (Math.random() - 0.5) * (1 - p.react) * 0.8;
    }
    bot.botAimErr *= Math.max(0, 1 - 0.05 * dt);

    let diff = desired - bot.angle + bot.botAimErr;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    let turn = Math.abs(diff) < p.tol ? 0 : diff > 0 ? 1 : -1;

    let move: number;
    if (dist > p.band[1]) move = 1;
    else if (dist < p.band[0]) move = -1;
    else {
      // в зоне боя — кружим вокруг цели
      if (Math.random() < p.orbit) {
        move = 1;
        if (turn === 0) turn = bot.botStrafe; // довернуть для дуги облёта
      } else {
        move = 0;
      }
    }

    const fire = Math.abs(diff) < p.tol && Math.random() < p.fireGate;
    return { move, turn, fire };
  }

  // Управление мышью: танк поворачивается к курсору, едет к нему, ЛКМ — огонь.
  private mouseInput(t: Tank): { move: number; turn: number; fire: boolean } {
    const dx = this.mouse.x - t.x;
    const dy = this.mouse.y - t.y;
    const dist = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);
    let diff = desired - t.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.abs(diff) < 0.04 ? 0 : diff > 0 ? 1 : -1;
    const move = dist > t.st.radius + 18 ? 1 : 0;
    return { move, turn, fire: this.mouseDown };
  }

  private update(dt: number, now: number): void {
    const ex = this.phys.exports;
    const s = this.scratch;

    this.tanks.forEach((t) => {
      let move: number;
      let turn: number;
      let firing: boolean;

      if (this.aiControlled(t)) {
        const bi = this.botInput(t, this.tanks[0], now, dt);
        move = bi.move;
        turn = bi.turn;
        firing = bi.fire;
      } else if (t.cfg.control === 'mouse') {
        const mi = this.mouseInput(t);
        move = mi.move;
        turn = mi.turn;
        firing = mi.fire;
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
      ex.clampToArena(t.x, t.y, t.spd, t.st.radius, WORLD_W, WORLD_H);
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
        this.fireShot(t);
        sShoot(t.st.cannonKind === 'normal' ? t.st.cannon : t.st.cannonKind);
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
      // тезер: не даём танкам разъехаться дальше экрана
      const [ax, ay, bx, by] = applyTether(a.x, a.y, b.x, b.y, MAX_SEP);
      a.x = ax;
      a.y = ay;
      b.x = bx;
      b.y = by;
    }

    // мины-ловушки: взрываются под любым проехавшим танком
    for (let mi = this.mines.length - 1; mi >= 0; mi--) {
      const m = this.mines[mi];
      const victim = this.tanks.find((t) => t.hp > 0 && mineTriggered(m, t.x, t.y, t.st.radius));
      if (victim) {
        victim.hp -= MINE_DAMAGE;
        const dx = victim.x - m.x;
        const dy = victim.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        victim.x += (dx / d) * 14;
        victim.y += (dy / d) * 14;
        victim.spd *= 0.4;
        this.sparks(m.x, m.y, '#e8541e', 18);
        sMine();
        this.mines.splice(mi, 1);
        if (victim.hp <= 0) {
          victim.hp = 0;
          this.explode(victim);
        }
      }
    }

    // пули
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bl = this.bullets[i];
      bl.x += bl.vx * dt;
      bl.y += bl.vy * dt;
      bl.life -= dt;

      // поведение в полёте по типу пушки
      if (bl.kind === 'fart') bl.size = Math.min(bl.size + 0.18 * dt, 18);
      else if (bl.kind === 'flame' && Math.random() < 0.6) {
        this.parts.push({
          x: bl.x,
          y: bl.y,
          vx: rnd(-0.6, 0.6),
          vy: rnd(-0.6, 0.6),
          life: rnd(6, 14),
          color: Math.random() < 0.5 ? '#ffce4a' : '#e8541e',
          size: rnd(2, 4),
        });
      }

      // границы арены: курица отскакивает, остальные гибнут
      const outX = bl.x < 0 || bl.x > WORLD_W;
      const outY = bl.y < 0 || bl.y > WORLD_H;
      if (outX || outY) {
        if (bl.kind === 'chicken' && bl.bounces > 0) {
          if (outX) bl.vx = -bl.vx;
          if (outY) bl.vy = -bl.vy;
          bl.x = Math.max(0, Math.min(WORLD_W, bl.x));
          bl.y = Math.max(0, Math.min(WORLD_H, bl.y));
          bl.bounces--;
        } else {
          this.bullets.splice(i, 1);
          continue;
        }
      }
      if (bl.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      let dead = false;
      for (let oi = 0; oi < this.obstacles.length; oi++) {
        const o = this.obstacles[oi];
        if (ex.circleHit(bl.x, bl.y, o.x, o.y, o.r + bl.size)) {
          // урон по разрушаемым ящикам
          if (o.destructible) {
            o.hp -= bl.dmg;
            this.sparks(bl.x, bl.y, '#b08a4a', 5);
            if (o.hp <= 0) {
              this.crackParticles(o);
              this.obstacles.splice(oi, 1);
            } else {
              const dmgStage = o.hp <= o.maxHp * 0.25 ? 2 : o.hp <= o.maxHp * 0.5 ? 1 : 0;
              o.sprite = this.obstacleSprite(o.type, o.r, dmgStage);
            }
          }
          if (bl.kind === 'chicken' && bl.bounces > 0) {
            const nx = bl.x - o.x;
            const ny = bl.y - o.y;
            const d = Math.hypot(nx, ny) || 1;
            const ux = nx / d;
            const uy = ny / d;
            const dot = bl.vx * ux + bl.vy * uy;
            bl.vx -= 2 * dot * ux;
            bl.vy -= 2 * dot * uy;
            const out = o.r + bl.size - d;
            bl.x += ux * out;
            bl.y += uy * out;
            bl.bounces--;
            this.sparks(bl.x, bl.y, '#caa15a', 3);
          } else {
            dead = true;
            if (!o.destructible) this.sparks(bl.x, bl.y, '#9c8c5a', 5);
          }
          break;
        }
      }

      if (!dead) {
        for (const t of this.tanks) {
          if (t.i !== bl.owner && t.hp > 0 && ex.circleHit(bl.x, bl.y, t.x, t.y, t.st.radius + bl.size)) {
            t.hp -= bl.dmg;
            dead = true;
            sHit();
            this.sparks(bl.x, bl.y, t.st.color, 9);
            if (bl.push > 0) {
              const dx = t.x - bl.x;
              const dy = t.y - bl.y;
              const d = Math.hypot(dx, dy) || 1;
              t.x += (dx / d) * bl.push;
              t.y += (dy / d) * bl.push;
              t.spd *= 0.5;
            }
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

    // цель «продержаться»: обратный отсчёт, по нулю — победа игрока
    if (!this.over && this.objective?.kind === 'survive' && this.objective.duration) {
      const left = Math.max(0, this.objective.duration - (now - this.startTime) / 1000);
      const shown = Math.ceil(left);
      if (shown !== this.lastTimerShown) {
        this.lastTimerShown = shown;
        this.cb.onTimer?.(shown);
      }
      if (left <= 0) {
        this.over = true;
        this.winTimeout = setTimeout(() => this.cb.onWin(0), 300);
      }
    }

    // гул мотора по суммарной скорости танков
    let lvl = 0;
    for (const t of this.tanks) if (t.hp > 0) lvl = Math.max(lvl, Math.abs(t.spd) / 3);
    setEngineLevel(lvl);

    this.cb.onHp(this.hpRatio(0), this.hpRatio(1));
  }

  private sparks(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7;
      const sp = rnd(1, 4);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(10, 26), color, size: rnd(1.5, 3.5) });
    }
  }

  private crackParticles(o: Obstacle): void {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * 7;
      const sp = rnd(1, 5);
      this.parts.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rnd(14, 32),
        color: i % 2 ? '#cdb37e' : '#8a7444',
        size: rnd(2, 4.5),
      });
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
    const night = this.theme === 'night';

    // камера следит за обоими танками
    this.cam = computeCamera(
      this.tanks.filter((t) => t.hp > 0).map((t) => ({ x: t.x, y: t.y })),
      ARENA_W,
      ARENA_H
    );
    const z = this.cam.zoom;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ARENA_W, ARENA_H);
    ctx.save();
    ctx.translate(ARENA_W / 2, ARENA_H / 2);
    ctx.scale(z, z);
    ctx.translate(-this.cam.x, -this.cam.y);

    // видимый прямоугольник мира
    const view = {
      x0: this.cam.x - ARENA_W / 2 / z,
      y0: this.cam.y - ARENA_H / 2 / z,
      x1: this.cam.x + ARENA_W / 2 / z,
      y1: this.cam.y + ARENA_H / 2 / z,
    };
    this.drawGround(ctx, view);

    // препятствия (разрушаемые ящики и камни)
    this.obstacles.forEach((o) => {
      ctx.drawImage(o.sprite, o.x - o.sprite.width / 2, o.y - o.sprite.height / 2);
    });

    // мины
    this.mines.forEach((m) => this.drawMine(ctx, m));

    this.bullets.forEach((bl) => this.drawBullet(ctx, bl, night));

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
        if (night) {
          ctx.shadowColor = '#ffd36b';
          ctx.shadowBlur = 16;
        }
        ctx.fillStyle = 'rgba(255,200,60,' + t.flash / 6 + ')';
        ctx.beginPath();
        ctx.arc(t.spr.tipDist - 2, 0, 7, 0, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.fillStyle = t.ctrl.ring;
      ctx.font = 'bold 18px "Permanent Marker", cursive';
      ctx.textAlign = 'center';
      ctx.fillText('P' + (t.i + 1), t.x, t.y - t.st.radius - 12);
    });

    if (night) {
      ctx.shadowColor = 'rgba(255,180,80,.9)';
      ctx.shadowBlur = 8;
    }
    this.parts.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawBullet(ctx: CanvasRenderingContext2D, bl: Bullet, night: boolean): void {
    switch (bl.kind) {
      case 'flame':
        return this.drawFlame(ctx, bl);
      case 'electric':
        return this.drawElectric(ctx, bl);
      case 'fart':
        return this.drawFart(ctx, bl);
      case 'chicken':
        return this.drawChicken(ctx, bl);
      default:
        return this.drawNormalBullet(ctx, bl, night);
    }
  }

  private drawMine(ctx: CanvasRenderingContext2D, m: Mine): void {
    ctx.save();
    // «рожки»
    ctx.strokeStyle = '#27241d';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r);
      ctx.lineTo(m.x + Math.cos(a) * (m.r + 4), m.y + Math.sin(a) * (m.r + 4));
      ctx.stroke();
    }
    ctx.fillStyle = '#3a352b';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#1c1a14';
    ctx.stroke();
    // мигающий красный огонёк
    if (this.last % 700 < 380) {
      ctx.fillStyle = '#ff3b30';
      ctx.shadowColor = '#ff3b30';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.6, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  private drawNormalBullet(ctx: CanvasRenderingContext2D, bl: Bullet, night: boolean): void {
    ctx.fillStyle = night ? '#ffe9b0' : '#27241d';
    if (night) {
      ctx.shadowColor = '#ffd36b';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, bl.size, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = night ? 'rgba(255,220,150,.4)' : 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bl.x - bl.vx, bl.y - bl.vy);
    ctx.lineTo(bl.x, bl.y);
    ctx.stroke();
  }

  private drawFlame(ctx: CanvasRenderingContext2D, bl: Bullet): void {
    const r = bl.size * (0.8 + Math.random() * 0.7);
    ctx.save();
    ctx.shadowColor = '#ff7b1a';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, r, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(231,84,30,.75)';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, r * 0.6, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  private drawElectric(ctx: CanvasRenderingContext2D, bl: Bullet): void {
    ctx.save();
    ctx.shadowColor = '#9fe3ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#cfefff';
    ctx.lineWidth = 2.4;
    const sx = bl.x - bl.vx * 1.8;
    const sy = bl.y - bl.vy * 1.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const steps = 4;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const jx = (Math.random() - 0.5) * 6;
      const jy = (Math.random() - 0.5) * 6;
      ctx.lineTo(sx + (bl.x - sx) * t + jx, sy + (bl.y - sy) * t + jy);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, bl.size, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  private drawFart(ctx: CanvasRenderingContext2D, bl: Bullet): void {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#9bc24a';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, bl.size, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#c7e08a';
    ctx.beginPath();
    ctx.arc(bl.x - bl.vx * 0.4, bl.y - bl.vy * 0.4, bl.size * 0.7, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  private drawChicken(ctx: CanvasRenderingContext2D, bl: Bullet): void {
    const s = bl.size;
    ctx.save();
    ctx.translate(bl.x, bl.y);
    ctx.rotate(Math.atan2(bl.vy, bl.vx));
    ctx.fillStyle = '#fdfdf5';
    ctx.strokeStyle = '#27241d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.3, s, 0, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8941e'; // клюв
    ctx.beginPath();
    ctx.moveTo(s * 1.2, -2);
    ctx.lineTo(s * 1.95, 0);
    ctx.lineTo(s * 1.2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c0392b'; // гребешок
    ctx.beginPath();
    ctx.arc(s * 0.6, -s * 0.95, 2, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#27241d'; // глаз
    ctx.beginPath();
    ctx.arc(s * 0.75, -s * 0.2, 1.3, 0, 7);
    ctx.fill();
    ctx.restore();
  }
}

export function flagGradient(countryId: string): string {
  const c = COUNTRIES[countryId].cols;
  return `linear-gradient(180deg,${c[0]} 33%,${c[1]} 33% 66%,${c[2]} 66%)`;
}

/** Камера, вписывающая обе точки в вьюпорт vw×vh (мировые координаты). */
export function computeCamera(
  pts: { x: number; y: number }[],
  vw: number,
  vh: number,
  minZoom = 0.5,
  maxZoom = 1.1,
  pad = 260
): Camera {
  if (pts.length === 0) return { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const spanX = maxX - minX + pad * 2;
  const spanY = maxY - minY + pad * 2;
  const zoom = Math.max(minZoom, Math.min(maxZoom, Math.min(vw / spanX, vh / spanY)));
  return { x: cx, y: cy, zoom };
}

/** Подтянуть две точки к их середине, если они дальше maxSep.
 *  scratch-like возврат: [ax, ay, bx, by]. */
export function applyTether(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  maxSep: number
): [number, number, number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d <= maxSep || d === 0) return [ax, ay, bx, by];
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const half = maxSep / 2;
  const ux = dx / d;
  const uy = dy / d;
  return [mx - ux * half, my - uy * half, mx + ux * half, my + uy * half];
}

/** Сработала ли мина под танком с центром (tx,ty) и радиусом tr. */
export function mineTriggered(
  mine: { x: number; y: number; triggerR: number; armed: boolean },
  tx: number,
  ty: number,
  tr: number
): boolean {
  if (!mine.armed) return false;
  return Math.hypot(tx - mine.x, ty - mine.y) < mine.triggerR + tr;
}

/** Смещения углов для веера из `count` снарядов, симметрично относительно 0,
 *  с общим раствором `totalSpread` радиан. count=1 -> [0]. */
export function fanAngles(count: number, totalSpread: number): number[] {
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  if (n === 1) return [0];
  const step = totalSpread / (n - 1);
  const start = -totalSpread / 2;
  return Array.from({ length: n }, (_, i) => start + step * i);
}
