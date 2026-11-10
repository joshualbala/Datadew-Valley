/**
 * Small synthesized sound effects (no files needed). Each plays once into
 * `out` starting now. Kept soft so they never compete with the music.
 */
export type SfxName = 'open' | 'close' | 'step' | 'read' | 'cough';

/** Per-play tweaks: loudness (0–1, default 1) and pitch (1 = normal; lower = deeper voice). */
export interface SfxOptions {
  volume?: number;
  pitch?: number;
}

function tone(ctx: AudioContext, out: AudioNode, freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.05);
}

let stepBuffer: AudioBuffer | null = null;
let noiseBuffer: AudioBuffer | null = null;

/** One short "huh" of a cough: a burst of breathy noise plus a low voiced grunt. */
function coughBurst(ctx: AudioContext, out: AudioNode, at: number, pitch: number, vol: number, length: number): void {
  if (!noiseBuffer) {
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900 * pitch;
  band.Q.value = 0.9;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, at);
  ng.gain.linearRampToValueAtTime(vol, at + 0.012);
  ng.gain.exponentialRampToValueAtTime(0.0001, at + length);
  noise.connect(band).connect(ng).connect(out);
  noise.start(at, Math.random() * 0.3);
  noise.stop(at + length + 0.05);

  const voice = ctx.createOscillator();
  voice.type = 'sawtooth';
  voice.frequency.setValueAtTime(170 * pitch, at);
  voice.frequency.exponentialRampToValueAtTime(110 * pitch, at + length);
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 700;
  const vg = ctx.createGain();
  vg.gain.setValueAtTime(0, at);
  vg.gain.linearRampToValueAtTime(vol * 0.35, at + 0.015);
  vg.gain.exponentialRampToValueAtTime(0.0001, at + length * 0.8);
  voice.connect(low).connect(vg).connect(out);
  voice.start(at);
  voice.stop(at + length + 0.05);
}

export function playSfx(ctx: AudioContext, out: AudioNode, name: SfxName, opts: SfxOptions = {}): void {
  const t = ctx.currentTime;
  const volume = opts.volume ?? 1;
  const pitch = opts.pitch ?? 1;
  switch (name) {
    case 'open': // soft rising chime
      tone(ctx, out, 784, t, 0.35, 0.18);
      tone(ctx, out, 1175, t + 0.07, 0.45, 0.14);
      break;
    case 'close': // soft falling chime
      tone(ctx, out, 1047, t, 0.3, 0.14);
      tone(ctx, out, 784, t + 0.06, 0.4, 0.12);
      break;
    case 'read': // little sparkle when a "!" is done
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(ctx, out, f, t + i * 0.06, 0.35, 0.09, 'triangle'));
      break;
    case 'cough': {
      // Two or three dry coughs in a row, each a little weaker.
      const count = 2 + Math.round(Math.random());
      let at = t;
      for (let i = 0; i < count; i++) {
        coughBurst(ctx, out, at, pitch * (1 - i * 0.04), 0.55 * volume * (1 - i * 0.2), 0.16 + Math.random() * 0.05);
        at += 0.24 + Math.random() * 0.08;
      }
      break;
    }
    case 'step': {
      // A short, muffled tap.
      if (!stepBuffer) {
        const len = Math.floor(ctx.sampleRate * 0.05);
        stepBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = stepBuffer.getChannelData(0);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          lp += 0.12 * (Math.random() * 2 - 1 - lp);
          d[i] = lp * Math.pow(1 - i / len, 2);
        }
      }
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = stepBuffer;
      src.playbackRate.value = 0.7 + Math.random() * 0.2; // lower, softer thud
      g.gain.value = 0.1 * volume;
      src.connect(g).connect(out);
      src.start(t);
      break;
    }
  }
}
