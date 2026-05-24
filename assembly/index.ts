// ТАНКОБОЙ — ядро физики и расчёта характеристик на WebAssembly (AssemblyScript).
//
// ABI: все функции принимают и возвращают только числа (f64/i32). Функции,
// которым нужно вернуть несколько значений, пишут результат в статический
// "scratch"-буфер в линейной памяти. JS читает его как Float64Array по
// смещению scratchPtr(). Это держит мост JS<->WASM простым и без зависимостей.

// 16 слотов f64 = 128 байт статической памяти под результаты.
const SCRATCH: usize = memory.data(128);

/** Указатель (в байтах) на scratch-буфер результатов. */
export function scratchPtr(): i32 {
  return <i32>SCRATCH;
}

// ----------------------------------------------------------------------------
// РАСЧЁТ ХАРАКТЕРИСТИК ТАНКА
// ----------------------------------------------------------------------------

/** Итоговая броня (очки прочности). */
export function computeHp(
  trackHp: f64,
  turretArmor: f64,
  hullHp: f64,
  countryHpAdd: f64
): f64 {
  return Math.round(100.0 + trackHp + turretArmor + hullHp + countryHpAdd);
}

/** Итоговая скорость. */
export function computeSpeed(
  trackSpeed: f64,
  hullSpeedMul: f64,
  countrySpeedMul: f64
): f64 {
  return trackSpeed * hullSpeedMul * countrySpeedMul;
}

/** Скорость поворота башни/корпуса (радиан за тик). */
export function computeTurn(turretTurn: f64, countryTurnMul: f64): f64 {
  return turretTurn * countryTurnMul;
}

/** Итоговый урон выстрела. */
export function computeDamage(
  cannonDmg: f64,
  countryDmgAdd: f64,
  countryDmgMul: f64
): f64 {
  return Math.round((cannonDmg + countryDmgAdd) * countryDmgMul);
}

/** Перезарядка (мс между выстрелами). */
export function computeReload(cannonReload: f64, countryReloadMul: f64): f64 {
  return cannonReload * countryReloadMul;
}

/** Скорость снаряда. */
export function computeBulletSpeed(
  cannonBspeed: f64,
  countryBspeedMul: f64
): f64 {
  return cannonBspeed * countryBspeedMul;
}

// ----------------------------------------------------------------------------
// КИНЕМАТИКА ТАНКА (один шаг интегрирования)
// Результат пишется в scratch: [0]=x, [1]=y, [2]=angle, [3]=spd
// ----------------------------------------------------------------------------
export function stepTank(
  x: f64,
  y: f64,
  angle: f64,
  spd: f64,
  moveInput: f64, // -1 назад, 0 стоп, 1 вперёд
  turnInput: f64, // -1 влево, 0, 1 вправо
  maxSpeed: f64,
  turnRate: f64,
  dt: f64
): void {
  angle += turnInput * turnRate * dt;
  let target: f64 = 0.0;
  if (moveInput > 0.0) target = maxSpeed;
  else if (moveInput < 0.0) target = -maxSpeed * 0.6;

  spd += (target - spd) * 0.14 * dt;
  if (Math.abs(spd) < 0.01) spd = 0.0;

  x += Math.cos(angle) * spd * dt;
  y += Math.sin(angle) * spd * dt;

  store<f64>(SCRATCH, x);
  store<f64>(SCRATCH + 8, y);
  store<f64>(SCRATCH + 16, angle);
  store<f64>(SCRATCH + 24, spd);
}

/** Зажать танк в прямоугольных границах арены, гася скорость у стен.
 *  scratch: [0]=x, [1]=y, [2]=spd (возможно уменьшенная). */
export function clampToArena(
  x: f64,
  y: f64,
  spd: f64,
  r: f64,
  w: f64,
  h: f64
): void {
  if (x < r) {
    x = r;
    spd *= 0.4;
  }
  if (x > w - r) {
    x = w - r;
    spd *= 0.4;
  }
  if (y < r) {
    y = r;
    spd *= 0.4;
  }
  if (y > h - r) {
    y = h - r;
    spd *= 0.4;
  }
  store<f64>(SCRATCH, x);
  store<f64>(SCRATCH + 8, y);
  store<f64>(SCRATCH + 16, spd);
}

/** Вытолкнуть круг (танк) из другого круга (препятствие).
 *  scratch: [0]=x, [1]=y, [2]=spd, [3]=hit(1/0). */
export function pushOutOfCircle(
  x: f64,
  y: f64,
  spd: f64,
  r: f64,
  ox: f64,
  oy: f64,
  orad: f64
): void {
  const dx = x - ox;
  const dy = y - oy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const minDist = r + orad;
  let hit: f64 = 0.0;
  if (d < minDist && d > 0.0) {
    const push = minDist - d;
    x += (dx / d) * push;
    y += (dy / d) * push;
    spd *= 0.5;
    hit = 1.0;
  }
  store<f64>(SCRATCH, x);
  store<f64>(SCRATCH + 8, y);
  store<f64>(SCRATCH + 16, spd);
  store<f64>(SCRATCH + 24, hit);
}

/** Развести два пересекающихся круга (танк vs танк) поровну.
 *  scratch: [0]=ax, [1]=ay, [2]=bx, [3]=by, [4]=hit(1/0). */
export function separateCircles(
  ax: f64,
  ay: f64,
  ar: f64,
  bx: f64,
  by: f64,
  br: f64
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy);
  const minDist = ar + br;
  let hit: f64 = 0.0;
  if (d < minDist && d > 0.0) {
    const push = (minDist - d) / 2.0;
    const nx = dx / d;
    const ny = dy / d;
    ax -= nx * push;
    ay -= ny * push;
    bx += nx * push;
    by += ny * push;
    hit = 1.0;
  }
  store<f64>(SCRATCH, ax);
  store<f64>(SCRATCH + 8, ay);
  store<f64>(SCRATCH + 16, bx);
  store<f64>(SCRATCH + 24, by);
  store<f64>(SCRATCH + 32, hit);
}

/** Проверка попадания точки (снаряда) в круг. 1 — попал, 0 — нет. */
export function circleHit(
  px: f64,
  py: f64,
  cx: f64,
  cy: f64,
  radius: f64
): i32 {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < radius * radius ? 1 : 0;
}
