import type { Instrument, Song } from './songs/types';

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440, "Bb3" → 233.08, "F#5" → 739.99 */
export function pitchToFreq(pitch: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(pitch);
  if (!m) throw new Error(`Bad pitch "${pitch}"`);
  const semis = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}

/** Something that can play music into the audio graph and be faded out. */
export interface MusicPlayer {
  start(): void;
  stop(fadeSeconds: number): void;
}

function makeReverb(ctx: AudioContext, seconds = 2.8): ConvolverNode {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

/**
 * Plays a Song (see songs/) with a few soft Web Audio instruments,
 * looping forever until stop() is called.
 */
export class SynthPlayer implements MusicPlayer {
  private out: GainNode;
  private dry: GainNode;
  private reverbSend: GainNode;
  private delaySend: GainNode;
  private sources = new Set<AudioScheduledSourceNode>();
  private timer: number | undefined;
  private nextLoopAt = 0;
  private stopped = false;
  private targetVolume: number;

  constructor(
    private ctx: AudioContext,
    destination: AudioNode,
    private song: Song,
    volume: number,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);
    this.targetVolume = volume;

    this.dry = ctx.createGain();
    this.dry.connect(this.out);

    const reverb = makeReverb(ctx);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = song.reverb ?? 0.55;
    reverb.connect(reverbReturn).connect(this.out);
    this.reverbSend = ctx.createGain();
    this.reverbSend.connect(reverb);

    // Soft echo for the lead melody (dotted-eighth feel).
    const delay = ctx.createDelay(2);
    delay.delayTime.value = (60 / song.bpm) * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    delay.connect(tone).connect(feedback).connect(delay);
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.35;
    tone.connect(delayReturn).connect(this.reverbSend);
    delayReturn.connect(this.out);
    this.delaySend = ctx.createGain();
    this.delaySend.connect(delay);
  }

  start(): void {
    const now = this.ctx.currentTime;
    this.out.gain.setValueAtTime(0, now);
    this.out.gain.linearRampToValueAtTime(this.targetVolume, now + 2.5);
    this.nextLoopAt = now + 0.15;
    this.scheduleLoop();
    // Schedule the next loop a little before the current one ends.
    this.timer = window.setInterval(() => {
      if (!this.stopped && this.ctx.currentTime > this.nextLoopAt - 3) this.scheduleLoop();
    }, 250);
  }

  stop(fadeSeconds: number): void {
    if (this.stopped) return;
    this.stopped = true;
    window.clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    window.setTimeout(
      () => {
        for (const s of this.sources) {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        }
        this.sources.clear();
        this.out.disconnect();
      },
      fadeSeconds * 1000 + 100,
    );
  }

  private scheduleLoop(): void {
    const start = this.nextLoopAt;
    const spb = 60 / this.song.bpm;
    const swing = (this.song.swing ?? 0.5) - 0.5;
    for (const track of this.song.tracks) {
      for (const [pitch, beat, beats] of track.notes) {
        // Swing: push off-beat eighths ("and"s) a little later.
        const offbeat = Math.abs((beat % 1) - 0.5) < 1e-6;
        const at = beat + (offbeat ? swing : 0);
        this.voice(track.instrument, pitchToFreq(pitch), start + at * spb, beats * spb, track.volume);
      }
    }
    this.nextLoopAt = start + this.song.lengthBeats * spb;
  }

  private track(node: AudioScheduledSourceNode, stopAt: number): void {
    node.stop(stopAt);
    this.sources.add(node);
    node.onended = () => this.sources.delete(node);
  }

  private osc(type: OscillatorType, freq: number, t: number, stopAt: number, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.start(t);
    this.track(o, stopAt);
    return o;
  }

  private noiseBuffer: AudioBuffer | null = null;

  private noise(t: number, stopAt: number): AudioBufferSourceNode {
    if (!this.noiseBuffer) {
      const len = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.start(t);
    this.track(src, stopAt);
    return src;
  }

  /** A short decaying sine partial into `dest` (used by mallet-type instruments). */
  private partial(freq: number, t: number, gain: number, decay: number, dest: AudioNode): void {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    this.osc('sine', freq, t, t + decay + 0.05)
      .connect(g)
      .connect(dest);
  }

  private voice(inst: Instrument, freq: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);

    switch (inst) {
      case 'pad': {
        // Warm, slow-swelling chord pad.
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1100;
        const end = t + dur + 1.6;
        for (const d of [-7, 7]) this.osc('triangle', freq, t, end, d).connect(filter);
        filter.connect(env);
        env.gain.linearRampToValueAtTime(vol, t + Math.min(1.2, dur / 2));
        env.gain.setValueAtTime(vol, t + dur);
        env.gain.linearRampToValueAtTime(0, t + dur + 1.5);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        break;
      }
      case 'lead': {
        // Breathy ocarina-like tone with gentle, delayed vibrato.
        const end = t + dur + 0.8;
        const main = this.osc('sine', freq, t, end);
        const body = this.osc('triangle', freq, t, end);
        const bodyGain = ctx.createGain();
        bodyGain.gain.value = 0.3;
        body.connect(bodyGain).connect(env);
        main.connect(env);
        const lfo = this.osc('sine', 5.2, t, end);
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(0.5, dur));
        lfo.connect(depth);
        depth.connect(main.frequency);
        depth.connect(body.frequency);
        env.gain.linearRampToValueAtTime(vol, t + 0.06);
        env.gain.linearRampToValueAtTime(vol * 0.75, t + 0.35);
        env.gain.setValueAtTime(vol * 0.75, t + dur);
        env.gain.setTargetAtTime(0, t + dur, 0.12);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        env.connect(this.delaySend);
        break;
      }
      case 'bell': {
        // Music-box pluck: a few sine partials with a fast decay.
        const end = t + 2;
        const partials: [number, number][] = [
          [1, 1],
          [2, 0.35],
          [3.01, 0.12],
        ];
        for (const [mult, g] of partials) {
          const pg = ctx.createGain();
          pg.gain.value = g;
          this.osc('sine', freq * mult, t, end)
            .connect(pg)
            .connect(env);
        }
        env.gain.linearRampToValueAtTime(vol, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        break;
      }
      case 'marimba': {
        // Woody mallet: fundamental + quickly fading overtones.
        env.gain.setValueAtTime(vol, t);
        const ring = Math.min(0.9, 0.35 + dur);
        this.partial(freq, t, 1, ring, env);
        this.partial(freq * 4, t, 0.22, 0.09, env);
        this.partial(freq * 9.2, t, 0.05, 0.03, env);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        env.connect(this.delaySend);
        break;
      }
      case 'keys': {
        // Soft electric-piano stab.
        env.gain.setValueAtTime(vol, t);
        const ring = Math.max(0.25, dur + 0.15);
        this.partial(freq, t, 1, ring, env);
        this.partial(freq * 2, t, 0.25, ring * 0.6, env);
        this.partial(freq * 3, t, 0.06, 0.12, env);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        break;
      }
      case 'pluckBass': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        const end = t + dur + 0.3;
        this.osc('triangle', freq, t, end).connect(filter).connect(env);
        env.gain.linearRampToValueAtTime(vol, t + 0.01);
        env.gain.exponentialRampToValueAtTime(vol * 0.3, t + Math.max(0.05, dur * 0.8));
        env.gain.setTargetAtTime(0, t + dur, 0.04);
        env.connect(this.dry);
        break;
      }
      case 'shaker': {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        this.noise(t, t + 0.12)
          .connect(hp)
          .connect(env);
        env.gain.linearRampToValueAtTime(vol, t + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        env.connect(this.dry);
        break;
      }
      case 'block': {
        env.gain.setValueAtTime(vol, t);
        this.partial(1250, t, 1, 0.06, env);
        this.partial(1900, t, 0.5, 0.04, env);
        env.connect(this.dry);
        env.connect(this.reverbSend);
        break;
      }
      case 'kick': {
        const o = this.osc('sine', 110, t, t + 0.3);
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        o.connect(env);
        env.gain.linearRampToValueAtTime(vol, t + 0.005);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        env.connect(this.dry);
        break;
      }
      case 'bass': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        this.osc('triangle', freq, t, t + dur + 0.5)
          .connect(filter)
          .connect(env);
        env.gain.linearRampToValueAtTime(vol, t + 0.03);
        env.gain.linearRampToValueAtTime(vol * 0.6, t + 0.4);
        env.gain.setValueAtTime(vol * 0.6, t + dur);
        env.gain.setTargetAtTime(0, t + dur, 0.1);
        env.connect(this.dry);
        break;
      }
    }
  }
}

/** Plays an audio file (mp3/ogg/wav) on loop through the same volume and mute controls. */
export class FilePlayer implements MusicPlayer {
  private el: HTMLAudioElement;
  private out: GainNode;

  constructor(
    private ctx: AudioContext,
    destination: AudioNode,
    src: string,
    private volume: number,
  ) {
    this.el = new Audio(src);
    this.el.loop = true;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    ctx.createMediaElementSource(this.el).connect(this.out);
    this.out.connect(destination);
  }

  start(): void {
    const now = this.ctx.currentTime;
    this.out.gain.linearRampToValueAtTime(this.volume, now + 2);
    void this.el.play();
  }

  stop(fadeSeconds: number): void {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    window.setTimeout(
      () => {
        this.el.pause();
        this.out.disconnect();
      },
      fadeSeconds * 1000 + 100,
    );
  }
}
