import { dataCenter } from '../buildings';
import type { PixelPainter } from '../pixel';
import {
  ALEX,
  PERSON_H,
  PERSON_W,
  TOWNSFOLK,
  hills,
  meadow,
  person,
  rand,
  seeded,
  sky,
  stump,
  type Illustration,
  type Look,
} from './common';

const GROUND = 128;
const GRAY_SKY = [0x6e7684, 0x77808d, 0x818996, 0x8b939f, 0x959ca7, 0x9fa5ae, 0xa8adb5, 0xb0b4ba, 0xb7bbbf, 0xbdc0c2];

/** Signs carry pictures, not words: a crossed-out data center, a water drop, a heart, a lungs-and-cloud. */
type SignPicture = 'no-dc' | 'water' | 'heart' | 'air';

function sign(p: PixelPainter, picture: SignPicture): void {
  p.rect(7, 13, 2, 12, 0x8a5a2b); // stick
  p.rect(0, 0, 16, 13, 0xfff4d6)
    .rect(0, 0, 16, 1, 0x5b3a1e)
    .rect(0, 12, 16, 1, 0x5b3a1e)
    .rect(0, 0, 1, 13, 0x5b3a1e)
    .rect(15, 0, 1, 13, 0x5b3a1e);
  const ink = 0x3a2412;
  const red = 0xd62828;
  switch (picture) {
    case 'no-dc':
      p.rect(4, 5, 8, 5, 0x8a919a).rect(5, 3, 2, 2, 0x8a919a).rect(9, 3, 2, 2, 0x8a919a);
      for (let i = 0; i < 9; i++) p.px(3 + i, 2 + i, red).px(4 + i, 2 + i, red);
      break;
    case 'water':
      p.disc(8, 8, 3, 0x5fa8e8).rect(7, 3, 3, 3, 0x5fa8e8).px(8, 2, 0x5fa8e8).px(7, 7, 0xffffff);
      break;
    case 'heart':
      p.disc(6, 5, 2, red).disc(10, 5, 2, red).rect(4, 6, 9, 2, red).rect(5, 8, 7, 1, red).rect(6, 9, 5, 1, red).rect(7, 10, 3, 1, red);
      break;
    case 'air':
      p.disc(5, 6, 2, 0x9aa0a8).disc(9, 5, 3, 0x9aa0a8).disc(12, 7, 2, 0x9aa0a8).rect(4, 7, 9, 2, 0x9aa0a8);
      p.rect(3, 10, 10, 1, ink);
      break;
  }
}

/** Neighbors (Alex among them) stand together with picture signs outside the data center fence. */
export const townTogether: Illustration = {
  paint(p) {
    const rng = seeded(66);
    sky(p, GRAY_SKY, 118);
    hills(p, 100, 6, 30, 0.5, 0x6a7280);
    hills(p, 110, 5, 22, 2, 0x5f6a55, 0x6a755f);
    meadow(p, GROUND - 6, rng, { base: 0x8a8550, dark: 0x74703f, light: 0xa19b64, tuft: 0x66622f });
    // The data center behind its fence, a little hazy.
    dataCenter(p, 260, GROUND);
    p.rect(250, 30, 170, GROUND - 26, 0x9aa0a8, 0.25);
    for (const [x, y] of [
      [40, 150],
      [140, 158],
      [210, 146],
      [380, 160],
    ])
      stump(p, x, y);
  },

  animate(stage) {
    // Two rows of neighbors; some hold signs that bob as they chant.
    const crowd: { x: number; y: number; who: Look; key: string; sign?: SignPicture }[] = [
      { x: 30, y: 120, who: TOWNSFOLK[3], key: 'f3' },
      { x: 52, y: 118, who: TOWNSFOLK[7], key: 'f7', sign: 'water' },
      { x: 76, y: 121, who: TOWNSFOLK[1], key: 'f1' },
      { x: 100, y: 119, who: TOWNSFOLK[2], key: 'f2', sign: 'no-dc' },
      { x: 124, y: 120, who: TOWNSFOLK[9], key: 'f9' },
      { x: 148, y: 118, who: TOWNSFOLK[5], key: 'f5', sign: 'heart' },
      { x: 172, y: 121, who: TOWNSFOLK[8], key: 'f8' },
      { x: 196, y: 119, who: TOWNSFOLK[4], key: 'f4', sign: 'air' },
      { x: 42, y: 140, who: TOWNSFOLK[0], key: 'f0', sign: 'heart' },
      { x: 70, y: 142, who: TOWNSFOLK[6], key: 'f6' },
      { x: 96, y: 140, who: ALEX, key: 'alex', sign: 'water' },
      { x: 122, y: 142, who: TOWNSFOLK[2], key: 'f2b' },
      { x: 150, y: 140, who: TOWNSFOLK[7], key: 'f7b', sign: 'no-dc' },
      { x: 178, y: 142, who: TOWNSFOLK[5], key: 'f5b' },
    ];
    for (const c of crowd) {
      const body = stage.sprite(`illu-together-${c.key}`, PERSON_W, PERSON_H, (p) => person(p, c.who, 'stand', 'neutral'), c.x, c.y);
      if (c.sign) {
        const s = stage.sprite(`illu-sign-${c.sign}`, 16, 25, (p) => sign(p, c.sign!), c.x - 3, c.y - 20);
        stage.scene.tweens.add({ targets: s, y: s.y - stage.px(2), duration: rand(380, 520), yoyo: true, repeat: -1, delay: rand(0, 600) });
      } else {
        stage.scene.tweens.add({
          targets: body,
          y: body.y - stage.px(1),
          duration: rand(400, 600),
          yoyo: true,
          repeat: -1,
          delay: rand(0, 900),
          repeatDelay: rand(500, 1500),
        });
      }
    }
  },
};
