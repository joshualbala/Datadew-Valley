import { C } from '../palette';
import { bush, oak, pine } from '../props';
import {
  ALEX,
  COTTAGE_DOOR_X,
  COTTAGE_W,
  PERSON_H,
  cottage,
  driftAcross,
  flowers,
  gridOf,
  hills,
  meadow,
  picketFence,
  picketFenceSide,
  rand,
  river,
  seeded,
  sky,
  wavingPerson,
  type Illustration,
} from './common';

// Zoomed in (3× pixels) so Alex and the house fill the picture. Art grid: 280×120.
const SCALE = 3;
const GROUND = 70; // where the meadow starts
const COTTAGE_X = 34;
const COTTAGE_Y = 94; // cottage ground line
const YARD_LEFT = 16;
const YARD_RIGHT = 166;
const YARD_BACK = 80;
const YARD_FRONT = 104;
const DOOR_X = COTTAGE_X + COTTAGE_DOOR_X;
const GATE: [number, number] = [DOOR_X - 2, DOOR_X + 12];
const ALEX_X = DOOR_X + 14;
const ALEX_FEET = 109;
const riverLine = (x: number) => 115 + Math.round(2 * Math.sin(x / 20) + Math.sin(x / 7));

/** Before: Alex at the garden gate of their cottage, the woods by the river, a sunny morning. */
export const valleyHome: Illustration = {
  scale: SCALE,

  paint(p) {
    const area = gridOf(valleyHome);
    const rng = seeded(11);
    sky(p, C.sky, 66, area);
    p.disc(236, 20, 13, C.sunGlow, 0.35).disc(236, 20, 10, C.sunGlow, 0.6).disc(236, 20, 7, C.sun).disc(234, 18, 3, C.sunCore);
    hills(p, 52, 4, 26, 0.5, C.mountain, undefined, area);
    hills(p, 60, 3, 20, 2, C.hillFar, C.hillFarShade, area);
    hills(p, 66, 3, 16, 4, C.hillNear, C.hillNearLight, area);
    meadow(p, GROUND, rng, undefined, area);

    // The woods by the river (these get cleared later in the story).
    for (let x = 186; x < area.w; x += rng.between(9, 13)) pine(p.at(x, GROUND - 38 + rng.between(-3, 2)));
    for (let x = 196; x < area.w; x += rng.between(14, 20)) oak(p.at(x, GROUND - 22 + rng.between(0, 5)));
    oak(p.at(-8, GROUND - 26));

    // Back and side fences of the yard (behind the house).
    picketFence(p, YARD_LEFT, YARD_RIGHT, YARD_BACK);
    picketFenceSide(p, YARD_LEFT, YARD_BACK, YARD_FRONT);
    picketFenceSide(p, YARD_RIGHT, YARD_BACK, YARD_FRONT);

    // Vegetable garden and sunflowers inside the yard.
    const gx = COTTAGE_X + COTTAGE_W + 10;
    for (let row = 0; row < 3; row++) {
      const ry = 84 + row * 7;
      p.rect(gx, ry, 52, 3, 0x7a5232).rect(gx, ry + 3, 52, 1, 0x5e3e24);
      for (let i = 0; i < 9; i++) {
        p.px(gx + 2 + i * 6, ry - 1, C.leafLight)
          .px(gx + 3 + i * 6, ry - 2, C.leaf)
          .px(gx + 1 + i * 6, ry - 1, C.leaf);
        if (row === 1 && i % 3 === 0) p.px(gx + 2 + i * 6, ry, 0xe0483e); // tomatoes
      }
    }
    for (const sx of [YARD_RIGHT - 8, YARD_RIGHT - 14]) {
      p.rect(sx, 72, 1, 20, C.tuft)
        .px(sx + 1, 82, C.leaf)
        .px(sx - 1, 86, C.leaf);
      p.disc(sx, 70, 3, 0xffd23f).disc(sx, 70, 1, 0x7a4a24);
    }

    cottage(p, COTTAGE_X, COTTAGE_Y);
    bush(p.at(COTTAGE_X - 14, COTTAGE_Y - 10));

    // Stone path from the door, out through the gate, down to the river.
    for (let y = COTTAGE_Y + 1; y < riverLine(DOOR_X) - 6; y += 3) {
      p.rect(DOOR_X + 1 + (y % 2), y, 3, 2, C.stoneShade).rect(DOOR_X + 5 - (y % 2), y + 1, 3, 2, C.stoneShade);
    }

    // Front fence, with the gate standing open.
    picketFence(p, YARD_LEFT, YARD_RIGHT, YARD_FRONT, GATE);
    p.rect(GATE[0] - 1, YARD_FRONT - 9, 2, 9, 0xd9c9a3).rect(GATE[1] - 1, YARD_FRONT - 9, 2, 9, 0xd9c9a3);
    for (let i = 0; i < 4; i++) p.rect(GATE[0] - 4 - i, YARD_FRONT - 7 + i * 2, 1, 6, 0xfaf3e3); // swung-open gate

    river(p, rng, undefined, { line: riverLine, half: 4, area });
    flowers(p, rng, GROUND + 3, 70, riverLine, area);
  },

  animate(stage) {
    const area = gridOf(valleyHome);

    // Alex waving side to side at the gate.
    wavingPerson(stage, 'illu-alex', ALEX, ALEX_X, ALEX_FEET - PERSON_H);

    // Smoke from the chimney.
    stage.every(700, () => {
      const puff = stage.sprite('illu-puff', 5, 5, (p) => p.disc(2, 2, 2, 0xffffff), COTTAGE_X + COTTAGE_W - 11, COTTAGE_Y - 46);
      puff.setAlpha(0.7);
      stage.scene.tweens.add({
        targets: puff,
        y: puff.y - stage.px(rand(12, 18)),
        x: puff.x + stage.px(rand(3, 8)),
        scale: 2,
        alpha: 0,
        duration: 2800,
        onComplete: () => puff.destroy(),
      });
    });

    // Drifting clouds.
    for (const [x, y, ms] of [
      [30, 10, 60000],
      [140, 26, 80000],
    ] as const) {
      const cloud = stage.sprite(
        'illu-cloud',
        36,
        12,
        (p) => {
          p.disc(9, 7, 5, C.cloud)
            .disc(18, 5, 6, C.cloud)
            .disc(27, 7, 5, C.cloud)
            .rect(4, 8, 28, 4, C.cloud)
            .rect(5, 10, 26, 2, C.cloudShade);
        },
        x,
        y,
      );
      driftAcross(stage, cloud, ms, area);
    }

    // Sparkles on the water.
    for (let i = 0; i < 8; i++) {
      const x = rand(4, area.w - 4);
      const s = stage.sprite(
        'illu-sparkle',
        3,
        3,
        (p) => p.px(1, 0, 0xffffff).rect(0, 1, 3, 1, 0xffffff).px(1, 2, 0xffffff),
        x,
        riverLine(x) + rand(-2, 1),
      );
      s.setAlpha(0);
      stage.scene.tweens.add({
        targets: s,
        alpha: 0.9,
        duration: 450,
        yoyo: true,
        repeat: -1,
        delay: rand(0, 3000),
        repeatDelay: rand(1200, 3500),
      });
    }

    // A butterfly over the garden.
    const b = stage.sprite(
      'illu-butterfly',
      5,
      3,
      (p) => p.rect(0, 0, 2, 2, 0xff9ad5).rect(3, 0, 2, 2, 0xff9ad5).px(2, 1, 0x3a2a1a),
      COTTAGE_X + COTTAGE_W + 14,
      76,
    );
    stage.scene.tweens.add({ targets: b, x: b.x + stage.px(36), duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    stage.scene.tweens.add({ targets: b, y: b.y - stage.px(5), duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },
};
