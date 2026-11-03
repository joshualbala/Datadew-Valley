import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../constants';

/**
 * TEMPORARY (Step 1 only): stands in for the intro until Step 2 adds the
 * flow runner and slides. Click or press any key to return to the title.
 */
export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('Placeholder');
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Intro slides come in Step 2.\n\nClick or press any key to go back.', {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#fff4d6',
        align: 'center',
      })
      .setOrigin(0.5);
    const back = () => this.scene.start('Title');
    this.input.once('pointerdown', back);
    this.input.keyboard?.once('keydown', back);
  }
}
