/**
 * Helpers for audio files (no Web Audio objects, so tests can run them):
 * - makeSeamlessLoop: trims the silence MP3 encoders add at the ends and
 *   crossfades the end into the start, so short recordings loop without a gap.
 * - findClips: splits a recording of many separate sounds (e.g. a file full of
 *   coughs) into individual pieces, so the game can play one at a time.
 */

export interface Clip {
  /** Seconds into the file. */
  start: number;
  /** Length in seconds. */
  duration: number;
}

const SILENCE = 0.002;

/** Index of the first/last sample louder than near-silence across all channels. */
function audibleRange(channels: Float32Array[]): [number, number] {
  const len = channels[0].length;
  let first = 0;
  let last = len - 1;
  const loud = (i: number) => channels.some((c) => Math.abs(c[i]) > SILENCE);
  while (first < len && !loud(first)) first++;
  while (last > first && !loud(last)) last--;
  return [first, last + 1];
}

/**
 * Returns new channel data that loops seamlessly: silent edges removed, and
 * the last `crossfadeSeconds` blended (equal-power) into the beginning.
 */
export function makeSeamlessLoop(channels: Float32Array[], sampleRate: number, crossfadeSeconds = 0.04): Float32Array[] {
  const [from, to] = audibleRange(channels);
  const len = to - from;
  const fade = Math.min(Math.floor(sampleRate * crossfadeSeconds), Math.floor(len / 4));
  if (len <= 0) return channels;
  return channels.map((c) => {
    const src = c.subarray(from, to);
    const out = new Float32Array(len - fade);
    out.set(src.subarray(0, len - fade));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      out[i] = src[i] * Math.sin((t * Math.PI) / 2) + src[len - fade + i] * Math.cos((t * Math.PI) / 2);
    }
    return out;
  });
}

export interface ClipOptions {
  /** A sound counts as "on" when louder than this many dB below the file's peak. Default -24. */
  thresholdDb?: number;
  /** Quiet gaps shorter than this (seconds) don't split a sound. Default 0.3. */
  minGap?: number;
  /** Pieces shorter than this (seconds) are ignored as clicks/blips. Default 0.12. */
  minLength?: number;
  /** Longer runs are cut at their quietest moment so no piece exceeds this (seconds). Default 2.5. */
  maxLength?: number;
  /** Extra time kept before each piece (seconds). Default 0.05. */
  lead?: number;
  /** Extra time kept after each piece for its natural fade (seconds). Default 0.25. */
  tail?: number;
}

/** Split a mono recording of separate sounds into clips. */
export function findClips(mono: Float32Array, sampleRate: number, opts: ClipOptions = {}): Clip[] {
  const { thresholdDb = -24, minGap = 0.3, minLength = 0.12, maxLength = 2.5, lead = 0.05, tail = 0.25 } = opts;
  const win = Math.max(1, Math.floor(sampleRate * 0.01)); // 10 ms loudness windows
  const env: number[] = [];
  for (let i = 0; i < mono.length; i += win) {
    let sum = 0;
    const end = Math.min(i + win, mono.length);
    for (let j = i; j < end; j++) sum += mono[j] * mono[j];
    env.push(Math.sqrt(sum / (end - i)));
  }
  const peak = Math.max(...env, 1e-9);
  const threshold = peak * Math.pow(10, thresholdDb / 20);
  const gapWins = Math.round(minGap / 0.01);

  // Runs of loud windows, joined across short gaps.
  const runs: [number, number][] = [];
  let start = -1;
  let last = -1;
  env.forEach((v, i) => {
    if (v <= threshold) return;
    if (start < 0) start = i;
    else if (i - last > gapWins) {
      runs.push([start, last]);
      start = i;
    }
    last = i;
  });
  if (start >= 0) runs.push([start, last]);

  // Cut over-long runs at the quietest window in the allowed range.
  const maxWins = Math.round(maxLength / 0.01);
  const pieces: [number, number][] = [];
  for (const run of runs) {
    let a = run[0];
    const z = run[1];
    while (z - a > maxWins) {
      let cut = a + Math.round(maxWins / 2);
      for (let i = cut; i < a + maxWins; i++) if (env[i] < env[cut]) cut = i;
      pieces.push([a, cut]);
      a = cut + 1;
    }
    pieces.push([a, z]);
  }

  const total = mono.length / sampleRate;
  return pieces
    .filter(([a, z]) => (z - a + 1) * 0.01 >= minLength)
    .map(([a, z], i, all) => {
      const s = Math.max(0, a * 0.01 - lead);
      // Keep the tail, but never run into the next piece.
      const nextStart = i + 1 < all.length ? all[i + 1][0] * 0.01 : total;
      const e = Math.min(total, (z + 1) * 0.01 + tail, nextStart);
      return { start: s, duration: e - s };
    });
}
