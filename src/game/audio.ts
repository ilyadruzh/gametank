// Звук на Web Audio API (без внешних файлов): SFX, гул мотора и фоновая музыка.
// Всё проходит через общий `bus`, который мгновенно глушится при mute.

let AC: AudioContext | null = null;
let bus: GainNode | null = null; // общий выход (mute = 0)
let sfx: GainNode | null = null; // SFX
let musicGain: GainNode | null = null; // музыка
let muted = false;

// гул мотора
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;

// музыка
let musicOn = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let musicStep = 0;

export function setMuted(v: boolean): void {
  muted = v;
  if (bus && AC) bus.gain.setTargetAtTime(v ? 0 : 1, AC.currentTime, 0.02);
}
export function isMuted(): boolean {
  return muted;
}

export function initAudio(): void {
  if (AC) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = new Ctor();
    bus = AC.createGain();
    bus.gain.value = muted ? 0 : 1;
    bus.connect(AC.destination);
    sfx = AC.createGain();
    sfx.gain.value = 0.25;
    sfx.connect(bus);
    musicGain = AC.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(bus);
  } catch {
    AC = null;
  }
}

export function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 1): void {
  if (!AC || !sfx) return;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
  o.connect(g);
  g.connect(sfx);
  o.start();
  o.stop(AC.currentTime + dur);
}

// короткий «шум» (взрывы/огонь/пшик) через буфер белого шума
export function noiseBurst(dur: number, vol = 0.5, hp = 0): void {
  if (!AC || !sfx) return;
  const n = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, n, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const g = AC.createGain();
  g.gain.value = vol;
  let node: AudioNode = src;
  if (hp > 0) {
    const f = AC.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    src.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(sfx);
  src.start();
}

export function sShoot(key: string): void {
  switch (key) {
    case 'flame':
      noiseBurst(0.18, 0.4, 600);
      blip(180, 0.12, 'sawtooth', 0.3);
      return;
    case 'electric':
      blip(1200, 0.06, 'square', 0.5);
      blip(700, 0.1, 'sawtooth', 0.35);
      return;
    case 'fart':
      blip(180, 0.22, 'sawtooth', 0.6);
      blip(120, 0.26, 'square', 0.4);
      noiseBurst(0.12, 0.2, 300);
      return;
    case 'chicken':
      blip(680, 0.05, 'square', 0.5);
      setTimeout(() => blip(560, 0.05, 'square', 0.5), 70);
      setTimeout(() => blip(820, 0.09, 'triangle', 0.5), 150);
      return;
    default: {
      const f = ({ mg: 520, gun: 300, howitzer: 180 } as Record<string, number>)[key] ?? 300;
      blip(f, 0.08, 'square', 0.7);
      blip(f * 1.4, 0.05, 'triangle', 0.4);
    }
  }
}

export function sHit(): void {
  blip(140 + Math.random() * 60, 0.07, 'sawtooth', 0.6);
}

export function sBoom(): void {
  if (!AC) return;
  noiseBurst(0.4, 0.7, 120);
  for (let i = 0; i < 5; i++) setTimeout(() => blip(120 - i * 12 + Math.random() * 40, 0.18, 'sawtooth', 0.6), i * 35);
}

export function sMine(): void {
  if (!AC) return;
  blip(900, 0.05, 'square', 0.5); // бип
  setTimeout(() => {
    noiseBurst(0.45, 0.8, 90);
    blip(90, 0.3, 'sawtooth', 0.6);
  }, 90);
}

export function sWin(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.6), i * 130));
}

export function sClick(): void {
  blip(660, 0.04, 'triangle', 0.5);
}

// ---------- ГУЛ МОТОРА ----------
function ensureEngine(): void {
  if (!AC || !sfx || engineOsc) return;
  engineOsc = AC.createOscillator();
  engineGain = AC.createGain();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineGain.gain.value = 0;
  engineOsc.connect(engineGain);
  engineGain.connect(sfx);
  engineOsc.start();
}

export function startEngineHum(): void {
  ensureEngine();
}

export function setEngineLevel(level: number): void {
  if (!AC || !engineOsc || !engineGain) return;
  const l = Math.max(0, Math.min(1, level));
  engineGain.gain.setTargetAtTime(l * 0.12, AC.currentTime, 0.08);
  engineOsc.frequency.setTargetAtTime(48 + l * 36, AC.currentTime, 0.08);
}

export function stopEngineHum(): void {
  if (engineGain && AC) engineGain.gain.setTargetAtTime(0, AC.currentTime, 0.05);
}

// ---------- МУЗЫКА ----------
// Простой зацикленный паттерн (бас + редкая мелодия) на синтезаторе.
const BASS = [110, 110, 146.8, 98];
const MEL = [440, 0, 523, 0, 587, 523, 440, 0];

function musicTick(): void {
  if (!AC || !musicGain || muted || !musicOn) return;
  const t = AC.currentTime;
  const bass = BASS[Math.floor(musicStep / 2) % BASS.length];
  playMusicNote(bass, 0.22, 'triangle', 0.5, t);
  const mel = MEL[musicStep % MEL.length];
  if (mel > 0) playMusicNote(mel, 0.16, 'square', 0.28, t);
  musicStep++;
}

function playMusicNote(freq: number, dur: number, type: OscillatorType, vol: number, t: number): void {
  if (!AC || !musicGain) return;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + dur);
}

export function setMusicOn(on: boolean): void {
  musicOn = on;
  if (on) {
    if (!AC || musicTimer) return;
    musicStep = 0;
    musicTimer = setInterval(musicTick, 240);
  } else if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
