import { barsToNotes, chordsToNotes, type NoteEvent, type Song } from './types';

/**
 * "Haze": the walking-around music for the valley after the data center.
 * D minor, slow and sparse: a soft pad, a gentle marimba figure and a lonely
 * bell melody with long rests, so it stays in the background during play.
 * 16 bars at 64 BPM, about a minute.
 */
const Dm = ['D3', 'F3', 'A3', 'C4'];
const Bb = ['Bb2', 'D3', 'F3', 'A3'];
const F = ['F2', 'A2', 'C3', 'E3'];
const C = ['C3', 'E3', 'G3', 'Bb3'];
const Gm = ['G2', 'Bb2', 'D3', 'F3'];
const A = ['A2', 'C#3', 'E3', 'G3'];

const progression = [Dm, Bb, F, C, Dm, Gm, Bb, A, Dm, Bb, F, C, Gm, Dm, Bb, A];

const melody: [string, number][][] = [
  [['A4', 3], ['-', 1]],
  [['F4', 2], ['D4', 2]],
  [['C5', 3], ['-', 1]],
  [['E4', 2], ['G4', 2]],
  [['A4', 1.5], ['G4', 0.5], ['F4', 2]],
  [['D4', 3], ['-', 1]],
  [['F4', 1], ['G4', 1], ['A4', 2]],
  [['C#5', 3], ['-', 1]],
  [['D5', 3], ['-', 1]],
  [['F5', 2], ['D5', 2]],
  [['C5', 2], ['A4', 2]],
  [['G4', 3], ['-', 1]],
  [['Bb4', 1.5], ['A4', 0.5], ['G4', 2]],
  [['F4', 2], ['A4', 2]],
  [['D4', 1], ['F4', 1], ['Bb4', 2]],
  [['A4', 3], ['-', 1]],
];

// Marimba: a slow two-note rocking figure on the chord's root and fifth, an octave up.
const marimba: NoteEvent[] = progression.flatMap((chord, bar): NoteEvent[] => {
  const up = (p: string) => p.replace(/\d/, (o) => String(Number(o) + 1));
  return [
    [up(chord[0]), bar * 4, 1],
    [up(chord[2]), bar * 4 + 1.5, 1],
    [up(chord[1]), bar * 4 + 3, 1],
  ];
});

const bass: NoteEvent[] = progression.map((chord, bar): NoteEvent => [chord[0].replace(/\d/, '2'), bar * 4, 3.5]);

export const haze: Song = {
  bpm: 64,
  reverb: 0.75,
  lengthBeats: progression.length * 4,
  tracks: [
    { instrument: 'pad', volume: 0.05, notes: chordsToNotes(progression) },
    { instrument: 'bass', volume: 0.1, notes: bass },
    { instrument: 'marimba', volume: 0.05, notes: marimba },
    { instrument: 'bell', volume: 0.04, notes: barsToNotes(melody) },
  ],
};
