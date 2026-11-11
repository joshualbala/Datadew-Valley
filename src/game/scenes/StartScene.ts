import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { audio } from '../audio/audioManager';
import { makeTexture } from '../art/pixel';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../constants';

/**
 * First screen: "Click anywhere to begin". Browsers only allow sound after the
 * visitor clicks or presses a key, so this click starts the music for the title.
 */
export class StartScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Start');
  }

  create(): void {
    this.leaving = false;
    const text = getContent().ui.start;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Pixel headphones icon.
    const key = makeTexture(
      this,
      'icon-headphones',
      20,
      18,
      (p) => {
        const c = 0xfff4d6;
        p.rect(5, 1, 10, 2, c).rect(3, 2, 2, 2, c).rect(15, 2, 2, 2, c).rect(2, 4, 2, 6, c).rect(16, 4, 2, 6, c);
        p.rect(1, 10, 5, 7, 0xe9b44c).rect(14, 10, 5, 7, 0xe9b44c);
      },
      4,
    );
    const icon = this.add.image(cx, cy - 90, key);
    this.tweens.add({ targets: icon, y: cy - 98, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const prompt = this.add.text(cx, cy + 10, text.prompt, { fontFamily: FONT, fontSize: '60px', color: '#fff4d6' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    if (text.soundNote) {
      this.add.text(cx, cy + 70, text.soundNote, { fontFamily: FONT, fontSize: '32px', color: '#e9b44c' }).setOrigin(0.5);
    }

    const go = () => this.begin();
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }

  private begin(): void {
    if (this.leaving) return;
    this.leaving = true;
    // Audio was unlocked by this same click (see audio.armUnlock); start the title music now.
    const track = getContent().audio.music.title;
    if (track) audio.playMusic('title', track);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Title'));
  }
}
