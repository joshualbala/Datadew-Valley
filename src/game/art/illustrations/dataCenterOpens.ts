import { dataCenter } from '../buildings';
import type { PixelPainter } from '../pixel';
import { pine } from '../props';
import {
  IH,
  IW,
  cottage,
  dirtPatch,
  hills,
  meadow,
  rand,
  river,
  seeded,
  sky,
  stump,
  type Illustration,
  type IllustrationStage,
} from './common';

const GROUND = 124;
/** The one data center: drawn 1.5× bigger than the map/title version (3 screen px per art px), left edge and ground line. */
const DC_SCALE = 1.5;
const DC_X = 196;
const DC_Y = 146;
const TOWER_X = 92;
/** Dusk tint for the data center sprite (it is added on top of the painted dusk wash). */
const DUSK_TINT = 0xc4b8d2;

const DUSK_SKY = [0x2b1d4a, 0x3a2558, 0x4f2d63, 0x6b3767, 0x8a4467, 0xa85563, 0xc66b5e, 0xe08a5c, 0xf0a865, 0xf6c47a];
const LED = [0x5cff8a, 0x5cff8a, 0x5cc8ff, 0xffd25c];

/** The finished data center at dusk: lit up, humming, the woods gone. */
export const dataCenterOpens: Illustration = {
  paint(p) {
    const rng = seeded(44);
    sky(p, DUSK_SKY, 120);
    // Low sun behind the hills.
    p.disc(60, 104, 14, 0xffd28a, 0.5).disc(60, 104, 10, 0xffc069);
    hills(p, 98, 6, 30, 0.5, 0x5a4a78);
    hills(p, 108, 5, 22, 2, 0x5a6052, 0x666c5c);
    hills(p, 116, 4, 18, 4, 0x6b6c48, 0x777852);
    // Tired, yellowed grass with bare dirt where the ground was torn up.
    meadow(p, GROUND, rng, { base: 0x8a8550, dark: 0x74703f, light: 0xa19b64, tuft: 0x66622f });
    for (const [x, y, rx, ry] of [[112, 134, 16, 5], [236, 152, 26, 6], [350, 150, 20, 5], [60, 160, 14, 4], [150, 160, 18, 4], [396, 158, 16, 4], [300, 128, 14, 3]]) {
      dirtPatch(p, x, y, rx, ry, rng);
    }

    // Transmission tower with power lines running to the data center.
    const tTop = 40;
    for (let y = tTop; y < GROUND + 4; y++) {
      const half = 2 + Math.round((y - tTop) / 9);
      p.px(TOWER_X - half, y, 0x3a3a4a).px(TOWER_X + half, y, 0x3a3a4a);
      if (y % 8 === 0) p.rect(TOWER_X - half, y, half * 2 + 1, 1, 0x3a3a4a);
      if (y % 8 < 4) p.px(TOWER_X - half + ((y % 8) * half) / 2, y, 0x3a3a4a);
    }
    p.rect(TOWER_X - 10, tTop + 6, 21, 1, 0x3a3a4a).rect(TOWER_X - 7, tTop + 14, 15, 1, 0x3a3a4a);
    for (const [ax, ay] of [[TOWER_X - 10, tTop + 6], [TOWER_X + 10, tTop + 6], [TOWER_X + 7, tTop + 14]]) {
      for (let x = 0; x <= IW - ax; x++) {
        const t = x / (IW - ax);
        p.px(ax + x, Math.round(ay + 10 * Math.sin(t * Math.PI) + t * 20), 0x2a2a38, 0.8);
      }
      for (let x = 0; x <= ax; x++) p.px(ax - x, Math.round(ay + 6 * Math.sin((x / ax) * Math.PI) + (x / ax) * 10), 0x2a2a38, 0.8);
    }

    // Cleared ground: stumps, one lonely pine. (The data center itself is a sprite, see animate.)
    for (const [x, y] of [[160, 150], [410, 156], [116, 146], [176, 160], [130, 158]]) stump(p, x, y);
    pine(p.at(150, GROUND - 48));

    // Alex's cottage, closer than anyone would want.
    cottage(p, 20, GROUND + 18, true);

    river(p, rng, { water: 0x4b7fa8, deep: 0x3d6d94, light: 0x8bb4cf, sand: 0xbfa678, bank: 0x3f6e33 });

    // Dusk wash over everything. Lights are added on top as sprites, so they stay bright.
    p.rect(0, 0, IW, IH, 0x2a1f4a, 0.28);
  },

  animate(stage) {
    // Stars.
    for (let i = 0; i < 14; i++) {
      const star = stage.sprite('illu-star', 1, 1, (p) => p.px(0, 0, 0xfff4d6), rand(110, IW - 4), rand(4, 50));
      stage.scene.tweens.add({ targets: star, alpha: 0.2, duration: rand(700, 1400), yoyo: true, repeat: -1, delay: rand(0, 2000) });
    }

    // The data center: same drawing as on the title screen and map, half again as big.
    const tex = 'illu-data-center';
    stage
      .sprite(tex, 148, 84, (p) => dataCenter(p, 10, 78), DC_X - 10 * DC_SCALE, DC_Y - 78 * DC_SCALE)
      .setScale(DC_SCALE)
      .setTint(DUSK_TINT);
    lightUp(stage, DC_X, DC_Y, DC_SCALE);

    // Red warning light on the tower.
    const warn = stage.sprite('illu-warn', 2, 2, (p) => p.rect(0, 0, 2, 2, 0xff4b4b), TOWER_X - 1, 38);
    stage.every(800, () => warn.setAlpha(warn.alpha > 0.5 ? 0.15 : 1));
  },
};

