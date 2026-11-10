import { townHall } from '../buildings';
import type { PixelPainter } from '../pixel';
import { C } from '../palette';
import { bush, oak } from '../props';
import {
  ALEX,
  PERSON_H,
  PERSON_W,
  POINT_W,
  TOWNSFOLK,
  gridOf,
  hills,
  meadow,
  person,
  rand,
  seeded,
  sky,
  type Illustration,
  type Look,
  type Mood,
} from './common';

// Zoomed in (3× pixels). Art grid: 280×120, center x = 140.
const SCALE = 3;
const MID = 140;
const GROUND = 108; // town hall stands here
const HALL_X = MID - 60; // hall is 120 wide, centered
const BOARD_W = 66;
const BOARD_H = 44;
const BOARD_X = 206; // big blueprint easel, right of the hall
const BOARD_Y = 38;
const BUNTING = { left: MID - 66, right: MID + 66, y: 46, sag: 8 }; // centered on the frame, just outside the hall
const COUNCIL: Look = { hair: 0x2b1d14, skin: 0xc68642, shirt: 0x2f3e5c, pants: 0x1f2a3d, hairStyle: 'bun' };

/**
 * Two rows of neighbors on either side of the steps (row 0 = front, 1 = back).
 * `look` indexes TOWNSFOLK (-1 = Alex). Front-row looks are offset by 5 from the
 * back row so no one stands next to (or in front of) their twin.
 */
const CROWD: { x: number; row: number; look: number }[] = [
  { x: 6, row: 1, look: 0 }, { x: 30, row: 1, look: 1 }, { x: 54, row: 1, look: 2 }, { x: 80, row: 1, look: 3 }, { x: 103, row: 1, look: 4 },
  { x: 166, row: 1, look: 5 }, { x: 190, row: 1, look: 6 }, { x: 214, row: 1, look: 7 }, { x: 240, row: 1, look: 8 }, { x: 263, row: 1, look: 9 },
  { x: 18, row: 0, look: 5 }, { x: 42, row: 0, look: 6 }, { x: 66, row: 0, look: 7 }, { x: 92, row: 0, look: -1 },
  { x: 178, row: 0, look: 8 }, { x: 202, row: 0, look: 9 }, { x: 226, row: 0, look: 0 }, { x: 251, row: 0, look: 1 },
];

/** Top of a crowd row's sprites (row 1 = back, row 0 = front). */
const rowTop = (row: number) => (row === 1 ? 113 : 119) - PERSON_H;

/** The council presents the data center plan to the town outside the town hall. */
export const townMeeting: Illustration = {
  scale: SCALE,

  paint(p) {
    const area = gridOf(townMeeting);
    const rng = seeded(22);
    sky(p, C.sky, 84, area);
    hills(p, 72, 4, 26, 1, C.mountain, undefined, area);
    hills(p, 80, 3, 20, 3, C.hillFar, C.hillFarShade, area);
    hills(p, 86, 3, 16, 5, C.hillNear, C.hillNearLight, area);
    meadow(p, 92, rng, undefined, area);

    oak(p.at(-10, GROUND - 38));
    bush(p.at(52, GROUND - 10));
    townHall(p, HALL_X, GROUND, { flagpole: false, wingRoofs: false, belfry: false });

    // Bunting strung between two poles, centered on the picture.
    const pole = 0x6b4423;
    const { left, right, y: by, sag } = BUNTING;
    p.rect(left - 1, by, 2, GROUND + 2 - by, pole).rect(right - 1, by, 2, GROUND + 2 - by, pole);
    p.px(left - 1, by - 1, C.gold).px(right, by - 1, C.gold);
    for (let x = left + 1; x < right - 1; x += 5) {
      const y = by + Math.round(sag * Math.sin(((x - left) / (right - left)) * Math.PI));
      p.rect(x, y, 5, 1, 0x3a2412);
      const flag = C.flowers[Math.floor((x - left) / 5) % C.flowers.length];
      p.rect(x + 1, y + 1, 3, 2, flag).px(x + 2, y + 3, flag);
    }

    // Big easel with the data center plan (a blueprint drawing).
    blueprint(p, BOARD_X, BOARD_Y);
  },

  animate(stage) {
    // Council member at the podium, gesturing at the plan.
    const speakerTop = GROUND - 2 - PERSON_H;
    const speaker = stage.sprite('illu-council-point', POINT_W, PERSON_H, (p) => person(p, COUNCIL, 'point'), MID - 5, speakerTop);
    stage.scene.tweens.add({ targets: speaker, y: speaker.y - stage.px(1), duration: 600, yoyo: true, repeat: -1 });
    // Podium in front of the speaker (added after, so it covers their legs).
    stage.sprite('illu-podium', 14, 13, (p) => p.rect(1, 1, 12, 12, 0x8a5a2b).rect(0, 0, 14, 2, 0x6b4423).rect(5, 5, 4, 3, C.gold), MID - 7, GROUND - 14);

    // The crowd, back row first so the front row overlaps it. Heads bob as people murmur.
    for (const row of [1, 0]) {
      for (const spot of CROWD) {
        if (spot.row !== row) continue;
        const who = spot.look < 0 ? ALEX : TOWNSFOLK[spot.look];
        const mood: Mood = 'worried';
        const key = spot.look < 0 ? 'illu-alex' : `illu-folk-${spot.look}`;
        const img = stage.sprite(`${key}-${mood}`, PERSON_W, PERSON_H, (p) => person(p, who, 'stand', mood), spot.x, rowTop(row));
        stage.scene.tweens.add({
          targets: img,
          y: img.y - stage.px(1),
          duration: rand(300, 500),
          yoyo: true,
          repeat: -1,
          delay: rand(0, 1500),
          repeatDelay: rand(800, 2600),
        });
      }
    }

    // Worried murmurs: "?" and "!" bubbles pop up over the crowd.
    [questionMark, exclamation, questionMark].forEach((draw, i) => {
      const img = stage.sprite(`illu-bubble-${draw.name}`, 7, 10, draw, 0, 0);
      img.setVisible(false);
      stage.scene.time.delayedCall(i * 600, () =>
        stage.every(1800, () => {
          const spot = CROWD[rand(0, CROWD.length - 1)];
          img.setPosition(stage.x(spot.x + 2), stage.y(rowTop(spot.row) - 11)).setVisible(true);
          stage.scene.time.delayedCall(1000, () => img.setVisible(false));
        }),
      );
    });
  },
};

