/**
 * Which "!" pop-ups the player has read, saved in this browser (localStorage)
 * so a reload keeps progress. Nothing is sent anywhere.
 */
const KEY = 'datadew:progress:v1';

interface Saved {
  read: string[];
}

function load(): Saved {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    return { read: Array.isArray(data.read) ? data.read : [] };
  } catch {
    return { read: [] };
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
    state = { read: [...state.read, id] };
    save();
  },
  /** Forget everything (the Reset button). */
  reset(): void {
    state = { read: [] };
    save();
  },
  /** Subscribe to changes; returns an unsubscribe function. */
  onChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
