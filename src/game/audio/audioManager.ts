import { songs } from './songs';
import { FilePlayer, SynthPlayer, type MusicPlayer } from './synth';

export interface MusicTrack {
  synth?: string;
  file?: string;
  volume: number;
}

const MUTE_KEY = 'datadew:muted';

/**
 * One place for all game audio: creates the AudioContext after the first
 * click/keypress (browsers require this), plays/fades music, and handles mute.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private current: { key: string; player: MusicPlayer } | null = null;
  private pending: { key: string; track: MusicTrack } | null = null;
  private listeners = new Set<(muted: boolean) => void>();
  muted = localStorage.getItem(MUTE_KEY) === '1';

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
      player = new FilePlayer(this.ctx, this.master, `${import.meta.env.BASE_URL}${track.file}`, track.volume);
    } else {
      const song = songs[track.synth ?? ''];
      if (!song) {
        console.warn(`Unknown synth song "${track.synth}"`);
        return;
      }
      player = new SynthPlayer(this.ctx, this.master, song, track.volume);
    }
    player.start();
    this.current = { key, player };
  }

  stopMusic(fadeSeconds = 2): void {
    this.pending = null;
    this.current?.player.stop(fadeSeconds);
    this.current = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
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
