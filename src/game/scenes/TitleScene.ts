import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { audio } from '../audio/audioManager';
import { FONT, GAME_WIDTH } from '../constants';
import { ART_PX, AW, DATA_CENTER_X, GROUND_Y, makeSceneryTextures, paintBackground, riverCenter } from '../art/titleScenery';
import { flow } from '../flow';
import { addMuteButton } from '../ui/muteButton';
import { WOOD, WOOD_DARK, WOOD_LIGHT } from '../ui/theme';

const UI_DEPTH = 500; // text and buttons sit above all scenery

/** Art-grid → screen coordinates. */
const S = (v: number) => v * ART_PX;

/**
 * Opening page: game name + Enter button over a bright valley with the town
 * hall (left) and the data center (right). All text comes from
 * public/content/ui.json; music from public/content/audio.json.
 */
export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.started = false;
    const text = getContent().ui.title;

    // Keeps playing if already started on the Start screen; otherwise queues until the first click.
    const track = getContent().audio.music.title;
    if (track) audio.playMusic('title', track);

    makeSceneryTextures(this);
    this.add.image(0, 0, paintBackground(this)).setOrigin(0);
    this.addTrees();
    this.addClouds();
    this.addBirds();
    this.addDataCenterLife();
    this.addRiverSparkles();
    this.addButterflies();

    const cx = GAME_WIDTH / 2;
    const heading = this.add
      .text(cx, 108, text.heading, {
        fontFamily: FONT,
        fontSize: '104px',
        color: '#fff4d6',
        stroke: '#5b3a1e',
        strokeThickness: 10,
        shadow: { offsetX: 0, offsetY: 6, color: '#3a2412', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH);
    this.tweens.add({ targets: heading, y: 114, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    if (text.tagline) {
      this.add
        .text(cx, 168, text.tagline, {
          fontFamily: FONT,
          fontSize: '30px',
          color: '#fff4d6',
          stroke: '#5b3a1e',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH);
    }

    this.addEnterButton(cx, 300, text.enterButton);

    if (text.hint) {
      const hint = this.add
        .text(cx, 372, text.hint, { fontFamily: FONT, fontSize: '27px', color: '#fff4d6' })
        .setOrigin(0.5)
        .setDepth(UI_DEPTH + 1);
      this.add.rectangle(cx, 372, hint.width + 20, hint.height + 10, 0x3a2412, 0.6).setDepth(UI_DEPTH);
    }

    addMuteButton(this, UI_DEPTH + 5);

    this.input.keyboard?.on('keydown-ENTER', () => this.start());
    this.input.keyboard?.on('keydown-SPACE', () => this.start());
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  /** Wooden sign-style button. Clicking it (or pressing Enter/Space) starts the game. */
  private addEnterButton(x: number, y: number, label: string): void {
    const w = 210;
    const h = 64;
    const g = this.add.graphics();
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(WOOD_DARK).fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
      g.fillStyle(hover ? WOOD_LIGHT : WOOD).fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle(WOOD_LIGHT, hover ? 0 : 1).fillRect(-w / 2, -h / 2, w, 6);
      g.fillStyle(WOOD_DARK, 0.35).fillRect(-w / 2, h / 2 - 6, w, 6);
      // Wood grain + nails.
      g.fillStyle(WOOD_DARK, 0.25)
        .fillRect(-w / 2 + 12, -6, 60, 2)
        .fillRect(20, 12, 70, 2);
      g.fillStyle(WOOD_DARK)
        .fillRect(-w / 2 + 6, -h / 2 + 10, 4, 4)
        .fillRect(w / 2 - 10, -h / 2 + 10, 4, 4);
    };
    draw(false);

    const txt = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#fff4d6',
        stroke: '#5b3a1e',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const button = this.add
      .container(x, y, [g, txt])
      .setSize(w + 12, h + 12)
      .setDepth(UI_DEPTH);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      draw(true);
      button.setScale(1.05);
    });
    button.on('pointerout', () => {
      draw(false);
      button.setScale(1);
    });
    button.on('pointerdown', () => this.start());
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // On to the steps in content/flow.json (intro slides first). Music keeps playing.
      flow.start(this);
    });
  }

  // ------------------------------------------------------------ scenery life

  private addTrees(): void {
    const trees: [number, number, string][] = [
      [148, 194, 'tree-pine'],
      [163, 199, 'tree-oak'],
      [214, 172, 'tree-pine'],
      [268, 174, 'tree-pine'],
      [304, 186, 'tree-pine'],
      [318, 196, 'tree-oak'],
      [28, 230, 'bush'],
      [128, 226, 'bush'],
      [236, 224, 'bush'],
      [362, 228, 'bush'],
      [452, 230, 'bush'],
    ];
    for (const [x, y, key] of trees) {
      const img = this.add.image(S(x), S(y), key).setOrigin(0.5, 1).setDepth(y);
      if (key !== 'bush') {
        // Gentle sway in the breeze.
        this.tweens.add({
          targets: img,
          angle: { from: -0.8, to: 0.8 },
          duration: Phaser.Math.Between(2200, 3200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }
  }

  private addClouds(): void {
    const clouds: [string, number, number, number][] = [
      ['cloud-big', 60, 34, 140000],
      ['cloud-small', 170, 58, 110000],
      ['cloud-big', 270, 22, 160000],
      ['cloud-small', 380, 70, 120000],
    ];
    for (const [key, x, y, ms] of clouds) {
      const cloud = this.add.image(S(x), S(y), key).setDepth(1);
      const off = cloud.width;
      const travel = GAME_WIDTH + off * 2;
      this.tweens.add({
        targets: cloud,
        x: GAME_WIDTH + off,
        duration: ms * ((GAME_WIDTH + off - cloud.x) / travel),
        onComplete: () => {
          cloud.x = -off;
          this.tweens.add({ targets: cloud, x: GAME_WIDTH + off, duration: ms, repeat: -1 });
        },
      });
    }
  }

  private addBirds(): void {
    for (let i = 0; i < 3; i++) {
      const bird = this.add.image(-40 - i * 30, S(46 + i * 6), 'bird-0').setDepth(2);
      this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => bird.setTexture(bird.texture.key === 'bird-0' ? 'bird-1' : 'bird-0'),
      });
      this.tweens.add({
        targets: bird,
        x: GAME_WIDTH + 60,
        y: bird.y - 20,
        delay: i * 500,
        duration: 26000,
        repeat: -1,
        repeatDelay: 9000,
      });
    }
  }

  private addDataCenterLife(): void {
    const x = DATA_CENTER_X;
    const top = GROUND_Y - 46;
    // Spinning rooftop fans.
    for (let i = 0; i < 4; i++) {
      const fan = this.add.image(S(x + 6 + i * 22 + 9) + 1, S(top - 4) + 1, 'fan').setDepth(3);
      this.tweens.add({ targets: fan, angle: 360, duration: 900 + i * 120, repeat: -1 });
    }
    // Blinking server LEDs.
    const colors = [0x5cff8a, 0x5cff8a, 0x5cc8ff, 0xffd25c];
    for (let i = 0; i < 10; i++) {
      for (const row of [28, 31]) {
        const led = this.add
          .image(S(x + 78 + i * 4), S(top + row), 'led')
          .setOrigin(0)
          .setTint(Phaser.Utils.Array.GetRandom(colors))
          .setDepth(3);
        this.time.addEvent({
          delay: Phaser.Math.Between(250, 1200),
          loop: true,
          callback: () => led.setAlpha(led.alpha > 0.5 ? 0.25 : 1),
        });
      }
    }
    // Steam rising from the exhaust stacks.
    const stacks = [x + 128 - 26 + 4, x + 128 - 14 + 4];
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        const sx = Phaser.Utils.Array.GetRandom(stacks);
        const puff = this.add
          .image(S(sx), S(top - 32), 'puff')
          .setDepth(2)
          .setAlpha(0.8)
          .setScale(0.6);
        this.tweens.add({
          targets: puff,
          y: puff.y - Phaser.Math.Between(40, 70),
          x: puff.x + Phaser.Math.Between(10, 30),
          scale: 2,
          alpha: 0,
          duration: 3200,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private addRiverSparkles(): void {
    for (let i = 0; i < 14; i++) {
      const sx = Phaser.Math.Between(4, AW - 4);
      const sparkle = this.add
        .image(S(sx), S(riverCenter(sx) + Phaser.Math.Between(-5, 5)), 'sparkle')
        .setDepth(4)
        .setAlpha(0);
      this.tweens.add({
        targets: sparkle,
        alpha: 0.9,
        duration: 500,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        repeatDelay: Phaser.Math.Between(1500, 4000),
      });
    }
  }

  private addButterflies(): void {
    const spots: [number, number][] = [
      [90, 220],
      [280, 228],
    ];
    for (const [x, y] of spots) {
      const b = this.add.image(S(x), S(y), 'butterfly-0').setDepth(240);
      this.time.addEvent({
        delay: 140,
        loop: true,
        callback: () => b.setTexture(b.texture.key === 'butterfly-0' ? 'butterfly-1' : 'butterfly-0'),
      });
      this.tweens.add({ targets: b, x: b.x + 70, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: b, y: b.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }
}
