import type { Look } from './illustrations/common';
import type { PixelPainter } from './pixel';

/** Close-up portrait for the HUD (26×26 art px): head and shoulders. */
export const PORTRAIT_SIZE = 26;

const mix = (a: number, b: number, t: number) => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/**
 * Alex's face. "healthy" = warm, bright eyes, smile. "sickly" (after the data
 * center) = paler, greenish skin, dark circles, tired half-closed eyes, a
 * frown and a bead of sweat.
 */
/** "healthy" (smiling), "sickly" (Alex after the data center: pale and tired) or "sad" (normal color, downcast). */
export type PortraitState = 'healthy' | 'sickly' | 'sad';

export function portrait(p: PixelPainter, look: Look, state: PortraitState): void {
  const sick = state === 'sickly';
  const sad = state === 'sad';
  const skin = sick ? mix(look.skin, 0x9aa57a, 0.28) : look.skin;
  const shade = mix(skin, 0x000000, 0.25);
  const bg = sick ? 0x8e968a : 0x8fc7e8;
  const eye = 0x120c0a;

  p.rect(0, 0, 26, 26, bg);
  if (!sick) p.rect(0, 0, 26, 6, mix(bg, 0xffffff, 0.25));
  else p.dither(0, 0, 26, 26, 0x6f7768, 0.5);

  // Shoulders and collar.
  p.rect(3, 21, 20, 5, look.shirt)
    .rect(3, 21, 20, 1, mix(look.shirt, 0xffffff, 0.2))
    .rect(11, 21, 4, 2, skin);
  // Neck and head.
  p.rect(10, 18, 6, 4, shade);
  p.rect(6, 6, 14, 14, skin).rect(7, 5, 12, 1, skin).rect(7, 20, 12, 1, skin);
  p.rect(5, 11, 1, 4, skin).rect(20, 11, 1, 4, skin); // ears
  p.rect(18, 7, 2, 12, shade).rect(7, 19, 12, 1, shade);
  // Short curly hair.
  p.rect(6, 2, 14, 4, look.hair).rect(5, 4, 16, 3, look.hair).rect(5, 7, 2, 3, look.hair).rect(19, 7, 2, 3, look.hair);
  for (const [x, y] of [
    [7, 2],
    [11, 1],
    [15, 2],
    [9, 4],
    [13, 3],
    [17, 4],
  ])
    p.px(x, y, mix(look.hair, 0xffffff, 0.18));

  // Outfit details for named characters: a straw hat, a collar and tie.
  if (look.hat !== undefined) {
    p.rect(7, 0, 12, 4, look.hat)
      .rect(2, 4, 22, 2, look.hat)
      .rect(7, 3, 12, 1, mix(look.hat, 0x000000, 0.25));
  }
  if (look.tie !== undefined) {
    p.rect(9, 21, 3, 2, 0xffffff).rect(14, 21, 3, 2, 0xffffff).rect(12, 21, 2, 5, look.tie);
  }

  if (sick) {
    // Tired, half-closed eyes with dark circles.
    p.rect(8, 12, 3, 1, eye).rect(15, 12, 3, 1, eye);
    p.rect(8, 13, 3, 1, 0x5a3f5e).rect(15, 13, 3, 1, 0x5a3f5e);
    p.rect(8, 10, 3, 1, shade).rect(15, 10, 3, 1, shade); // drooping brows
    // Frown.
    p.rect(11, 16, 4, 1, 0x3a1812).px(10, 17, 0x3a1812).px(15, 17, 0x3a1812);
    // Sweat drop.
    p.px(20, 8, 0xbfe6ff).rect(20, 9, 2, 2, 0x8fd0f5);
  } else if (sad) {
    // Downcast: eyes looking down under drooping brows, a frown.
    p.rect(9, 12, 2, 1, eye).rect(15, 12, 2, 1, eye);
    p.px(8, 10, shade).px(9, 9, shade).px(17, 10, shade).px(16, 9, shade);
    p.rect(11, 16, 4, 1, 0x3a1812).px(10, 17, 0x3a1812).px(15, 17, 0x3a1812);
  } else {
    p.rect(9, 11, 2, 2, eye).rect(15, 11, 2, 2, eye).px(9, 11, 0xffffff).px(15, 11, 0xffffff);
    p.rect(8, 14, 2, 1, 0xf28b82, 0.5).rect(16, 14, 2, 1, 0xf28b82, 0.5);
    p.px(10, 16, 0x3a1812).rect(11, 17, 4, 1, 0x3a1812).px(15, 16, 0x3a1812);
  }
}
