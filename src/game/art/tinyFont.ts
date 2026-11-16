import type { PixelPainter } from './pixel';

/**
 * A 3×5 pixel font (capital letters, digits and a little punctuation) for
 * words painted into pictures, like protest signs. Lowercase is drawn as
 * capitals; unknown characters become spaces.
 */
const GLYPHS: Record<string, string> = {
  A: '.#.#.#####.##.#',
  B: '##.#.###.#.###.',
  C: '.###..#..#...##',
  D: '##.#.##.##.###.',
  E: '####..##.#..###',
  F: '####..##.#..#..',
  G: '.###..#.##.#.##',
  H: '#.##.#####.##.#',
  I: '###.#..#..#.###',
  J: '..#..#..##.#.#.',
  K: '#.##.###.#.##.#',
  L: '#..#..#..#..###',
  M: '#.########.##.#',
  N: '##.#.##.##.##.#',
  O: '.#.#.##.##.#.#.',
  P: '##.#.###.#..#..',
  Q: '.#.#.##.###..##',
  R: '##.#.###.#.##.#',
  S: '.###...#...###.',
  T: '###.#..#..#..#.',
  U: '#.##.##.##.####',
  V: '#.##.##.##.#.#.',
  W: '#.##.########.#',
  X: '#.##.#.#.#.##.#',
  Y: '#.##.#.#..#..#.',
  Z: '###..#.#.#..###',
  '0': '####.##.##.####',
  '1': '.#.##..#..#.###',
  '2': '##...#.#.#..###',
  '3': '##...#.#...###.',
  '4': '#.##.####..#..#',
  '5': '####..##...###.',
  '6': '.###..####.####',
  '7': '###..#.#..#..#.',
  '8': '####.#####.####',
  '9': '####.####..###.',
  '!': '.#..#..#.....#.',
  '?': '##...#.#.....#.',
  "'": '.#..#..........',
  '.': '.............#.',
  '-': '......###......',
  ',': '..........#.#..',
};

const W = 3;
const H = 5;

/** Width in pixels of `text` at this font (1 pixel between letters, 2 for a space). */
export function tinyTextWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? 2 : W + 1;
  return Math.max(0, w - 1);
}

/** Paint `text` with its top-left corner at (x, y). */
export function tinyText(p: PixelPainter, text: string, x: number, y: number, color: number): void {
  let cx = x;
  for (const raw of text.toUpperCase()) {
    if (raw === ' ') {
      cx += 2;
      continue;
    }
    const glyph = GLYPHS[raw];
    if (glyph) {
      const cells = glyph;
      for (let i = 0; i < W * H; i++) if (cells[i] === '#') p.px(cx + (i % W), y + Math.floor(i / W), color);
    }
    cx += W + 1;
  }
}

/** Paint up to two lines ("|" splits them), each centered on `cx`, starting at y. */
export function tinyLines(p: PixelPainter, text: string, cx: number, y: number, color: number): void {
  text
    .split('|')
    .slice(0, 2)
    .forEach((line, i) => {
      const t = line.trim();
      tinyText(p, t, Math.round(cx - tinyTextWidth(t) / 2), y + i * (H + 2), color);
    });
}
