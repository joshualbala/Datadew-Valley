import { findClips, makeSeamlessLoop, type Clip } from './fileSounds';
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
  /** The file holds many separate sounds (e.g. a series of coughs): play one random piece each time. */
  clips?: boolean;
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
  private current: { key: string; source: string; player: MusicPlayer } | null = null;
  private pending: { key: string; track: MusicTrack } | null = null;
  private listeners = new Set<(muted: boolean) => void>();
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private loopBuffers = new Map<string, Promise<AudioBuffer | null>>();
  private clips = new Map<string, { list: Clip[]; last: number }>();
  /** audio.json → sounds. An entry named like a sound effect (e.g. "cough") with a "file" replaces the built-in effect. */
  private soundDefs: Record<string, SoundDef> = {};
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

  /**
   * Start a music track (no-op if it is already playing). Waits for unlock if needed.
   * If the new track uses the same file/song as the one playing (e.g. title and intro
   * share a song), the music simply continues instead of restarting.
   */
  playMusic(key: string, track: MusicTrack): void {
    if (this.current?.key === key) return;
    const source = track.file ? `file:${track.file}` : `synth:${track.synth}`;
    if (this.current?.source === source) {
      this.current.key = key;
      return;
    }
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
    this.current = { key, source, player };
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

  /** Sounds from audio.json; sound effects with a matching "file" entry use the recording instead of the synth. */
  setSoundDefs(defs: Record<string, SoundDef>): void {
    this.soundDefs = defs;
  }

  /** Play a small effect (pop-up chime, footstep, cough). Silent until audio is unlocked. */
  sfx(name: SfxName, opts?: SfxOptions): void {
    if (!this.ctx || !this.master || this.sfxVolume === 0) return;
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
    }
    const def = this.soundDefs[name];
    if (def?.file) void this.playFileSfx(name, def, opts ?? {});
    else playSfx(this.ctx, this.sfxGain, name, opts);
  }

  /** One-shot from a file: the whole file, or (with "clips") one random piece of it. */
  private async playFileSfx(key: string, def: SoundDef, opts: SfxOptions): Promise<void> {
    const buffer = await this.buffer(key, def);
    const ctx = this.ctx;
    if (!buffer || !ctx || !this.sfxGain) return;
    let clip: Clip = { start: 0, duration: buffer.duration };
    if (def.clips) {
      let entry = this.clips.get(key);
      if (!entry) {
        entry = { list: findClips(buffer.getChannelData(0), buffer.sampleRate), last: -1 };
        this.clips.set(key, entry);
      }
      if (entry.list.length) {
        // Random piece, never the same one twice in a row.
        let i = Math.floor(Math.random() * entry.list.length);
        if (i === entry.last && entry.list.length > 1) i = (i + 1) % entry.list.length;
        entry.last = i;
        clip = entry.list[i];
      }
    }
    // Real recordings sound odd when pitched far, so voice differences are kept subtle.
    const rate = 1 + ((opts.pitch ?? 1) - 1) * 0.5;
    const length = clip.duration / rate;
    const vol = Math.min(1.5, def.volume * (opts.volume ?? 1));
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, length - 0.12));
    g.gain.linearRampToValueAtTime(0, t + length);
    src.connect(g).connect(this.sfxGain);
    src.start(t, clip.start, clip.duration);
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
      const buffer = await this.loopBuffer(key, def);
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

  /** Like buffer(), but for files: silent edges trimmed and ends crossfaded so it loops without a gap. */
  private loopBuffer(key: string, def: SoundDef): Promise<AudioBuffer | null> {
    if (!def.file) return this.buffer(key, def);
    let p = this.loopBuffers.get(key);
    if (!p) {
      p = this.buffer(key, def).then((raw) => {
        if (!raw || !this.ctx) return raw;
        const channels = Array.from({ length: raw.numberOfChannels }, (_, c) => raw.getChannelData(c));
        const looped = makeSeamlessLoop(channels, raw.sampleRate);
        const out = this.ctx.createBuffer(looped.length, looped[0].length, raw.sampleRate);
        looped.forEach((data, c) => out.copyToChannel(data as Float32Array<ArrayBuffer>, c));
        return out;
      });
      this.loopBuffers.set(key, p);
    }
    return p;
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
