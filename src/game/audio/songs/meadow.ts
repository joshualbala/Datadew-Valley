import { barsToNotes, chordsToNotes, type NoteEvent, type Song } from './types';

/**
 * "Meadow": a slow, cozy loop in F major for the opening page and intro
 * (life before the data center). 16 bars at 72 BPM, about 53 seconds.
 */
const F = ['F3', 'A3', 'C4', 'E4'];
const Dm = ['D3', 'F3', 'A3', 'C4'];
const Bb = ['Bb2', 'D3', 'F3', 'A3'];
const C = ['C3', 'E3', 'G3', 'D4'];
const Am = ['A2', 'C3', 'E3', 'G3'];
const Gm = ['G2', 'Bb2', 'D3', 'F3'];

const progression = [F, Dm, Bb, C, F, Am, Bb, C, Dm, Bb, F, C, Dm, Bb, Gm, C];

const melody: [string, number][][] = [
  // A section
  [['C5', 1], ['A4', 1], ['F4', 1], ['A4', 1]],
  [['D5', 2], ['C5', 1], ['A4', 1]],
  [['Bb4', 1.5], ['A4', 0.5], ['G4', 1], ['F4', 1]],
  [['G4', 3], ['-', 1]],
  [['C5', 1], ['A4', 1], ['F4', 1], ['C5', 1]],
  [['E5', 2], ['D5', 1], ['C5', 1]],
  [['D5', 1.5], ['C5', 0.5], ['Bb4', 1], ['A4', 1]],
  [['G4', 3], ['-', 1]],
  // B section
  [['F5', 2], ['E5', 1], ['D5', 1]],
  [['D5', 2], ['C5', 1], ['Bb4', 1]],
  [['C5', 1.5], ['A4', 0.5], ['C5', 1], ['F5', 1]],
  [['E5', 3], ['-', 1]],
  [['F5', 1], ['E5', 1], ['D5', 1], ['A4', 1]],
  [['Bb4', 1.5], ['C5', 0.5], ['D5', 2]],
  [['C5', 1], ['Bb4', 1], ['A4', 1], ['G4', 1]],
  [['G4', 2], ['E4', 1], ['-', 1]],
];

// Bass: root on beat 1, fifth on beat 3, kept in octave 2 so laptop speakers can play it.
const bass: NoteEvent[] = progression.flatMap((chord, bar): NoteEvent[] => {
  const root = chord[0].replace(/\d/, '2');
  const fifth = chord[2].replace(/\d/, '2');
  return [
    [root, bar * 4, 2],
    [fifth, bar * 4 + 2, 2],
  ];
});

// Music-box arpeggio: chord tones an octave up on a lilting pattern.
const bells: NoteEvent[] = progression.flatMap((chord, bar): NoteEvent[] => {
  const up = (p: string) => p.replace(/\d/, (o) => String(Number(o) + 1));
  const [a, b, c, d] = chord.map(up);
  const pattern: [string, number][] = [[a, 0], [c, 0.5], [b, 1], [d, 1.5], [c, 2.5], [b, 3]];
  return pattern.map(([p, beat]): NoteEvent => [p, bar * 4 + beat, 0.5]);
});

export const meadow: Song = {
  bpm: 72,
  lengthBeats: progression.length * 4,
  tracks: [
    { instrument: 'pad', volume: 0.05, notes: chordsToNotes(progression) },
    { instrument: 'bass', volume: 0.14, notes: bass },
    { instrument: 'bell', volume: 0.035, notes: bells },
    { instrument: 'lead', volume: 0.11, notes: barsToNotes(melody) },
  ],
};
