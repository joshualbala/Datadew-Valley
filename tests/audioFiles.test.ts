import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseContent } from '../src/content/loader';
import { AudioSchema } from '../src/content/schemas';
import { findClips, makeSeamlessLoop } from '../src/game/audio/fileSounds';

const SR = 8000;
/** Noise bursts at the given [start, end] seconds, silence elsewhere. */
function bursts(total: number, ranges: [number, number][]): Float32Array {
  const out = new Float32Array(Math.round(total * SR));
  for (const [a, z] of ranges) for (let i = Math.round(a * SR); i < Math.round(z * SR); i++) out[i] = Math.sin(i * 0.7) * 0.8;
  return out;
}

describe('audio files', () => {
  it('every "file" in audio.json exists in public/', () => {
    const audio = parseContent('audio.json', readFileSync(resolve(__dirname, '../public/content/audio.json'), 'utf8'), AudioSchema);
    const entries = { ...audio.music, ...audio.sounds };
    for (const [key, def] of Object.entries(entries)) {
      if (def.file) expect(existsSync(resolve(__dirname, '../public', def.file)), `${key}: public/${def.file}`).toBe(true);
    }
  });

  it('makeSeamlessLoop trims silent edges and crossfades the ends', () => {
    const data = bursts(1, [[0.1, 0.9]]);
    const [looped] = makeSeamlessLoop([data], SR, 0.04);
    // 0.8 s of sound minus the 0.04 s crossfade.
    expect(looped.length).toBeGreaterThan(0.75 * SR);
    expect(looped.length).toBeLessThan(0.77 * SR);
    expect(Math.abs(looped[0])).toBeLessThan(0.9);
  });

  it('findClips splits separate sounds at quiet gaps', () => {
    const clips = findClips(
      bursts(6, [
        [0.5, 1],
        [2, 2.6],
        [4, 4.3],
      ]),
      SR,
    );
    expect(clips).toHaveLength(3);
    expect(clips[0].start).toBeCloseTo(0.45, 1);
    expect(clips[1].start).toBeCloseTo(1.95, 1);
  });

  it('findClips ignores tiny blips and cuts long runs into short pieces', () => {
    const clips = findClips(
      bursts(10, [
        [0.5, 0.52],
        [1, 8],
      ]),
      SR,
    );
    expect(clips.length).toBeGreaterThanOrEqual(3);
    for (const c of clips) expect(c.duration).toBeLessThanOrEqual(2.5 + 0.3);
  });
});
