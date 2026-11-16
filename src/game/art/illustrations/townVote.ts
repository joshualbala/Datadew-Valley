import { townHall } from '../buildings';
import { C } from '../palette';
import { bush, oak } from '../props';
import { tinyText, tinyTextWidth } from '../tinyFont';
import {
  ALEX,
  PERSON_H,
  PERSON_W,
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
} from './common';
import { signHolder } from './signs';

// Zoomed in like the town meeting (3× pixels). Art grid: 280×120, center x = 140.
const SCALE = 3;
const MID = 140;
const GROUND = 108;
const HALL_X = MID - 60;
const BLUE = 0x2e6fd6;
const BLUES = [0x2e6fd6, 0x5fa8e8, 0x1f4fa8, 0x8cc4f2];
const VOTER_Y = GROUND - PERSON_H - 1;

/** Used when the slide gives no "signs" in its sequence file. */
const DEFAULT_SIGNS = ['VOTE FOR|WATER', 'PASS THE|BILL'];

/**
 * Election day, the "blue wave": neighbors line up at a ballot box outside the
 * town hall under blue bunting, a few holding signs for the new bill.
 */
export const townVote: Illustration = {
  scale: SCALE,

  paint(p) {
    const area = gridOf(townVote);
    const rng = seeded(31);
    sky(p, C.sky, 84, area);
    hills(p, 72, 4, 26, 1, C.mountain, undefined, area);
    hills(p, 80, 3, 20, 3, C.hillFar, C.hillFarShade, area);
    hills(p, 86, 3, 16, 5, C.hillNear, C.hillNearLight, area);
    meadow(p, 92, rng, undefined, area);
    oak(p.at(-10, GROUND - 38));
    bush(p.at(250, GROUND - 10));
    townHall(p, HALL_X, GROUND, { flagpole: false, wingRoofs: false, belfry: false });

    // "VOTE TODAY" banner across the front of the hall.
    const label = 'VOTE TODAY';
    const bw = tinyTextWidth(label) + 8;
    p.rect(MID - bw / 2, 69, bw, 9, BLUE)
      .rect(MID - bw / 2, 69, bw, 1, 0x1f4fa8)
      .rect(MID - bw / 2, 77, bw, 1, 0x1f4fa8);
    tinyText(p, label, MID - bw / 2 + 4, 71, 0xffffff);

    // Blue bunting strung across, all shades of blue.
    const pole = 0x6b4423;
    const left = MID - 66;
    const right = MID + 66;
    const by = 46;
    p.rect(left - 1, by, 2, GROUND + 2 - by, pole).rect(right - 1, by, 2, GROUND + 2 - by, pole);
    for (let x = left + 1; x < right - 1; x += 5) {
      const y = by + Math.round(8 * Math.sin(((x - left) / (right - left)) * Math.PI));
      p.rect(x, y, 5, 1, 0x3a2412);
      const flag = BLUES[Math.floor((x - left) / 5) % BLUES.length];
      p.rect(x + 1, y + 1, 3, 2, flag).px(x + 2, y + 3, flag);
    }

    // Polling table with a ballot box.
    p.rect(36, 96, 26, 3, 0x8a5a2b).rect(38, 99, 2, 9, 0x6b4423).rect(58, 99, 2, 9, 0x6b4423);
    p.rect(40, 85, 18, 11, BLUE).rect(40, 85, 18, 1, 0x8cc4f2).rect(45, 86, 8, 1, 0x1a1a1a);
    tinyText(p, 'VOTE', 41, 89, 0xffffff);
  },

  animate(stage) {
    // A line of voters waiting at the ballot box, each with a blue "I voted" sticker.
    const line: { x: number; who: Look; key: string }[] = [
      { x: 2, who: TOWNSFOLK[1], key: 'v1' },
      { x: 14, who: TOWNSFOLK[6], key: 'v6' },
      { x: 26, who: TOWNSFOLK[3], key: 'v3' },
      { x: 64, who: ALEX, key: 'alex' },
      { x: 158, who: TOWNSFOLK[0], key: 'v0' },
      { x: 172, who: TOWNSFOLK[8], key: 'v8' },
    ];
    for (const v of line) {
      const body = stage.sprite(`illu-vote-${v.key}`, PERSON_W, PERSON_H, (p) => person(p, v.who, 'stand', 'happy'), v.x, VOTER_Y);
      const sticker = stage.sprite('illu-vote-sticker', 2, 2, (p) => p.rect(0, 0, 2, 2, BLUE), v.x + 3, VOTER_Y + 11);
      stage.scene.tweens.add({
        targets: [body, sticker],
        y: `-=${stage.px(1)}`,
        duration: rand(400, 600),
        yoyo: true,
        repeat: -1,
        delay: rand(0, 900),
        repeatDelay: rand(600, 1600),
      });
    }
    // Neighbors holding blue signs for the new bill.
    const words = stage.signs.length ? stage.signs : DEFAULT_SIGNS;
    signHolder(stage, 'illu-vote-s1', TOWNSFOLK[5], 204, VOTER_Y, words[0 % words.length], { mood: 'happy', ink: BLUE });
    signHolder(stage, 'illu-vote-s2', TOWNSFOLK[9], 246, VOTER_Y, words[1 % words.length], { mood: 'happy', ink: BLUE });
  },
};