/**
 * Blinking LEDs, glowing doors, logo, floodlights and steam on a data center
 * hall drawn at `scale` (x = left edge, y = ground; offsets match buildings.dataCenter).
 */
function lightUp(stage: IllustrationStage, x: number, y: number, scale: number): void {
  /** Place a sprite at an offset from the hall's left edge (dx) and ground line (dy), scaled with it. */
  const at = (key: string, w: number, h: number, draw: (p: PixelPainter) => void, dx: number, dy: number) =>
    stage.sprite(key, w, h, draw, x + dx * scale, y + dy * scale).setScale(scale);
  const top = -46;
  for (let i = 0; i < 10; i++) {
    for (const row of [28, 31]) {
      const color = LED[rand(0, LED.length - 1)];
      const led = at(`illu-led-${color.toString(16)}`, 2, 1, (p) => p.rect(0, 0, 2, 1, color), 78 + i * 4, top + row);
      stage.every(rand(250, 1100), () => led.setAlpha(led.alpha > 0.5 ? 0.25 : 1));
    }
  }
  // Glowing glass doors and logo panel.
  at('illu-dc-door', 20, 20, (p) => p.rect(0, 0, 9, 20, 0xbfe9ff, 0.8).rect(11, 0, 9, 20, 0xbfe9ff, 0.8), 13, top + 26);
  const logo = at('illu-dc-logo', 18, 12, (p) => {
    p.rect(0, 0, 18, 12, 0x3d8bff).disc(7, 7, 2, 0xffffff).disc(10, 6, 3, 0xffffff).rect(5, 7, 9, 2, 0xffffff);
  }, 46, top + 24);
  stage.scene.tweens.add({ targets: logo, alpha: 0.75, duration: 1500, yoyo: true, repeat: -1 });
  // Floodlight cones on the fence.
  for (const fx of [-8, 128 + 4]) {
    const cone = at('illu-flood', 12, 14, (p) => {
      for (let i = 0; i < 14; i++) p.rect(6 - Math.floor(i / 2.5), i, 1 + Math.floor(i / 2.5) * 2, 1, 0xfff2b0, 0.35);
      p.rect(4, 0, 4, 2, 0xfff2b0);
    }, fx - 5, -16);
    cone.setAlpha(0.9);
  }
  // Steam from the stacks.
  const stacks = [128 - 26 + 4, 128 - 14 + 4];
  stage.every(500, () => {
    const puff = at('illu-steam', 6, 6, (p) => p.disc(3, 3, 2, 0xd8d4e8), stacks[rand(0, 1)] - 3, top - 34);
    puff.setAlpha(0.8);
    stage.scene.tweens.add({
      targets: puff,
      y: puff.y - stage.px(rand(16, 28) * scale),
      x: puff.x + stage.px(rand(4, 12) * scale),
      scale: 2.4 * scale,
      alpha: 0,
      duration: 3200,
      onComplete: () => puff.destroy(),
    });
  });
}
