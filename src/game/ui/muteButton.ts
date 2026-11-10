import Phaser from 'phaser';
import { audio } from '../audio/audioManager';
import { makeTexture } from '../art/pixel';
import { GAME_WIDTH } from '../constants';

const DARK = 0x3a2412;
const CREAM = 0xfff4d6;

function speakerTextures(scene: Phaser.Scene): void {
  const body = (p: import('../art/pixel').PixelPainter) => {
    p.rect(1, 4, 3, 4, CREAM).rect(4, 3, 1, 6, CREAM).rect(5, 2, 1, 8, CREAM).rect(6, 1, 1, 10, CREAM);
  };
  makeTexture(scene, 'icon-sound-on', 14, 12, (p) => {
    body(p);
    p.rect(9, 4, 1, 4, CREAM).rect(11, 2, 1, 2, CREAM).rect(12, 4, 1, 4, CREAM).rect(11, 8, 1, 2, CREAM);
  }, 3);
  makeTexture(scene, 'icon-sound-off', 14, 12, (p) => {
    body(p);
    for (let i = 0; i < 5; i++) p.px(8 + i, 3 + i, CREAM).px(12 - i, 3 + i, CREAM);
  }, 3);
}

/** Speaker toggle (top-right corner unless `at` is given); also toggles with the M key. */
export function addMuteButton(
  scene: Phaser.Scene,
  depth = 100,
  at = { x: GAME_WIDTH - 40, y: 36 },
): Phaser.GameObjects.Container {
  speakerTextures(scene);
  const bg = scene.add.rectangle(0, 0, 56, 50, DARK, 0.6).setStrokeStyle(3, DARK);
  const icon = scene.add.image(0, 0, audio.muted ? 'icon-sound-off' : 'icon-sound-on');
  const button = scene.add.container(at.x, at.y, [bg, icon]).setDepth(depth).setSize(56, 50);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerover', () => bg.setFillStyle(DARK, 0.85));
  button.on('pointerout', () => bg.setFillStyle(DARK, 0.6));
  button.on('pointerdown', () => audio.toggleMute());

  const onKey = () => audio.toggleMute();
  scene.input.keyboard?.on('keydown-M', onKey);
  const unsubscribe = audio.onMuteChange((muted) => icon.setTexture(muted ? 'icon-sound-off' : 'icon-sound-on'));
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    unsubscribe();
    scene.input.keyboard?.off('keydown-M', onKey);
  });
  return button;
}
