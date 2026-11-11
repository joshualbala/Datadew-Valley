import type { PixelPainter } from '../pixel';
import { C } from '../palette';
import { pine } from '../props';
import {
  ALEX,
  COTTAGE_W,
  IW,
  PERSON_H,
  PERSON_W,
  cottage,
  driftAcross,
  hills,
  meadow,
  person,
  rand,
  river,
  seeded,
  sky,
  stump,
  type Illustration,
} from './common';

const GROUND = 120;
const ROAD_Y = 150;
const HOUSE_X = 14;
const HOUSE_GROUND = GROUND + 6;
const ALEX_FEET = GROUND + 24;
const SITE_X = 150; // cleared land starts here
const FRAME_X = 250;
const CRANE_X = 384;
const DIRT = 0x9c7a54;
const DIRT_DARK = 0x7f6142;
const DIRT_LIGHT = 0xb8956a;
const STEEL = 0x8a8f99;
const STEEL_DARK = 0x5f646e;
const YELLOW = 0xf2b632;
const YELLOW_DARK = 0xc48a1c;

/** Dusty, hazier sky than the "before" pictures. */
const HAZY_SKY = [0x8fb8d6, 0x9bbfd8, 0xa7c6da, 0xb2ccdb, 0xbdd2dc, 0xc7d6d8, 0xd0d8d2, 0xd8d9cb, 0xdfd8c2, 0xe4d6b8];

