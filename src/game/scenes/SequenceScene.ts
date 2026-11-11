import Phaser from 'phaser';
import type { SequenceContent } from '../../content/schemas';
import { getContent } from '../../content/store';
import { audio, type SoundHandle } from '../audio/audioManager';
import { makeTexture } from '../art/pixel';
import { PICTURE_H, PICTURE_W, gridOf, illustrations, type IllustrationStage } from '../art/illustrations';
import { FONT, GAME_WIDTH } from '../constants';
import { flow } from '../flow';
import { addMuteButton } from '../ui/muteButton';
import { INK, INK_SOFT, PARCHMENT, PARCHMENT_SHADE, WOOD, WOOD_DARK, WOOD_LIGHT } from '../ui/theme';

const PIC_W = PICTURE_W;
const PIC_H = PICTURE_H;
const PIC_X = (GAME_WIDTH - PIC_W) / 2;
const PIC_Y = 14;
const BOX_Y = PIC_Y + PIC_H + 16;
const BOX_H = 540 - BOX_Y - 10;
const PAD = 22;
const CAPTION_SIZES = [46, 42, 38, 35, 32, 30, 27, 24, 21]; // the largest that fits is used
const FADE_MS = 180;
const MUTE_SPACE = 64; // caption text wraps before the mute button in the box's top-right corner

/**
 * Click-through storybook slides (a picture above a caption) from
 * public/content/sequences/<name>.json. Used for the intro, and later the
 * ending. Pictures are drawn in code: see src/game/art/illustrations/.
 */
export class SequenceScene extends Phaser.Scene {
  private sequenceName = '';
  private slides: SequenceContent['slides'] = [];
  private index = 0;
  private busy = false;
  private layer?: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private back!: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;
  private mask!: Phaser.Display.Masks.GeometryMask;
  private slideSound: SoundHandle | null = null;

  constructor() {
    super('Sequence');
  }

  init(data: { sequence: string }): void {
    this.sequenceName = data.sequence;
    this.index = 0;
    this.busy = false;
    this.layer = undefined;
    this.slideSound = null;
  }

