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
    const warn = Boolean(text.noiseWarning);
    // With a warning to show, everything shifts up to make room for it.
    const up = warn ? 70 : 0;
    const icon = this.add.image(cx, cy - 90 - up, key);
    this.tweens.add({ targets: icon, y: cy - 98 - up, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const prompt = this.add.text(cx, cy + 10 - up, text.prompt, { fontFamily: FONT, fontSize: '60px', color: '#fff4d6' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    if (text.soundNote) {
      this.add.text(cx, cy + 70 - up, text.soundNote, { fontFamily: FONT, fontSize: '32px', color: '#e9b44c' }).setOrigin(0.5);
    }
    if (warn) this.addNoiseWarning(cx, cy + 150, text.noiseWarningTitle, text.noiseWarning);

    const go = () => this.begin();
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown', go);
  }

  /** A boxed warning (with a pixel warning sign) that the simulation has loud, unpleasant sounds. */
  private addNoiseWarning(cx: number, cy: number, title: string, body: string): void {
    const w = 760;
    const t = this.add.text(cx, 0, title, { fontFamily: FONT, fontSize: '32px', color: '#ffd23f' }).setOrigin(0.5, 0);
    const b = this.add
      .text(cx, 0, body, { fontFamily: FONT, fontSize: '25px', color: '#fff4d6', align: 'center', wordWrap: { width: w - 200 } })
      .setOrigin(0.5, 0);
    const h = t.height + b.height + 36;
    const top = cy - h / 2;
    t.setY(top + 14);
    b.setY(top + 18 + t.height);
    const box = this.add.graphics();
    box.fillStyle(0x3a2412, 0.9).fillRect(cx - w / 2, top, w, h);
    box.lineStyle(4, 0xffd23f).strokeRect(cx - w / 2, top, w, h);
    box.setDepth(-1);
    const sign = makeTexture(
      this,
      'icon-warning',
      15,
      13,
      (p) => {
        for (let i = 0; i < 13; i++) p.rect(7 - Math.floor(i / 2), i, 1 + Math.floor(i / 2) * 2, 1, 0xffd23f);
        p.rect(7, 4, 1, 5, 0x3a2412).px(7, 10, 0x3a2412);
      },
      4,
    );
    // A warning sign on each side keeps the text centered under the headphones.
    this.add.image(cx - w / 2 + 50, cy, sign);
    this.add.image(cx + w / 2 - 50, cy, sign);
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
