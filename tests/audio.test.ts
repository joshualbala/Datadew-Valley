import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseContent } from '../src/content/loader';
import { AudioSchema } from '../src/content/schemas';
import { songs } from '../src/game/audio/songs';
import { pitchToFreq } from '../src/game/audio/synth';

describe('audio', () => {
  it('pitchToFreq handles naturals, sharps and flats', () => {
    expect(pitchToFreq('A4')).toBeCloseTo(440);
    expect(pitchToFreq('C4')).toBeCloseTo(261.63, 1);
    expect(pitchToFreq('Bb3')).toBeCloseTo(233.08, 1);
    expect(pitchToFreq('F#5')).toBeCloseTo(739.99, 1);
  });

  it('every synth track in audio.json names a built-in song', () => {
    const text = readFileSync(resolve(__dirname, '../public/content/audio.json'), 'utf8');
    const audio = parseContent('audio.json', text, AudioSchema);
    for (const [key, track] of Object.entries(audio.music)) {
      if (track.synth) expect(songs, `music.${key}`).toHaveProperty(track.synth);
    }
  });

  it('every note in every song is a valid pitch inside the loop', () => {
    for (const song of Object.values(songs)) {
      for (const track of song.tracks) {
        for (const [pitch, beat, beats] of track.notes) {
          expect(() => pitchToFreq(pitch)).not.toThrow();
          expect(beat + beats).toBeLessThanOrEqual(song.lengthBeats);
        }
      }
    }
  });
});
