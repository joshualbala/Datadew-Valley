import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../constants';

/**
 * TEMPORARY: where the flow ends until Step 3 (controls pop-up) and Step 4
 * (the valley map) exist. Click or press any key to return to the title.
 */
export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('Placeholder');
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'The controls pop-up comes in Step 3.\n\nClick or press any key to go back to the title.', {
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
