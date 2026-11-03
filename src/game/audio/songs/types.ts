/** A note: [pitch like "A4" or "Bb3", start beat, length in beats]. */
export type NoteEvent = [pitch: string, beat: number, beats: number];

export type Instrument =
  | 'pad' // slow, warm chord swell
  | 'lead' // breathy ocarina-like melody
  | 'bass' // soft sustained bass
  | 'bell' // music-box pluck
  | 'marimba' // woody mallet, bouncy melodies
  | 'keys' // short electric-piano chord stabs
  | 'pluckBass' // short, bouncy bass
  | 'shaker' // percussion (pitch ignored)
  | 'block' // woodblock tick (pitch ignored)
  | 'kick'; // soft kick drum (pitch ignored)

export interface Song {
  bpm: number;
  /** 0.5 = straight eighths; ~0.62 = bouncy swing. Default 0.5. */
  swing?: number;
  /** Reverb amount 0–1. Default 0.55. */
  reverb?: number;
  /** Total loop length in beats. */
  lengthBeats: number;
  tracks: { instrument: Instrument; volume: number; notes: NoteEvent[] }[];
}

/** Turn a list of chords (one per bar) into whole-bar pad notes. */
export function chordsToNotes(chords: string[][], beatsPerBar = 4, startBar = 0): NoteEvent[] {
  return chords.flatMap((chord, i) => chord.map((p): NoteEvent => [p, (startBar + i) * beatsPerBar, beatsPerBar]));
}

/** Write a melody bar by bar: each bar is a list of [pitch, beats]; use "-" for a rest. */
export function barsToNotes(bars: [string, number][][], beatsPerBar = 4, startBar = 0): NoteEvent[] {
  const out: NoteEvent[] = [];
  bars.forEach((bar, i) => {
    let beat = (startBar + i) * beatsPerBar;
    for (const [pitch, beats] of bar) {
      if (pitch !== '-') out.push([pitch, beat, beats]);
      beat += beats;
    }
    const total = beat - (startBar + i) * beatsPerBar;
    if (Math.abs(total - beatsPerBar) > 1e-6) {
      throw new Error(`Melody bar ${startBar + i + 1} has ${total} beats, expected ${beatsPerBar}`);
    }
  });
  return out;
}
