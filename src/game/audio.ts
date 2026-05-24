// Мини-синтезатор звуковых эффектов на Web Audio API.

let AC: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(v: boolean): void {
  muted = v;
}

export function isMuted(): boolean {
  return muted;
}

export function initAudio(): void {
  if (AC) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = new Ctor();
    master = AC.createGain();
    master.gain.value = 0.25;
    master.connect(AC.destination);
  } catch {
    AC = null;
  }
}

export function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 1): void {
  if (!AC || !master || muted) return;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(AC.currentTime + dur);
}

export function sShoot(cannon: string): void {
  const f = ({ mg: 520, gun: 300, howitzer: 180 } as Record<string, number>)[cannon] ?? 300;
  blip(f, 0.08, 'square', 0.7);
  blip(f * 1.4, 0.05, 'triangle', 0.4);
}

export function sHit(): void {
  blip(160, 0.07, 'sawtooth', 0.6);
}

export function sBoom(): void {
  if (!AC || muted) return;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => blip(120 - i * 12 + Math.random() * 40, 0.18, 'sawtooth', 0.7), i * 30);
  }
}

export function sClick(): void {
  blip(660, 0.04, 'triangle', 0.5);
}
