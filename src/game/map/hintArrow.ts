import Phaser from 'phaser';
import { progress } from '../../state/progress';
import { isPopupOpen } from '../../ui/popup';
import { makeTexture } from '../art/pixel';
import { FONT } from '../constants';
import { INK, PARCHMENT, WOOD_DARK } from '../ui/theme';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
/** Hide the arrow once Alex is this close to what it points at. */
const CLOSE_ENOUGH = TILE_PX * 3;

/**
 * A gentle nudge for players who are stuck: after `afterSeconds` without
 * reading anything new, an arrow circles Alex pointing at the nearest unread
 * thing (`target()` decides what that is). It disappears as soon as something
 * is read, a pop-up opens, or Alex gets close.
 */
export class HintArrow {
  private arrow: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Container;
  private idleSince: number;

  constructor(
    private scene: Phaser.Scene,
    private afterSeconds: number,
    text: string,
    private target: (px: number, py: number) => { x: number; y: number } | null,
  ) {
    makeTexture(
      scene,
      'hint-arrow',
      12,
      9,
      (p) => {
        const out = 0x3a2412;
        const fill = 0xffd23f;
        p.rect(0, 3, 7, 3, out)
          .rect(6, 0, 2, 9, out)
          .rect(8, 1, 1, 7, out)
          .rect(9, 2, 1, 5, out)
          .rect(10, 3, 1, 3, out)
          .rect(11, 4, 1, 1, out);
        p.rect(1, 4, 6, 1, fill).rect(7, 1, 1, 7, fill).rect(8, 2, 1, 5, fill).rect(9, 3, 1, 3, fill).rect(10, 4, 1, 1, fill);
      },
      MAP_SCALE,
    );
    this.arrow = scene.add.image(0, 0, 'hint-arrow').setDepth(100002).setVisible(false);
    const t = scene.add.text(0, 0, text, { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(0.5);
    const bg = scene.add.rectangle(0, 0, t.width + 16, t.height + 4, PARCHMENT, 0.95).setStrokeStyle(3, WOOD_DARK);
    this.label = scene.add.container(0, 0, [bg, t]).setDepth(100002).setVisible(false);
    this.idleSince = scene.time.now;
    const unsubscribe = progress.onChange(() => (this.idleSince = this.scene.time.now));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  /** Call every frame with Alex's feet position. */
  update(px: number, py: number): void {
    const now = this.scene.time.now;
    if (isPopupOpen()) this.idleSince = Math.max(this.idleSince, now - this.afterSeconds * 500); // reading isn't being stuck
    const due = this.afterSeconds > 0 && now - this.idleSince >= this.afterSeconds * 1000 && !isPopupOpen();
    const goal = due ? this.target(px, py) : null;
    const show = goal !== null && Phaser.Math.Distance.Between(px, py, goal.x, goal.y) > CLOSE_ENOUGH;
    this.arrow.setVisible(show);
    this.label.setVisible(show);
    if (!show || !goal) return;
    const cy = py - TILE_PX * 0.8; // around Alex's middle
    const angle = Phaser.Math.Angle.Between(px, cy, goal.x, goal.y);
    const bob = 6 * Math.sin(now / 180);
    const r = TILE_PX * 1.3 + bob;
    this.arrow.setPosition(px + Math.cos(angle) * r, cy + Math.sin(angle) * r).setRotation(angle);
    this.label.setPosition(px, py - TILE_PX * 2.2);
  }
}
