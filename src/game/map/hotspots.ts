import Phaser from 'phaser';
import type { Hotspot } from '../../content/schemas';
import { getContent } from '../../content/store';
import { progress } from '../../state/progress';
import { isPopupOpen, openPopup } from '../../ui/popup';
import { makeTexture } from '../art/pixel';
import { audio } from '../audio/audioManager';
import { FONT } from '../constants';
import { INK, PARCHMENT, WOOD_DARK } from '../ui/theme';
import type { ParsedMap } from './grid';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
const RANGE = TILE_PX * 1.75; // how close Alex must be to read a hotspot
const MARKER_DEPTH = 100000;

/** What floats above a hotspot: texture key per indicator. */
const INDICATORS: Record<Hotspot['indicator'], string> = { '!': 'marker-bang', '-$': 'marker-owe' };

interface Marker {
  spot: Hotspot;
  img: Phaser.GameObjects.Image;
  /** Points (screen px) Alex can stand near to read it: the marker itself, or every tile of its area. */
  points: { x: number; y: number }[];
  glow?: Phaser.GameObjects.Image;
}

/**
 * The bobbing markers on a map ("!" or "-$"). Walk close to one to see
 * "Press E"; E (or clicking the marker) opens its pop-up, and Continue removes
 * it for good. Area hotspots (e.g. the river) glow while Alex is near any part
 * of them.
 */
export class HotspotMarkers {
  private markers: Marker[] = [];
  private hint: Phaser.GameObjects.Container;
  private near: Marker | null = null;

