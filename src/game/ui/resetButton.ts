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
  makeTexture(scene, 'icon-reset', 14, 14, (p) => {
    // A circular arrow.
    for (const [x, y] of [[5, 1], [6, 1], [7, 1], [8, 1], [3, 2], [4, 2], [9, 2], [10, 2], [2, 3], [11, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [2, 9], [12, 8], [12, 9], [3, 10], [11, 10], [4, 11], [5, 11], [10, 11], [6, 12], [7, 12], [8, 12], [9, 12]]) {
      p.px(x, y, CREAM);
    }
    p.rect(10, 4, 4, 1, CREAM).rect(13, 4, 1, 4, CREAM).px(12, 5, CREAM).px(11, 6, CREAM).rect(12, 4, 1, 3, CREAM);
  }, 3);

  const bg = scene.add.rectangle(0, 0, 56, 50, DARK, 0.6).setStrokeStyle(3, DARK);
  const icon = scene.add.image(0, 0, 'icon-reset');
  const button = scene.add.container(GAME_WIDTH - 104, 36, [bg, icon]).setDepth(depth).setSize(56, 50).setScrollFactor(0);
  button.setInteractive({ useHandCursor: true });

  const tipText = scene.add.text(0, 0, text.confirm, { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(1, 0);
  const tipBg = scene.add.rectangle(4, -2, tipText.width + 16, tipText.height + 4, PARCHMENT).setOrigin(1, 0).setStrokeStyle(3, WOOD_DARK);
  const tip = scene.add.container(GAME_WIDTH - 76, 66, [tipBg, tipText]).setDepth(depth).setScrollFactor(0).setVisible(false);

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
