import Phaser from 'phaser';
import type { MapContent } from '../../content/schemas';
import { isPopupOpen } from '../../ui/popup';
import { FONT } from '../constants';
import { INK, PARCHMENT, WOOD_DARK } from '../ui/theme';
import { makeTexture } from '../art/pixel';
import { addGlow } from './glow';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
/** How close Alex must be to use a door (generous, so the entrance is easy to find). */
const RANGE = TILE_PX * 2;

type Door = MapContent['doors'][number];

/**
 * Doors to other maps (e.g. the data center gate and its exit). Walk close to
 * see the door's hint; E takes Alex through. Markers ("!") nearby win, so a
 * door never steals the E press meant for a pop-up.
 */
export class Doors {
  private near: Door | null = null;
  private hint: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    private doors: Door[],
    private blocked: () => boolean,
    onUse: (door: Door) => void,
  ) {
    this.label = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '24px', color: INK }).setOrigin(0.5);
    this.bg = scene.add.rectangle(0, 0, 10, 10, PARCHMENT).setStrokeStyle(3, WOOD_DARK);
    this.hint = scene.add.container(0, 0, [this.bg, this.label]).setDepth(100001).setVisible(false);
    for (const d of doors) this.addBeacon(scene, d);
    scene.input.keyboard?.on('keydown-E', () => {
      if (this.near && !this.blocked() && !isPopupOpen()) onUse(this.near);
    });
  }

  /** A glow at the door, and (if it has a sign) a floating sign with a bobbing arrow pointing at it. */
  private addBeacon(scene: Phaser.Scene, d: Door): void {
    const x = (d.x + 0.5) * TILE_PX;
    const y = (d.y + 0.5) * TILE_PX;
    addGlow(scene, x, y + TILE_PX * 0.4, TILE_PX * 1.6, 0x7fd8ff, 99990);
    if (!d.sign) return;
    makeTexture(
      scene,
      'door-arrow',
      9,
      8,
      (p) => {
        const out = 0x3a2412;
        p.rect(2, 0, 5, 4, out).rect(0, 3, 9, 2, out).rect(1, 5, 7, 1, out).rect(2, 6, 5, 1, out).rect(3, 7, 3, 1, out);
        p.rect(3, 0, 3, 4, 0x7fd8ff).rect(1, 4, 7, 1, 0x7fd8ff).rect(2, 5, 5, 1, 0x7fd8ff).rect(3, 6, 3, 1, 0x7fd8ff);
      },
      MAP_SCALE,
    );
    const arrow = scene.add.image(x, y - TILE_PX * 0.9, 'door-arrow').setDepth(99995);
    scene.tweens.add({ targets: arrow, y: arrow.y + 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const text = scene.add.text(0, 0, d.sign, { fontFamily: FONT, fontSize: '26px', color: INK }).setOrigin(0.5);
    const bg = scene.add.rectangle(0, 0, text.width + 20, text.height + 6, PARCHMENT).setStrokeStyle(3, WOOD_DARK);
    scene.add.container(x, y - TILE_PX * 1.8, [bg, text]).setDepth(99995);
  }

  /** Call every frame with Alex's feet position. */
  update(px: number, py: number): void {
    let best: Door | null = null;
    let bestD = RANGE;
    for (const d of this.doors) {
      const dist = Phaser.Math.Distance.Between(px, py - TILE_PX * 0.3, (d.x + 0.5) * TILE_PX, (d.y + 0.5) * TILE_PX);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    if (best !== this.near && best) {
      this.label.setText(best.hint);
      this.bg.setSize(this.label.width + 18, this.label.height + 4);
    }
    this.near = best;
    this.hint.setVisible(Boolean(best) && !this.blocked() && !isPopupOpen());
    if (best) this.hint.setPosition(px, py - TILE_PX * 1.75);
  }
}