  constructor(
    private scene: Phaser.Scene,
    spots: Hotspot[],
    grid: ParsedMap,
  ) {
    makeIndicatorTextures(scene);

    for (const spot of spots) {
      if (progress.isRead(spot.id)) continue;
      const x = (spot.x + 0.5) * TILE_PX;
      const y = (spot.y + 0.5) * TILE_PX;
      // Float higher over things that stand on their tile (a mailbox), lower over open ground.
      const lift = grid.walkable(spot.x, spot.y) || spot.area ? 0.55 : 1.15;
      const img = scene.add
        .image(x, y - TILE_PX * lift, INDICATORS[spot.indicator])
        .setDepth(MARKER_DEPTH)
        .setInteractive({ useHandCursor: true });
      scene.tweens.add({ targets: img, y: img.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const marker: Marker = { spot, img, points: [{ x, y }] };
      if (spot.area) {
        const tiles = grid.tilesOf(spot.area);
        marker.points = tiles.map((t) => ({ x: (t.x + 0.5) * TILE_PX, y: (t.y + 0.5) * TILE_PX }));
        marker.glow = this.makeGlow(spot, tiles, grid);
      }
      img.on('pointerdown', () => {
        if (this.near === marker) this.read(marker);
      });
      this.markers.push(marker);
    }

    const label = scene.add.text(0, 0, getContent().ui.map.interactHint, { fontFamily: FONT, fontSize: '24px', color: INK }).setOrigin(0.5);
    const bg = scene.add.rectangle(0, 0, label.width + 18, label.height + 4, PARCHMENT).setStrokeStyle(3, WOOD_DARK);
    this.hint = scene.add
      .container(0, 0, [bg, label])
      .setDepth(MARKER_DEPTH + 1)
      .setVisible(false);

    scene.input.keyboard?.on('keydown-E', () => {
      if (this.near && !isPopupOpen()) this.read(this.near);
    });
  }

  /** Is Alex close enough to read a marker right now? */
  get isNear(): boolean {
    return this.near !== null;
  }

  /** Call every frame with Alex's feet position. */
  update(px: number, py: number): void {
    let best: Marker | null = null;
    let bestDist = RANGE;
    const fy = py - TILE_PX * 0.3;
    for (const m of this.markers) {
      for (const pt of m.points) {
        const d = Phaser.Math.Distance.Between(px, fy, pt.x, pt.y);
        if (d < bestDist) {
          best = m;
          bestDist = d;
        }
      }
    }
    if (best !== this.near) {
      if (this.near?.glow) this.scene.tweens.add({ targets: this.near.glow, alpha: 0, duration: 300 });
      if (best?.glow) this.scene.tweens.add({ targets: best.glow, alpha: 1, duration: 300 });
    }
    this.near = best;
    this.hint.setVisible(Boolean(best) && !isPopupOpen());
    if (!best) return;
    // Area hotspots show the hint over Alex; point hotspots over their marker.
    if (best.spot.area) this.hint.setPosition(px, py - TILE_PX * 1.75);
    else this.hint.setPosition(best.img.x, best.img.y - 34);
  }

  private read(marker: Marker): void {
    openPopup(marker.spot.popup).then(() => {
      progress.markRead(marker.spot.id);
      audio.sfx('read');
      this.markers = this.markers.filter((m) => m !== marker);
      if (this.near === marker) this.near = null;
      marker.img.disableInteractive();
      this.scene.tweens.killTweensOf(marker.img);
      this.scene.tweens.add({ targets: marker.img, scale: 1.6, alpha: 0, duration: 250, onComplete: () => marker.img.destroy() });
      const glow = marker.glow;
      if (glow) {
        this.scene.tweens.killTweensOf(glow);
        this.scene.tweens.add({ targets: glow, alpha: 0, duration: 400, onComplete: () => glow.destroy() });
      }
    });
  }

  /** A soft colored highlight over every tile of the area, brighter along its edges (hidden until Alex is near). */
  private makeGlow(spot: Hotspot, tiles: { x: number; y: number }[], grid: ParsedMap): Phaser.GameObjects.Image {
    const color = Number.parseInt(spot.highlightColor.slice(1), 16);
    const inArea = (x: number, y: number) => grid.kindAt(x, y) === spot.area;
    const key = makeTexture(
      this.scene,
      `glow-${spot.id}`,
      grid.w * TILE,
      grid.h * TILE,
      (p) => {
        for (const t of tiles) {
          const ox = t.x * TILE;
          const oy = t.y * TILE;
          p.rect(ox, oy, TILE, TILE, color, 0.22);
          if (!inArea(t.x, t.y - 1)) p.rect(ox, oy, TILE, 2, color, 0.85);
          if (!inArea(t.x, t.y + 1)) p.rect(ox, oy + TILE - 2, TILE, 2, color, 0.85);
          if (!inArea(t.x - 1, t.y)) p.rect(ox, oy, 2, TILE, color, 0.85);
          if (!inArea(t.x + 1, t.y)) p.rect(ox + TILE - 2, oy, 2, TILE, color, 0.85);
        }
      },
      MAP_SCALE,
    );
    return this.scene.add.image(0, 0, key).setOrigin(0).setDepth(-0.5).setAlpha(0);
  }
}

function makeIndicatorTextures(scene: Phaser.Scene): void {
  const outline = 0x3a2412;
  makeTexture(
    scene,
    'marker-bang',
    7,
    14,
    (p) => {
      p.rect(1, 0, 5, 10, outline).rect(1, 11, 5, 3, outline);
      p.rect(2, 1, 3, 8, 0xffd23f).rect(2, 12, 3, 1, 0xffd23f);
      p.rect(2, 1, 1, 7, 0xfff2a8).px(4, 8, 0xd9a21b);
    },
    MAP_SCALE,
  );
  // "-$" in red: money owed.
  makeTexture(
    scene,
    'marker-owe',
    15,
    14,
    (p) => {
      const red = 0xe23b3b;
      const hi = 0xff8a8a;
      p.rect(0, 5, 6, 4, outline).rect(1, 6, 4, 2, red); // minus
      p.rect(7, 2, 8, 10, outline).rect(9, 0, 3, 14, outline); // $ outline
      p.rect(10, 1, 1, 12, red);
      p.rect(8, 3, 6, 2, red).rect(8, 5, 2, 1, red).rect(8, 6, 6, 2, red).rect(12, 8, 2, 1, red).rect(8, 9, 6, 2, red);
      p.px(8, 3, hi).px(9, 6, hi);
    },
    MAP_SCALE,
  );
}
