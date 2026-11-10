import Phaser from 'phaser';
import type { HudWidget } from '../../content/schemas';
import { getContent } from '../../content/store';
import { progress } from '../../state/progress';
import { isPopupOpen, openPopup } from '../../ui/popup';
import { ALEX } from '../art/illustrations/common';
import { makeTexture } from '../art/pixel';
import { PORTRAIT_SIZE, portrait } from '../art/portrait';
import { audio } from '../audio/audioManager';
import { FONT, GAME_HEIGHT } from '../constants';
import { CREAM_TEXT, WOOD, WOOD_DARK, WOOD_LIGHT } from '../ui/theme';

/** What a HUD widget can use from the map it sits on. */
export interface HudContext {
  depth: number;
  tilePx: number;
  /** Centers (screen px) of every tile/building of a kind. */
  centersOf(kind: string): { x: number; y: number }[];
}

export interface RunningWidget {
  update?(px: number, py: number): void;
}

type WidgetFactory<T extends HudWidget['type']> = (scene: Phaser.Scene, cfg: Extract<HudWidget, { type: T }>, ctx: HudContext) => RunningWidget;

const PX = 3; // HUD art scale

/** Wooden panel drawn into a Graphics at (x, y). */
function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(WOOD_DARK).fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle(WOOD).fillRect(x, y, w, h);
  g.fillStyle(WOOD_LIGHT).fillRect(x, y, w, 4);
}

/**
 * Open the widget's pop-up and count it as read. A bouncing "!" badge sits on
 * the widget until then, like the markers on the map.
 */
function makeReadable(scene: Phaser.Scene, cfg: HudWidget, target: Phaser.GameObjects.Container, badgeX: number, badgeY: number, before?: () => void, after?: () => void) {
  let badge: Phaser.GameObjects.Image | null = null;
  if (!progress.isRead(cfg.id)) {
    badge = scene.add.image(badgeX, badgeY, 'marker-bang').setScale(0.75);
    target.add(badge);
    scene.tweens.add({ targets: badge, y: badgeY - 6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
  target.on('pointerdown', () => {
    if (isPopupOpen()) return;
    before?.();
    void openPopup(cfg.popup).then(() => {
      progress.markRead(cfg.id);
      if (badge) {
        audio.sfx('read');
        scene.tweens.killTweensOf(badge);
        badge.destroy();
        badge = null;
      }
      after?.();
    });
  });
}

/**
 * HUD widgets listed in public/content/hud.json. To add a widget type: add its
 * schema in content/schemas.ts (HudWidgetSchema), then a factory here.
 */
export const widgetTypes: { [T in HudWidget['type']]: WidgetFactory<T> } = {
  /** Alex's portrait and name (top-left); click to read about their health. */
  portrait(scene, cfg, ctx) {
    const key = makeTexture(scene, `portrait-${cfg.state}`, PORTRAIT_SIZE, PORTRAIT_SIZE, (p) => portrait(p, ALEX, cfg.state), PX);
    const size = PORTRAIT_SIZE * PX;
    const g = scene.add.graphics();
    panel(g, 0, 0, size + 8, size + 8);
    const face = scene.add.image(4, 4, key).setOrigin(0);
    const name = scene.add
      .text((size + 8) / 2, size + 22, cfg.name, { fontFamily: FONT, fontSize: '28px', color: CREAM_TEXT, stroke: '#5b3a1e', strokeThickness: 5 })
      .setOrigin(0.5);
    const box = scene.add.container(20, 16, [g, face, name]).setScrollFactor(0).setDepth(ctx.depth);
    box.setInteractive(new Phaser.Geom.Rectangle(-4, -4, size + 16, size + 44), Phaser.Geom.Rectangle.Contains);
    if (box.input) box.input.cursor = 'pointer';
    box.on('pointerover', () => face.setTint(0xfff2d0));
    box.on('pointerout', () => face.clearTint());
    makeReadable(scene, cfg, box, size + 6, 6);
    return {};
  },

  /**
   * Speaker button with volume bars (bottom-left). The bars and the background
   * hum rise as Alex nears the source; clicking plays the recording in a pop-up.
   */
  noise(scene, cfg, ctx) {
    const sources = ctx.centersOf(cfg.source);
    const range = cfg.range * ctx.tilePx;
    const w = 132;
    const h = 60;
    const g = scene.add.graphics();
    panel(g, 0, 0, w, h);
    const icon = makeTexture(scene, 'hud-speaker', 14, 12, (p) => {
      const c = 0xfff4d6;
      p.rect(1, 4, 3, 4, c).rect(4, 3, 1, 6, c).rect(5, 2, 1, 8, c).rect(6, 1, 1, 10, c);
      p.rect(9, 4, 1, 4, c).rect(11, 2, 1, 2, c).rect(12, 4, 1, 4, c).rect(11, 8, 1, 2, c);
    }, PX);
    const speaker = scene.add.image(10, h / 2, icon).setOrigin(0, 0.5);
    const bars = scene.add.graphics();
    const colors = [0x7bd17b, 0xb8e05a, 0xf2c230, 0xf28c28, 0xe23b3b];
    const draw = (level: number) => {
      bars.clear();
      const lit = Math.round(level * 5);
      for (let i = 0; i < 5; i++) {
        const bh = 10 + i * 7;
        bars.fillStyle(i < lit ? colors[i] : 0x5b3a1e, i < lit ? 1 : 0.6).fillRect(64 + i * 12, h - 10 - bh, 8, bh);
      }
    };
    draw(0);
    const box = scene.add.container(20, GAME_HEIGHT - 20 - h, [g, speaker, bars]).setScrollFactor(0).setDepth(ctx.depth);
    box.setInteractive(new Phaser.Geom.Rectangle(-4, -4, w + 8, h + 8), Phaser.Geom.Rectangle.Contains);
    if (box.input) box.input.cursor = 'pointer';

    // Background hum, louder near the source; quiet while the pop-up's own player is open.
    const def = cfg.ambientSound ? getContent().audio.sounds[cfg.ambientSound] : undefined;
    const hum = def && cfg.ambientSound ? audio.sound(cfg.ambientSound, def) : null;
    hum?.setVolume(0, 0.01);
    hum?.play();
    let ducked = false;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hum?.stop(0.5));
    makeReadable(
      scene,
      cfg,
      box,
      w + 2,
      4,
      () => {
        ducked = true;
        hum?.setVolume(0, 0.2);
      },
      () => {
        ducked = false;
      },
    );

    let shown = -1;
    return {
      update(px, py) {
        let closest = Infinity;
        for (const s of sources) closest = Math.min(closest, Phaser.Math.Distance.Between(px, py, s.x, s.y));
        const level = Phaser.Math.Clamp(1 - closest / range, 0, 1);
        const step = Math.round(level * 5);
        if (step !== shown) {
          shown = step;
          draw(level);
        }
        if (hum && !ducked) hum.setVolume(Math.pow(level, 1.4) * cfg.ambientVolume, 0.3);
      },
    };
  },
};

/** Create every widget in hud.json. */
export function startHud(scene: Phaser.Scene, ctx: HudContext): RunningWidget[] {
  return getContent().hud.widgets.map((cfg) => (widgetTypes[cfg.type] as WidgetFactory<HudWidget['type']>)(scene, cfg, ctx));
}
