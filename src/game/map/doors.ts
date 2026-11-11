import Phaser from 'phaser';
import type { MapContent } from '../../content/schemas';
import { isPopupOpen } from '../../ui/popup';
import { FONT } from '../constants';
import { INK, PARCHMENT, WOOD_DARK } from '../ui/theme';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
const RANGE = TILE_PX * 1.4;

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
    scene.input.keyboard?.on('keydown-E', () => {
      if (this.near && !this.blocked() && !isPopupOpen()) onUse(this.near);
    });
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
