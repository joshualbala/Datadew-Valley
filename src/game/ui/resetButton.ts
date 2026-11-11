import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { progress } from '../../state/progress';
import { isPopupOpen } from '../../ui/popup';
import { makeTexture } from '../art/pixel';
import { audio } from '../audio/audioManager';
import { FONT, GAME_WIDTH } from '../constants';
import { INK, PARCHMENT, WOOD_DARK } from './theme';

const DARK = 0x3a2412;
const CREAM = 0xfff4d6;
const CONFIRM_MS = 3000;

/**
 * Reset button (top-right, left of mute): clears all progress and goes back to
 * the title screen. The first click asks for confirmation ("Click again…");
 * a second click within 3 seconds resets, so it can't happen by accident.
 */
export function addResetButton(scene: Phaser.Scene, depth: number): Phaser.GameObjects.Container {
  const text = getContent().ui.reset;
  makeTexture(
    scene,
    'icon-reset-v2',
    14,
    14,
    (p) => {
      // A ring with a gap at the top right...
      const c = 7;
      for (let y = 0; y < 14; y++) {
        for (let x = 0; x < 14; x++) {
          const dx = x + 0.5 - c;
          const dy = y + 0.5 - c;
          const d = Math.hypot(dx, dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, -90 = up
          if (d >= 3.6 && d <= 5.5 && !(angle > -88 && angle < 5)) p.px(x, y, CREAM);
        }
      }
      // ...and an arrowhead at its top end, pointing clockwise.
      for (const [y, x0, x1] of [
        [0, 7, 7],
        [1, 7, 8],
        [2, 7, 9],
        [3, 7, 10],
        [4, 7, 9],
        [5, 7, 8],
        [6, 7, 7],
      ]) {
        p.rect(x0, y, x1 - x0 + 1, 1, CREAM);
      }
    },
    3,
  );

  const bg = scene.add.rectangle(0, 0, 38, 34, DARK, 0.6).setStrokeStyle(2, DARK);
  const icon = scene.add.image(0, 0, 'icon-reset-v2').setScale(2 / 3); // 2 screen px per art px
  const button = scene.add
    .container(GAME_WIDTH - 72, 26, [bg, icon])
    .setDepth(depth)
    .setSize(38, 34)
    .setScrollFactor(0);
  button.setInteractive({ useHandCursor: true });

  const tipText = scene.add.text(0, 0, text.confirm, { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(1, 0);
  const tipBg = scene.add
    .rectangle(4, -2, tipText.width + 16, tipText.height + 4, PARCHMENT)
    .setOrigin(1, 0)
    .setStrokeStyle(3, WOOD_DARK);
  const tip = scene.add
    .container(GAME_WIDTH - 10, 50, [tipBg, tipText])
    .setDepth(depth)
    .setScrollFactor(0)
    .setVisible(false);

  let armed = false;
  let timer: Phaser.Time.TimerEvent | null = null;
  const disarm = () => {
    armed = false;
    tip.setVisible(false);
    bg.setFillStyle(DARK, 0.6);
  };
  button.on('pointerover', () => !armed && bg.setFillStyle(DARK, 0.85));
  button.on('pointerout', () => !armed && bg.setFillStyle(DARK, 0.6));
  button.on('pointerdown', () => {
    if (isPopupOpen()) return;
    if (!armed) {
      armed = true;
      tip.setVisible(true);
      bg.setFillStyle(0xc0392b, 0.9);
      timer = scene.time.delayedCall(CONFIRM_MS, disarm);
      return;
    }
    timer?.remove();
    disarm();
    progress.reset();
    audio.stopMusic(0.8);
    audio.setMusicLevel(1, 0.1);
    scene.input.enabled = false;
    scene.cameras.main.fadeOut(500, 0, 0, 0);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start('Title'));
  });
  return button;
}
