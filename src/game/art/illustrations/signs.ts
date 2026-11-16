import type { PixelPainter } from '../pixel';
import { tinyLines } from '../tinyFont';
import { HOLD_HAND, PERSON_H, PERSON_W, person, rand, type IllustrationStage, type Look, type Mood } from './common';

/** Sign board size (art px) and the stick below it. */
const BOARD_W = 36;
const BOARD_H = 17;
const SIGN_H = 27;
const STICK_X = 17; // left column of the 2-px stick
/** Rows of the stick that sit lower than the hand (so the hand clearly grips it). */
const BELOW_HAND = 4;

/**
 * A protest sign with words (up to two lines of ~8 letters; "|" breaks the
 * line), on a stick, with the holder's hand painted gripping it.
 */
function paintSign(p: PixelPainter, text: string, skin: number, ink: number): void {
  const edge = 0x5b3a1e;
  p.rect(STICK_X, BOARD_H, 2, SIGN_H - BOARD_H, 0x8a5a2b); // stick
  p.rect(0, 0, BOARD_W, BOARD_H, 0xfff4d6)
    .rect(0, 0, BOARD_W, 1, edge)
    .rect(0, BOARD_H - 1, BOARD_W, 1, edge);
  p.rect(0, 0, 1, BOARD_H, edge).rect(BOARD_W - 1, 0, 1, BOARD_H, edge);
  const lines = text.split('|').length;
  tinyLines(p, text, BOARD_W / 2, lines > 1 ? 3 : 6, ink);
  // The hand around the stick.
  const handTop = SIGN_H - 1 - BELOW_HAND - 1;
  p.rect(STICK_X - 1, handTop, 4, 2, skin);
}

/**
 * Someone standing at (x, y) (top-left of their sprite) holding up a sign
 * with `text`. Person and sign bob together, as if chanting.
 */
export function signHolder(
  stage: IllustrationStage,
  key: string,
  who: Look,
  x: number,
  y: number,
  text: string,
  { mood = 'neutral' as Mood, ink = 0x3a2412 } = {},
): void {
  const body = stage.sprite(`${key}-hold-${mood}`, PERSON_W, PERSON_H, (p) => person(p, who, 'hold', mood), x, y);
  // Line the stick up with the raised hand.
  const signX = x + HOLD_HAND.x - 1 - STICK_X;
  const signY = y + HOLD_HAND.y + 1 + BELOW_HAND + 1 - (SIGN_H - 1);
  const sign = stage.sprite(
    `sign-${text}-${who.skin.toString(16)}-${ink.toString(16)}`,
    BOARD_W,
    SIGN_H,
    (p) => paintSign(p, text, who.skin, ink),
    signX,
    signY,
  );
  stage.scene.tweens.add({
    targets: [body, sign],
    y: `-=${stage.px(2)}`,
    duration: rand(380, 520),
    yoyo: true,
    repeat: -1,
    delay: rand(0, 600),
  });
}
