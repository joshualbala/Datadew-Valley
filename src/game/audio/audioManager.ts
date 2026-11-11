import { recordings } from './recordings';
import { playSfx, type SfxName, type SfxOptions } from './sfx';
import { songs } from './songs';
import { FilePlayer, SynthPlayer, type MusicPlayer } from './synth';

export interface MusicTrack {
  synth?: string;
  file?: string;
  volume: number;
}

export interface SoundDef {
  synth?: string;
  file?: string;
  volume: number;
}

/** A looping sound that can be paused, resumed, faded and stopped. */
export interface SoundHandle {
  readonly playing: boolean;
  play(): void;
  pause(): void;
  /** 0–1, relative to the sound's own volume. */
  setVolume(volume: number, rampSeconds?: number): void;
  stop(fadeSeconds?: number): void;
}

const MUTE_KEY = 'datadew:muted';

/** Remembered mute setting (storage can be missing or blocked, e.g. private windows or tests). */
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * One place for all game audio: creates the AudioContext after the first
 * click/keypress (browsers require this), plays/fades music, and handles mute.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** All music goes through this, so it can be dipped without touching other sounds. */
  private musicBus: GainNode | null = null;
  private musicLevel = 1;
  private current: { key: string; player: MusicPlayer } | null = null;
  private pending: { key: string; track: MusicTrack } | null = null;
  private listeners = new Set<(muted: boolean) => void>();
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private sfxGain: GainNode | null = null;
  private sfxVolume = 0.5;
  muted = readMuted();

  /** Listen for the visitor's first click/keypress anywhere and unlock audio then. */
  armUnlock(): void {
    const unlock = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    // Capture phase so audio unlocks before the game reacts to the same click.
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  private unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicLevel;
      this.musicBus.connect(this.master);
    }
    void this.ctx.resume();
    if (this.pending) {
      const { key, track } = this.pending;
      this.pending = null;
      this.playMusic(key, track);
    }
  }

  /** Start a music track (no-op if it is already playing). Waits for unlock if needed. */
  playMusic(key: string, track: MusicTrack): void {
    if (this.current?.key === key) return;
    if (!this.ctx || !this.master) {
      this.pending = { key, track };
      return;
    }
    this.stopMusic(1.5);
    let player: MusicPlayer;
    if (track.file) {
      player = new FilePlayer(this.ctx, this.musicBus!, `${import.meta.env.BASE_URL}${track.file}`, track.volume);
    } else {
      const song = songs[track.synth ?? ''];
      if (!song) {
        console.warn(`Unknown synth song "${track.synth}"`);
        return;
      }
      player = new SynthPlayer(this.ctx, this.musicBus!, song, track.volume);
    }
    player.start();
    this.current = { key, player };
  }

  /** Silence everything while the game is hidden (another website page), and pick up again after. */
  setPaused(paused: boolean): void {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /**
   * Dip or restore the music (0–1, 1 = normal), e.g. silent under a slide's
   * own sound, or quieter next to the data center so its hum comes through.
   */
  setMusicLevel(level: number, rampSeconds = 0.5): void {
    if (Math.abs(level - this.musicLevel) < 0.005) return;
    this.musicLevel = level;
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(level, this.ctx.currentTime, rampSeconds / 3);
  }

  /** Volume of small sound effects (from audio.json → sfxVolume). */
  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    if (this.sfxGain) this.sfxGain.gain.value = volume;
  }

  /** Play a small effect (pop-up chime, footstep, cough). Silent until audio is unlocked. */
  sfx(name: SfxName, opts?: SfxOptions): void {
    if (!this.ctx || !this.master || this.sfxVolume === 0) return;
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
    }
    playSfx(this.ctx, this.sfxGain, name, opts);
  }

  /**
   * A looping sound (e.g. the data center recording). Returns a handle right
   * away; the audio starts once it is loaded/synthesized and audio is unlocked.
   */
  sound(key: string, def: SoundDef): SoundHandle {
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let wantPlaying = false;
    let level = 1;
    let startedAt = 0;
    let offset = 0;
    let stopped = false;

    const start = async () => {
      const ctx = this.ctx;
      if (!ctx || !this.master || stopped || source) return;
      const buffer = await this.buffer(key, def);
      if (!buffer || !wantPlaying || stopped || source) return;
      if (!gain) {
        gain = ctx.createGain();
        gain.gain.value = def.volume * level;
        gain.connect(this.master);
      }
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      startedAt = ctx.currentTime - offset;
      source.start(0, offset % buffer.duration);
    };
    const halt = () => {
      if (!source || !this.ctx) return;
      offset = this.ctx.currentTime - startedAt;
      source.stop();
      source.disconnect();
      source = null;
    };

    return {
      get playing() {
        return wantPlaying;
      },
      play: () => {
        if (stopped) return;
        wantPlaying = true;
        void start();
      },
      pause: () => {
        wantPlaying = false;
        halt();
      },
      setVolume: (v: number, ramp = 0.1) => {
        level = v;
        if (gain && this.ctx) gain.gain.setTargetAtTime(def.volume * v, this.ctx.currentTime, ramp);
      },
      stop: (fade = 0.4) => {
        stopped = true;
        wantPlaying = false;
        if (gain && this.ctx) gain.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
        window.setTimeout(halt, fade * 1000 + 50);
      },
    };
  }

  /** Decode a file or synthesize a built-in recording once, then reuse it. */
  private buffer(key: string, def: SoundDef): Promise<AudioBuffer | null> {
    const ctx = this.ctx!;
    let p = this.buffers.get(key);
    if (!p) {
      p = (async () => {
        if (def.file) {
          const res = await fetch(`${import.meta.env.BASE_URL}${def.file}`);
          return ctx.decodeAudioData(await res.arrayBuffer());
        }
        const make = recordings[def.synth ?? ''];
        if (!make) {
          console.warn(`Unknown synth sound "${def.synth}"`);
          return null;
        }
        const samples = make(ctx.sampleRate);
        const buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        return buf;
      })();
      this.buffers.set(key, p);
    }
    return p;
  }

  stopMusic(fadeSeconds = 2): void {
    this.pending = null;
    this.current?.player.stop(fadeSeconds);
    this.current = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* storage blocked: mute just won't be remembered */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }

  /** Subscribe to mute changes (returns an unsubscribe function). */
  onMuteChange(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const audio = new AudioManager();
