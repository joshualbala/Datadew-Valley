import Phaser from 'phaser';
import type { FlowStep } from '../../content/schemas';
import { audio } from '../audio/audioManager';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { flow } from '../flow';
import { CREAM_TEXT } from '../ui/theme';

type CardStep = Extract<FlowStep, { type: 'card' }>;

/** A black screen with one line of text (e.g. "6 months later"), from a "card" step in flow.json. */
export class CardScene extends Phaser.Scene {
  private step!: CardStep;

  constructor() {
    super('Card');
  }

  init(step: CardStep): void {
    this.step = step;
  }

  create(): void {
    const { text, holdSeconds, stopMusic } = this.step;
    this.cameras.main.setBackgroundColor('#000000');
    if (stopMusic) audio.stopMusic(2.5);

    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, { fontFamily: FONT, fontSize: '72px', color: CREAM_TEXT })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.chain({
      targets: label,
      tweens: [
        { alpha: 1, duration: 1400, ease: 'Sine.out' },
        { alpha: 1, duration: holdSeconds * 1000 },
        { alpha: 0, duration: 1000, ease: 'Sine.in' },
      ],
      onComplete: () => this.time.delayedCall(400, () => flow.next(this)),
    });
  }
}
