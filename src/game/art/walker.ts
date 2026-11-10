import type { Look } from './illustrations/common';
import type { PixelPainter } from './pixel';

/**
 * Top-down walking sprite for the game map: same size and colors as the
 * slide figures (11×21), facing down, up or to the side (left; flip the image
 * for right). Frame 0 = standing, 1 and 2 = the two steps of a walk cycle.
 */
export const WALKER_W = 11;
export const WALKER_H = 21;
export type Facing = 'down' | 'up' | 'side';
/** Face shown when walking toward the viewer. */
export type WalkerMood = 'happy' | 'sad' | 'angry';

const SHOE = 0x3a2412;
const EYE = 0x120c0a;

/** Scale a color's brightness (f < 1 darker, f > 1 lighter), clamped to valid values. */
const darker = (c: number, f = 0.75) => {
  const ch = (shift: number) => Math.min(255, Math.round(((c >> shift) & 0xff) * f));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export function walker(p: PixelPainter, look: Look, facing: Facing, frame: 0 | 1 | 2, mood: WalkerMood = 'happy'): void {
  if (facing === 'side') return side(p, look, frame);
  const { hair, skin, shirt, pants } = look;
  const curly = look.hairStyle === 'curly';

  // Head.
  p.rect(2, 2, 7, 7, skin).px(1, 5, skin).px(9, 5, skin);
  p.rect(3, 1, 5, 1, hair).rect(2, 2, 7, 1, hair);
  if (facing === 'up') {
    p.rect(2, 2, 7, 6, hair); // back of the head
    if (curly) p.px(4, 3, darker(hair, 1.6)).px(6, 5, darker(hair, 1.6));
  } else {
    if (curly) p.px(2, 3, hair).px(8, 3, hair);
    else p.rect(2, 3, 2, 1, hair).rect(7, 3, 2, 1, hair);
    p.px(4, 5, EYE).px(6, 5, EYE);
    const mouth = darker(skin, 0.45);
    if (mood === 'happy') p.px(4, 7, mouth).px(5, 8, mouth).px(6, 7, mouth); // smile
    else if (mood === 'sad') p.rect(4, 7, 3, 1, mouth).px(3, 8, mouth).px(7, 8, mouth); // frown: corners turned down
    else p.rect(4, 7, 3, 1, mouth).px(3, 4, EYE).px(7, 4, EYE); // angry: tight mouth, hard brows
  }

  // Body; arms swing opposite to the legs.
  p.rect(1, 9, 9, 6, shirt).rect(8, 9, 2, 6, darker(shirt));
  const swing = frame === 0 ? 0 : frame === 1 ? -1 : 1;
  p.rect(0, 10, 1, 4 + swing, shirt).px(0, 14 + swing, skin);
  p.rect(10, 10, 1, 4 - swing, darker(shirt)).px(10, 14 - swing, skin);

  // Legs: one foot lifts each step.
  p.rect(2, 15, 7, 2, pants);
  const left = frame === 1 ? 1 : 0;
  const right = frame === 2 ? 1 : 0;
  p.rect(2, 17, 3, 3 - left, pants).rect(2, 20 - left, 3, 1, SHOE);
  p.rect(6, 17, 3, 3 - right, darker(pants)).rect(6, 20 - right, 3, 1, SHOE);
}

/** Facing left. */
function side(p: PixelPainter, look: Look, frame: 0 | 1 | 2): void {
  const { hair, skin, shirt, pants } = look;
  // Head in profile: hair at the back (right), face and nose at the front (left).
  p.rect(2, 2, 7, 7, skin).px(1, 5, skin);
  p.rect(3, 1, 5, 1, hair).rect(2, 2, 7, 1, hair).rect(6, 3, 3, 4, hair).px(2, 3, hair);
  p.px(7, 5, skin); // ear
  p.px(3, 5, EYE).px(3, 7, darker(skin, 0.6));

  // Body (narrower from the side) and the near arm.
  p.rect(2, 9, 7, 6, shirt).rect(7, 9, 2, 6, darker(shirt));
  const reach = frame === 1 ? -2 : frame === 2 ? 2 : 0;
  p.rect(4 + Math.sign(reach), 10, 2, 4, darker(shirt, 0.9)).rect(4 + reach, 14, 2, 1, skin);

  // Legs: together when standing, apart mid-step.
  p.rect(3, 15, 5, 2, pants);
  if (frame === 0) {
    p.rect(3, 17, 5, 3, pants).rect(2, 20, 5, 1, SHOE);
  } else {
    const [front, back] = frame === 1 ? [pants, darker(pants)] : [darker(pants), pants];
    p.rect(1, 17, 3, 3, front).rect(0, 20, 4, 1, SHOE);
    p.rect(7, 17, 3, 3, back).rect(7, 20, 3, 1, SHOE);
  }
}

/** Little bubbles that float over a walker's head (9×9): a rain cloud (sad) or an anger mark (angry). */
export function emote(p: PixelPainter, mood: 'sad' | 'angry'): void {
  if (mood === 'sad') {
    const cloud = 0x8e96a3;
    p.rect(1, 2, 7, 3, cloud).rect(2, 1, 3, 1, cloud).rect(5, 0, 2, 2, cloud).rect(0, 3, 9, 2, cloud).rect(1, 4, 7, 1, 0x6f7785);
    p.px(2, 6, 0x5fa8e8).px(5, 7, 0x5fa8e8).px(7, 6, 0x5fa8e8).px(3, 8, 0x5fa8e8);
  } else {
    // A red "anger" mark: four bent strokes around a center.
    const red = 0xe23b3b;
    p.rect(1, 0, 2, 3, red).px(3, 3, red).rect(6, 0, 2, 3, red).px(5, 3, red);
    p.rect(1, 6, 2, 3, red).px(3, 5, red).rect(6, 6, 2, 3, red).px(5, 5, red);
  }
}