/** Bulldozers clear the woods by the river while a steel frame goes up. */
export const construction: Illustration = {
  paint(p) {
    const rng = seeded(33);
    sky(p, HAZY_SKY, 110);
    hills(p, 94, 6, 30, 0.5, 0x9fb0c8);
    hills(p, 106, 5, 22, 2, 0x9cc47e, 0x8ab46c);
    hills(p, 114, 4, 18, 4, 0x77b056, 0x86bd62);
    meadow(p, GROUND, rng);

    // Cleared land: bare dirt with tire tracks where the woods used to be.
    for (let x = SITE_X; x < IW; x++) {
      const edge = GROUND - 2 + Math.round(2 * Math.sin(x / 7));
      p.rect(x, edge, 1, ROAD_Y - edge, DIRT);
    }
    p.dither(SITE_X, GROUND, IW - SITE_X, 2, C.meadowDark);
    for (let i = 0; i < 260; i++) p.px(rng.between(SITE_X, IW), rng.between(GROUND + 1, ROAD_Y - 1), rng.pick([DIRT_DARK, DIRT_LIGHT]));
    for (let x = SITE_X + 10; x < IW; x += 3) p.px(x, GROUND + 18, DIRT_DARK).px(x + 1, GROUND + 22, DIRT_DARK);
    // Dirt piles.
    for (const [x, r] of [
      [176, 7],
      [212, 5],
    ])
      p.halfDisc(x, GROUND + 14, r, DIRT_DARK).halfDisc(x - 1, GROUND + 13, r - 2, DIRT_LIGHT);

    // Stumps where trees stood, plus a stack of felled logs.
    for (const [x, y] of [
      [160, 126],
      [188, 140],
      [232, 128],
      [372, 140],
      [404, 130],
      [338, 142],
    ])
      stump(p, x, y);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3 - i; j++) {
        const lx = 352 + j * 8 + i * 4;
        const ly = GROUND + 12 - i * 4;
        p.rect(lx, ly, 8, 4, C.trunk)
          .disc(lx + 7, ly + 2, 2, 0xd9b47a)
          .px(lx + 7, ly + 2, 0xb8956a);
      }
    }
    // The last few trees at the edge.
    pine(p.at(404, GROUND - 40));
    pine(p.at(132, GROUND - 42));

    // Steel frame going up (taller on the right where work started first).
    for (let i = 0; i < 6; i++) {
      const cx = FRAME_X + i * 20;
      const h = 34 + i * 6;
      p.rect(cx, GROUND - h, 3, h, STEEL).rect(cx + 2, GROUND - h, 1, h, STEEL_DARK);
      for (let by = GROUND - 12; by > GROUND - h; by -= 12) {
        if (i < 5) p.rect(cx, by, 20, 2, STEEL).rect(cx, by + 1, 20, 1, STEEL_DARK);
        if (i < 5 && (i + by) % 2 === 0) for (let d = 0; d < 12; d++) p.px(cx + 3 + Math.round(d * 1.4), by + 1 - d, STEEL_DARK);
      }
    }

    // Tower crane.
    for (let y = 18; y < GROUND; y++) {
      p.px(CRANE_X, y, YELLOW_DARK).px(CRANE_X + 5, y, YELLOW_DARK);
      if (y % 6 === 0) p.rect(CRANE_X, y, 6, 1, YELLOW);
      if (y % 6 < 3) p.px(CRANE_X + 1 + (y % 6), y, YELLOW);
    }
    p.rect(CRANE_X - 1, 14, 8, 6, YELLOW).rect(CRANE_X, 15, 5, 3, C.glass);
    p.rect(280, 12, IW - 280, 3, YELLOW).rect(280, 14, IW - 280, 1, YELLOW_DARK);
    for (let x = 282; x < IW; x += 6) p.px(x + 2, 13, YELLOW_DARK);
    p.rect(IW - 14, 15, 10, 6, 0x5f646e);
    p.rect(CRANE_X + 2, 4, 1, 10, YELLOW_DARK).px(CRANE_X + 2, 3, 0xd9534f);

    // Gravel road between the site and the river.
    p.rect(0, ROAD_Y, IW, 8, 0xa89e8c)
      .rect(0, ROAD_Y, IW, 1, 0x8c8272)
      .rect(0, ROAD_Y + 7, IW, 1, 0x8c8272);
    for (let i = 0; i < 120; i++) p.px(rng.between(0, IW), rng.between(ROAD_Y + 1, ROAD_Y + 6), rng.pick([0x8c8272, 0xc2b8a5]));

    // Orange-and-white barriers along the road.
    for (let x = SITE_X + 6; x < IW - 10; x += 26) {
      p.rect(x, ROAD_Y - 7, 14, 4, 0xf28c28)
        .rect(x + 4, ROAD_Y - 7, 3, 4, 0xffffff)
        .rect(x + 10, ROAD_Y - 7, 2, 4, 0xffffff);
      p.rect(x + 1, ROAD_Y - 3, 1, 3, STEEL_DARK).rect(x + 12, ROAD_Y - 3, 1, 3, STEEL_DARK);
    }

    // Alex's cottage on the left, right next to it all.
    cottage(p, HOUSE_X, HOUSE_GROUND);
    river(p, rng);
  },

  animate(stage) {
    // Alex in the yard, upset.
    const ax = HOUSE_X + COTTAGE_W + 10;
    const ay = ALEX_FEET - PERSON_H;
    stage.sprite('illu-alex-upset', PERSON_W, PERSON_H, (p) => person(p, ALEX, 'stand', 'upset'), ax, ay);

    // Two thin red "!!" marks popping over Alex's head.
    const marks = stage.sprite(
      'illu-alarm',
      5,
      7,
      (p) => {
        for (const x of [0, 3])
          p.rect(x, 0, 1, 4, 0xff3b3b)
            .px(x, 5, 0xff3b3b)
            .rect(x + 1, 0, 1, 4, 0x8a1010)
            .px(x + 1, 5, 0x8a1010);
      },
      ax + Math.floor(PERSON_W / 2) - 2,
      ay - 9,
    );
    stage.scene.tweens.add({ targets: marks, y: marks.y - stage.px(2), duration: 260, yoyo: true, repeat: -1, ease: 'Sine.out' });
    stage.every(1600, () => {
      marks.setVisible(false);
      stage.scene.time.delayedCall(250, () => marks.setVisible(true));
    });

    // Bulldozer pushing dirt back and forth.
    const dozer = stage.sprite('illu-bulldozer', 28, 15, bulldozer, 168, GROUND + 6);
    stage.scene.tweens.add({ targets: dozer, x: dozer.x + stage.px(56), duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    stage.every(260, () => {
      const dust = stage.sprite('illu-dust', 6, 6, (p) => p.disc(3, 3, 2, 0xd8c4a0), 0, 0);
      dust.setPosition(dozer.x + stage.px(rand(20, 26)), dozer.y + stage.px(rand(8, 11))).setAlpha(0.8);
      stage.scene.tweens.add({
        targets: dust,
        y: dust.y - stage.px(rand(6, 12)),
        x: dust.x + stage.px(rand(-4, 6)),
        scale: 2.4,
        alpha: 0,
        duration: 1600,
        onComplete: () => dust.destroy(),
      });
    });

    // Crane hook swinging gently, carrying a steel beam.
    const hook = stage.sprite(
      'illu-hook',
      22,
      40,
      (p) => {
        p.rect(10, 0, 1, 32, 0x3a3a3a).rect(8, 32, 5, 2, 0x3a3a3a);
        p.rect(0, 34, 22, 3, STEEL).rect(0, 36, 22, 1, STEEL_DARK);
      },
      300,
      15,
    );
    stage.scene.tweens.add({ targets: hook, x: hook.x + stage.px(36), duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Trucks rumbling past on the road.
    const truck = stage.sprite('illu-truck', 32, 15, dumpTruck, -40, ROAD_Y - 9);
    driftAcross(stage, truck, 9000);
  },
};

function bulldozer(p: PixelPainter): void {
  // Tracks.
  p.rect(4, 11, 22, 4, 0x2e2e2e).rect(5, 12, 20, 2, 0x4a4a4a);
  for (let x = 6; x < 25; x += 3) p.px(x, 12, 0x2e2e2e);
  // Body and cab.
  p.rect(6, 5, 18, 6, YELLOW).rect(6, 10, 18, 1, YELLOW_DARK);
  p.rect(14, 0, 9, 6, YELLOW).rect(15, 1, 7, 4, C.glass).px(16, 2, C.glassHi);
  p.rect(9, 2, 2, 3, 0x3a3a3a);
  // Blade on the front (left).
  p.rect(0, 6, 3, 9, 0x8a8f99).rect(3, 9, 3, 2, YELLOW_DARK);
}

function dumpTruck(p: PixelPainter): void {
  // Bed full of dirt.
  p.rect(0, 3, 20, 8, 0x8a8f99).rect(0, 10, 20, 1, 0x5f646e);
  p.halfDisc(10, 4, 8, DIRT).px(7, 1, DIRT_LIGHT).px(12, 0, DIRT_LIGHT);
  // Cab (right, facing the direction of travel).
  p.rect(21, 3, 10, 8, 0xd9534f).rect(24, 4, 6, 4, C.glass).px(25, 5, C.glassHi);
  p.rect(0, 11, 32, 1, 0x3a3a3a);
  // Wheels.
  for (const x of [5, 15, 26]) p.disc(x, 12, 2, 0x2e2e2e).px(x, 12, 0x9a9a9a);
}
