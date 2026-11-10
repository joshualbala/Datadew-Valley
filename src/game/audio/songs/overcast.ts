import { barsToNotes, chordsToNotes, type NoteEvent, type Song } from './types';

/**
 * "Overcast": a slow, wistful loop in A minor for the intro slides. Dreary
 * but gentle: soft pads, a music-box arpeggio and a breathy melody, with a lift
 * to F and C major so it never feels hopeless. 16 bars at 66 BPM, about 58 seconds.
 */
const Am = ['A2', 'C3', 'E3', 'G3'];
const F = ['F2', 'A2', 'C3', 'E3'];
const C = ['C3', 'E3', 'G3', 'B3'];
const G = ['G2', 'B2', 'D3', 'F3'];
const Dm = ['D3', 'F3', 'A3', 'C4'];
const E = ['E2', 'G#2', 'B2', 'D3'];

const progression = [Am, F, C, G, Am, F, C, E, Dm, Am, F, C, Dm, Am, F, E];

const melody: [string, number][][] = [
  // A: falling, sighing phrases
  [['E5', 2], ['C5', 1], ['B4', 1]],
  [['A4', 3], ['-', 1]],
  [['G4', 1], ['A4', 1], ['C5', 1], ['E5', 1]],
  [['D5', 3], ['-', 1]],
  [['E5', 1.5], ['D5', 0.5], ['C5', 1], ['B4', 1]],
  [['C5', 2], ['A4', 2]],
  [['G4', 1], ['E4', 1], ['G4', 1], ['C5', 1]],
  [['B4', 3], ['-', 1]],
  // B: reaches up, then settles back down
  [['F5', 2], ['E5', 1], ['D5', 1]],
  [['C5', 2], ['E5', 2]],
  [['A4', 1.5], ['C5', 0.5], ['F5', 1], ['E5', 1]],
  [['E5', 2], ['D5', 1], ['C5', 1]],
  [['D5', 1.5], ['C5', 0.5], ['A4', 2]],
  [['C5', 1], ['B4', 1], ['A4', 1], ['E4', 1]],
  [['F4', 1], ['A4', 1], ['C5', 1], ['B4', 1]],
  [['G#4', 3], ['-', 1]],
];

// Bass: long root notes, a fifth on beat 3.
const bass: NoteEvent[] = progression.flatMap((chord, bar): NoteEvent[] => {
  const root = chord[0].replace(/\d/, '2');
  const fifth = chord[2].replace(/\d/, '2');
  return [
    [root, bar * 4, 3],
    [fifth, bar * 4 + 3, 1],
  ];
});

// Slow music-box arpeggio, one note per beat, an octave up.
const bells: NoteEvent[] = progression.flatMap((chord, bar): NoteEvent[] => {
  const up = (p: string) => p.replace(/\d/, (o) => String(Number(o) + 2));
  const [a, b, c, d] = chord.map(up);
  return [a, c, b, d].map((p, beat): NoteEvent => [p, bar * 4 + beat, 1]);
});

export const overcast: Song = {
  bpm: 66,
  reverb: 0.7,
  lengthBeats: progression.length * 4,
  tracks: [
    { instrument: 'pad', volume: 0.06, notes: chordsToNotes(progression) },
    { instrument: 'bass', volume: 0.12, notes: bass },
    { instrument: 'bell', volume: 0.025, notes: bells },
    { instrument: 'lead', volume: 0.1, notes: barsToNotes(melody) },
  ],
};
