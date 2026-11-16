/**
 * Which "!" pop-ups the player has read, saved in this browser (localStorage)
 * so a reload keeps progress. Nothing is sent anywhere.
 */
const KEY = 'datadew:progress:v1';

interface Saved {
  read: string[];
  /** Alex's energy, 0–100 (the HUD energy bar). */
  energy: number;
}

function load(): Saved {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    const energy = typeof data.energy === 'number' && data.energy >= 0 && data.energy <= 100 ? data.energy : 100;
    return { read: Array.isArray(data.read) ? data.read : [], energy };
  } catch {
    return { read: [], energy: 100 };
  }
}

let state = load();
const listeners = new Set<() => void>();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage blocked: progress just won't survive a reload */
  }
  listeners.forEach((fn) => fn());
}

export const progress = {
  isRead: (id: string) => state.read.includes(id),
  readIds: () => new Set(state.read),
  markRead(id: string): void {
    if (state.read.includes(id)) return;
    state = { ...state, read: [...state.read, id] };
    save();
  },
  energy: () => state.energy,
  /** Set Alex's energy (0–100). Saved when it changes by a whole point, so frequent calls are cheap. */
  setEnergy(value: number): void {
    const next = Math.max(0, Math.min(100, value));
    const changed = Math.floor(next) !== Math.floor(state.energy);
    state = { ...state, energy: next };
    if (changed) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        /* storage blocked */
      }
    }
  },
  /** Forget everything (the Reset button). */
  reset(): void {
    state = { read: [], energy: 100 };
    save();
  },
  /** Subscribe to changes; returns an unsubscribe function. */
  onChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
