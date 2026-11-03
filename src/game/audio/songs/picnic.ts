import { barsToNotes, type NoteEvent, type Song } from './types';

/**
 * "Picnic": an original, upbeat cozy-village tune for the opening page and intro.
 * C major, 116 BPM with a light swing: marimba melody, electric-piano chord
 * stabs, bouncy bass and soft shaker/woodblock percussion. 16 bars, ~33 s loop.
 */

type Chord = { root: string; tones: string[] };
const ch = (root: string, ...tones: string[]): Chord => ({ root, tones });

const Cmaj7 = ch('C2', 'E4', 'G4', 'B4');
const C6 = ch('C2', 'E4', 'G4', 'A4');
const Am7 = ch('A1', 'C4', 'E4', 'G4');
const Dm7 = ch('D2', 'F4', 'A4', 'C5');
const G7 = ch('G1', 'F4', 'G4', 'B4');
const Fmaj7 = ch('F2', 'A4', 'C5', 'E5');
const Em7 = ch('E2', 'G4', 'B4', 'D5');
const E7 = ch('E2', 'G#4', 'B4', 'D5');
const D7 = ch('D2', 'F#4', 'A4', 'C5');

/** Each bar: one chord for 4 beats, or two chords for 2 beats each. */
const bars: Chord[][] = [
  [Cmaj7], [Am7], [Dm7], [G7], [Cmaj7], [Am7], [Dm7, G7], [C6],
  [Fmaj7], [Em7], [Dm7], [G7], [Fmaj7], [E7], [Am7, D7], [Dm7, G7],
];

const melody: [string, number][][] = [
  // A: bouncy, call-and-answer
  [['E5', 0.5], ['G5', 0.5], ['-', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 1]],
  [['E5', 1], ['C5', 0.5], ['A4', 0.5], ['-', 0.5], ['C5', 0.5], ['E5', 1]],
  [['F5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]],
  [['D5', 1.5], ['B4', 0.5], ['G4', 1], ['-', 1]],
  [['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 0.5], ['G5', 0.5], ['E5', 0.5], ['G5', 1]],
  [['A5', 1], ['G5', 0.5], ['E5', 0.5], ['C5', 1], ['E5', 1]],
  [['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['F5', 0.5], ['B4', 0.5], ['D5', 0.5], ['G5', 1]],
  [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 1], ['-', 1]],
  // B: brighter, a little higher
  [['A5', 1], ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 1]],
  [['G5', 1.5], ['E5', 0.5], ['B4', 1], ['D5', 1]],
  [['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F5', 1], ['A5', 1]],
  [['G5', 2], ['F5', 0.5], ['D5', 0.5], ['B4', 1]],
  [['A5', 0.5], ['C6', 0.5], ['A5', 0.5], ['G5', 0.5], ['F5', 1], ['A5', 1]],
  [['G#5', 1.5], ['E5', 0.5], ['B4', 1], ['D5', 1]],
  [['C5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['F#5', 1], ['D5', 1]],
  [['F5', 0.5], ['A5', 0.5], ['D5', 0.5], ['F5', 0.5], ['G5', 1], ['B4', 1]],
];

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const toMidi = (p: string) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(p)!;
  return 'C D EF G A B'.indexOf(m[1]) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
};
const fromMidi = (n: number) => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
const up = (p: string, semis: number) => fromMidi(toMidi(p) + semis);

const keys: NoteEvent[] = [];
const bass: NoteEvent[] = [];
const kick: NoteEvent[] = [];
const block: NoteEvent[] = [];
const shaker: NoteEvent[] = [];

bars.forEach((chords, bar) => {
  const len = 4 / chords.length;
  chords.forEach((c, i) => {
    const s = bar * 4 + i * len;
    // Piano stabs: on the beat, then the bouncy "and"s.
    const hits = len === 4 ? [0, 1.5, 2.5, 3.5] : [0, 1.5];
    for (const h of hits) for (const t of c.tones) keys.push([t, s + h, 0.3]);
    // Bass: root – fifth – octave – fifth (half-bar chords: root – fifth).
    const pattern = len === 4 ? [0, 7, 12, 7] : [0, 7];
    pattern.forEach((semis, k) => bass.push([up(c.root, semis), s + k, 0.45]));
  });
  kick.push(['C2', bar * 4, 0.25], ['C2', bar * 4 + 2, 0.25]);
  block.push(['C5', bar * 4 + 1, 0.1], ['C5', bar * 4 + 3, 0.1]);
  for (let e = 0; e < 8; e++) shaker.push(['C5', bar * 4 + e * 0.5, 0.1]);
});

const lead = barsToNotes(melody).map(([p, b, d]): NoteEvent => [p, b, Math.min(d, 0.9)]);
// Glockenspiel sparkle doubling the B section an octave up.
const sparkle = lead.filter(([, b]) => b >= 32).map(([p, b, d]): NoteEvent => [up(p, 12), b, d]);

export const picnic: Song = {
  bpm: 116,
  swing: 0.62,
  reverb: 0.3,
  lengthBeats: bars.length * 4,
  tracks: [
    { instrument: 'marimba', volume: 0.32, notes: lead },
    { instrument: 'bell', volume: 0.08, notes: sparkle },
    { instrument: 'keys', volume: 0.12, notes: keys },
    { instrument: 'pluckBass', volume: 0.2, notes: bass },
    { instrument: 'kick', volume: 0.22, notes: kick },
    { instrument: 'block', volume: 0.12, notes: block },
    { instrument: 'shaker', volume: 0.15, notes: shaker },
  ],
};