/** Speech bubble with a "?" (7×10). */
function questionMark(p: PixelPainter): void {
  bubble(p);
  p.rect(2, 1, 3, 1, 0x3a2412).px(5, 2, 0x3a2412).px(4, 3, 0x3a2412).px(3, 4, 0x3a2412).px(3, 6, 0x3a2412);
}

/** Speech bubble with a red "!" (7×10). */
function exclamation(p: PixelPainter): void {
  bubble(p);
  p.rect(3, 1, 1, 4, 0xd62828).px(3, 6, 0xd62828);
}

function bubble(p: PixelPainter): void {
  p.rect(1, 0, 5, 8, 0xffffff).rect(0, 1, 7, 6, 0xffffff).px(2, 8, 0xffffff).px(1, 9, 0xffffff);
}

/** A big blueprint of the data center on an easel. (x, y) = top-left of the board. */
function blueprint(p: PixelPainter, x: number, y: number): void {
  const w = BOARD_W;
  const h = BOARD_H;
  const wood = 0x8a5a2b;
  const woodDark = 0x5b3a1e;
  const paper = 0x1f54a8;
  const grid = 0x2d6fd6;
  const line = 0xffffff;
  // Easel legs and shelf.
  p.rect(x + 8, y + h - 4, 3, GROUND + 4 - (y + h - 4), wood).rect(x + w - 11, y + h - 4, 3, GROUND + 4 - (y + h - 4), wood);
  p.rect(x + w / 2 - 1, y - 6, 3, 8, wood).rect(x + w / 2 - 1, y + h, 3, GROUND - y - h, woodDark);
  p.rect(x - 3, y + h, w + 6, 3, wood).rect(x - 3, y + h + 2, w + 6, 1, woodDark);
  // Board with a bright frame.
  p.rect(x - 2, y - 2, w + 4, h + 4, 0xfff4d6).frame(x - 2, y - 2, w + 4, h + 4, woodDark);
  p.rect(x, y, w, h, paper);
  for (let gx = x + 4; gx < x + w; gx += 4) p.rect(gx, y, 1, h, grid);
  for (let gy = y + 4; gy < y + h; gy += 4) p.rect(x, gy, w, 1, grid);
  // The building: main hall, rooftop fans, two exhaust stacks.
  const bx = x + 8;
  const by = y + 16;
  p.frame(bx, by, 40, 18, line).rect(bx + 1, by + 6, 38, 1, line);
  for (let i = 0; i < 4; i++) p.frame(bx + 3 + i * 9, by - 4, 7, 4, line).px(bx + 6 + i * 9, by - 2, line);
  p.frame(bx + 30, by - 12, 4, 12, line).frame(bx + 35, by - 12, 4, 12, line);
  p.frame(bx + 4, by + 10, 7, 8, line); // door
  for (let i = 0; i < 6; i++) p.px(bx + 16 + i * 4, by + 12, line); // server lights
  // Fence (dashed) and dimension line.
  for (let fx = x + 4; fx < x + w - 4; fx += 3) p.px(fx, y + h - 6, line);
  p.rect(bx, y + h - 3, 40, 1, line).px(bx, y + h - 4, line).px(bx + 39, y + h - 4, line);
  // Title block in the corner.
  p.frame(x + w - 14, y + 3, 11, 9, line).rect(x + w - 12, y + 5, 7, 1, line).rect(x + w - 12, y + 8, 5, 1, line);
}