  create(): void {
    const sequence = getContent().sequences[this.sequenceName];
    if (!sequence) throw new Error(`Unknown sequence "${this.sequenceName}" (expected public/content/sequences/${this.sequenceName}.json)`);
    this.slides = sequence.slides;
    const text = getContent().ui.sequence;
    if (sequence.music) {
      const track = getContent().audio.music[sequence.music];
      if (track) audio.playMusic(sequence.music, track);
      else console.warn(`sequences/${this.sequenceName}.json: no music track "${sequence.music}" in audio.json`);
    }

    this.cameras.main.setBackgroundColor('#2a1d12');
    this.drawFrames();

    const maskShape = this.make.graphics({}, false).fillRect(PIC_X, PIC_Y, PIC_W, PIC_H);
    this.mask = maskShape.createGeometryMask();

    this.caption = this.add
      .text(PIC_X + PAD, BOX_Y + 14, '', {
        fontFamily: FONT,
        fontSize: `${CAPTION_SIZES[0]}px`,
        color: INK,
        wordWrap: { width: PIC_W - PAD * 2 - MUTE_SPACE, useAdvancedWrap: true },
        lineSpacing: 2,
      })
      .setDepth(10);

    this.hint = this.add
      .text(PIC_X + PIC_W - PAD, BOX_Y + BOX_H - 10, text.nextHint, { fontFamily: FONT, fontSize: '22px', color: INK_SOFT })
      .setOrigin(1, 1)
      .setDepth(10);
    this.back = this.addBackButton(PIC_X + PAD, BOX_Y + BOX_H - 10, text.backButton);
    addMuteButton(this, 20, { x: PIC_X + PIC_W - 36, y: BOX_Y + 32 });

    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.forward(); // clicks on buttons are handled by the buttons
    });
    const keys = this.input.keyboard;
    for (const key of ['ENTER', 'SPACE', 'RIGHT']) keys?.on(`keydown-${key}`, () => this.forward());
    for (const key of ['LEFT', 'BACKSPACE']) keys?.on(`keydown-${key}`, () => this.backward());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.setSlideSound(undefined));
    this.showSlide(0);
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ----------------------------------------------------------- navigation

  private forward(): void {
    if (this.busy) return;
    if (this.index < this.slides.length - 1) {
      this.goTo(this.index + 1);
      return;
    }
    this.busy = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => flow.next(this));
  }

  private backward(): void {
    if (this.busy || this.index === 0) return;
    this.goTo(this.index - 1);
  }

  private goTo(index: number): void {
    this.busy = true;
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.showSlide(index);
      this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
      this.busy = false;
    });
  }

  // ----------------------------------------------------------- drawing

  private showSlide(index: number): void {
    this.index = index;
    const slide = this.slides[index];

    // Stop the previous picture's animations and remove its sprites.
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0).setDepth(1);
    this.layer.setMask(this.mask);

    const illustration = illustrations[slide.illustration];
    if (illustration) {
      const grid = gridOf(illustration);
      const key = makeTexture(this, `illustration-${slide.illustration}`, grid.w, grid.h, (p) => illustration.paint(p), grid.scale);
      this.layer.add(this.add.image(PIC_X, PIC_Y, key).setOrigin(0));
      illustration.animate?.(this.stageFor(this.layer, grid.scale));
    } else {
      console.warn(`Unknown illustration "${slide.illustration}" in sequences/${this.sequenceName}.json`);
    }

    this.setCaption(slide.caption);
    this.setSlideSound(slide.sound);
    this.back.setVisible(index > 0);
    this.hint.setAlpha(1);
    this.tweens.add({ targets: this.hint, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  /**
   * Set the caption at the largest size that fits the box (short captions get
   * big text, long ones shrink), centered vertically above the buttons.
   */
  private setCaption(caption: string): void {
    const top = BOX_Y + 10;
    const maxHeight = BOX_H - 10 - 34;
    let fitted = false;
    for (const size of CAPTION_SIZES) {
      this.caption.setFontSize(size).setText(caption);
      if (this.caption.height <= maxHeight) {
        fitted = true;
        break;
      }
    }
    if (!fitted) console.warn(`Caption is too long to fit on one slide: "${caption.slice(0, 40)}…"`);
    this.caption.setY(top + Math.max(0, (maxHeight - this.caption.height) / 2));
  }

  /** Play a slide's own sound instead of the music (or bring the music back). */
  private setSlideSound(key: string | undefined): void {
    this.slideSound?.stop(0.6);
    this.slideSound = null;
    const def = key ? getContent().audio.sounds[key] : undefined;
    if (key && !def) console.warn(`sequences/${this.sequenceName}.json: no sound "${key}" in audio.json → sounds`);
    if (key && def) {
      audio.setMusicLevel(0, 0.8);
      this.slideSound = audio.sound(key, def);
      this.slideSound.play();
    } else {
      audio.setMusicLevel(1, 0.8);
    }
  }

  private stageFor(layer: Phaser.GameObjects.Container, PX: number): IllustrationStage {
    return {
      scene: this,
      sprite: (key, w, h, draw, x, y) => {
        // Same drawing at a different zoom needs its own texture.
        const scaled = `${key}@${PX}`;
        makeTexture(this, scaled, w, h, draw, PX);
        const img = this.add.image(PIC_X + x * PX, PIC_Y + y * PX, scaled).setOrigin(0);
        layer.add(img);
        return img;
      },
      px: (n) => n * PX,
      x: (ax) => PIC_X + ax * PX,
      y: (ay) => PIC_Y + ay * PX,
      every: (ms, fn) => {
        this.time.addEvent({ delay: ms, loop: true, callback: fn });
      },
    };
  }

  /** Wooden frame around the picture and the parchment caption box. */
  private drawFrames(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(WOOD_DARK).fillRect(PIC_X - 10, PIC_Y - 8, PIC_W + 20, PIC_H + 16);
    g.fillStyle(WOOD).fillRect(PIC_X - 6, PIC_Y - 4, PIC_W + 12, PIC_H + 8);
    g.fillStyle(WOOD_LIGHT).fillRect(PIC_X - 6, PIC_Y - 4, PIC_W + 12, 2);
    g.fillStyle(WOOD_DARK).fillRect(PIC_X - 2, PIC_Y - 2, PIC_W + 4, PIC_H + 4);

    g.fillStyle(WOOD_DARK).fillRect(PIC_X - 4, BOX_Y - 4, PIC_W + 8, BOX_H + 8);
    g.fillStyle(PARCHMENT).fillRect(PIC_X, BOX_Y, PIC_W, BOX_H);
    g.fillStyle(PARCHMENT_SHADE).fillRect(PIC_X, BOX_Y + BOX_H - 4, PIC_W, 4).fillRect(PIC_X + PIC_W - 4, BOX_Y, 4, BOX_H);
  }

  private addBackButton(x: number, bottom: number, label: string): Phaser.GameObjects.Container {
    const arrow = makeTexture(this, 'icon-back', 4, 7, (p) => {
      for (let i = 0; i < 4; i++) p.rect(i, 3 - i, 1, 1 + i * 2, 0x8a5a2b);
    }, 3);
    const icon = this.add.image(0, 0, arrow).setOrigin(0, 0.5);
    const txt = this.add.text(18, 0, label, { fontFamily: FONT, fontSize: '22px', color: INK_SOFT }).setOrigin(0, 0.5);
    const w = 18 + txt.width;
    const h = 28;
    const button = this.add.container(x, bottom - h / 2, [icon, txt]).setDepth(10);
    button.setInteractive(new Phaser.Geom.Rectangle(-6, -h / 2, w + 12, h), Phaser.Geom.Rectangle.Contains);
    if (button.input) button.input.cursor = 'pointer';
    button.on('pointerover', () => txt.setColor(INK));
    button.on('pointerout', () => txt.setColor(INK_SOFT));
    button.on('pointerdown', () => this.backward());
    return button;
  }
}
