import { dataCenter } from '../buildings';
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
import { signHolder } from './signs';

const GROUND = 128;
const GRAY_SKY = [0x6e7684, 0x77808d, 0x818996, 0x8b939f, 0x959ca7, 0x9fa5ae, 0xa8adb5, 0xb0b4ba, 0xb7bbbf, 0xbdc0c2];

/** Used when the slide gives no "signs" in its sequence file. */
const DEFAULT_SIGNS = ['SAVE OUR|WATER', 'NO DATA|CENTER', 'CLEAN|AIR NOW', 'OUR|HEALTH', "WE CAN'T|SLEEP"];

/** Neighbors (Alex among them) stand together holding protest signs outside the data center fence. */
export const townTogether: Illustration = {
  paint(p) {
    const rng = seeded(66);
    sky(p, GRAY_SKY, 118);
    hills(p, 100, 6, 30, 0.5, 0x6a7280);
    hills(p, 110, 5, 22, 2, 0x5f6a55, 0x6a755f);
    meadow(p, GROUND - 6, rng, { base: 0x8a8550, dark: 0x74703f, light: 0xa19b64, tuft: 0x66622f });
    // The data center behind its fence.
    dataCenter(p, 260, GROUND);
    // Haze across the whole width (no edges), thickest low down near the ground.
    for (let y = 20; y < GROUND + 4; y += 4) p.rect(0, y, 420, 4, 0x9aa0a8, 0.05 + (0.12 * (y - 20)) / (GROUND - 16));
    for (const [x, y] of [
      [40, 150],
      [140, 158],
      [210, 146],
      [380, 160],
    ])
      stump(p, x, y);
  },

  animate(stage) {
    // Two rows of neighbors; the back row holds signs up high (so they never cover a face) and chants.
    const crowd: { x: number; y: number; who: Look; key: string; sign?: boolean }[] = [
      { x: 30, y: 120, who: TOWNSFOLK[3], key: 'f3' },
      { x: 52, y: 118, who: TOWNSFOLK[7], key: 'f7', sign: true },
      { x: 76, y: 121, who: TOWNSFOLK[1], key: 'f1' },
      { x: 100, y: 119, who: TOWNSFOLK[2], key: 'f2', sign: true },
      { x: 124, y: 120, who: TOWNSFOLK[9], key: 'f9' },
      { x: 148, y: 118, who: TOWNSFOLK[5], key: 'f5', sign: true },
      { x: 172, y: 121, who: TOWNSFOLK[8], key: 'f8' },
      { x: 196, y: 119, who: TOWNSFOLK[4], key: 'f4', sign: true },
      { x: 42, y: 140, who: TOWNSFOLK[0], key: 'f0' },
      { x: 70, y: 142, who: TOWNSFOLK[6], key: 'f6' },
      { x: 96, y: 140, who: ALEX, key: 'alex' },
      { x: 122, y: 142, who: TOWNSFOLK[2], key: 'f2b' },
      { x: 150, y: 140, who: TOWNSFOLK[7], key: 'f7b' },
      { x: 178, y: 142, who: TOWNSFOLK[5], key: 'f5b' },
    ];
    const words = stage.signs.length ? stage.signs : DEFAULT_SIGNS;
    let n = 0;
    for (const c of crowd) {
      if (c.sign) {
        signHolder(stage, `illu-together-${c.key}`, c.who, c.x, c.y, words[n++ % words.length]);
        continue;
      }
      const body = stage.sprite(`illu-together-${c.key}`, PERSON_W, PERSON_H, (p) => person(p, c.who, 'stand', 'neutral'), c.x, c.y);
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
  },
};
