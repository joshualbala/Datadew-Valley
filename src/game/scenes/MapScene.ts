import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { showError } from '../../ui/errorBox';
import { isPopupOpen, openPopup } from '../../ui/popup';
import { seeded } from '../art/illustrations/common';
import { makeTexture } from '../art/pixel';
import { audio } from '../audio/audioManager';
import { startEffects, type RunningEffect } from '../effects';
import { addProgressCounter } from '../hud/progressCounter';
import { startHud, type RunningWidget } from '../hud/widgets';
import { parseMap } from '../map/grid';
import { HotspotMarkers } from '../map/hotspots';
import { MAP_SCALE, TILE, kinds, paintGround } from '../map/kinds';
import { Doors } from '../map/doors';
import { Townsfolk, coughPuff } from '../map/npcs';
import { Player } from '../map/player';
import { addWaterFlow } from '../map/waterFlow';
import { addMuteButton } from '../ui/muteButton';
import { addResetButton } from '../ui/resetButton';

const TILE_PX = TILE * MAP_SCALE;
const HUD_DEPTH = 200000;

/**
 * Any walkable map from public/content/maps/<name>.json: the letter grid is
 * drawn as top-down tiles, buildings and trees are y-sorted sprites (Alex can
 * walk behind them), and "!" markers open pop-ups.
 */
export class MapScene extends Phaser.Scene {
  private mapName = '';
  private introPopup?: string;
  private player?: Player;
  private markers!: HotspotMarkers;
  private effects: RunningEffect[] = [];
  private widgets: RunningWidget[] = [];
  private townsfolk?: Townsfolk;
  private flowWater?: (deltaMs: number) => void;
  private doors?: Doors;
  /** Where Alex arrives when coming through a door (otherwise the map's spawn). */
  private arriveAt?: { x: number; y: number };
  private leaving = false;

  constructor() {
    super('Map');
  }

  init(data: { map: string; popup?: string; spawn?: { x: number; y: number } }): void {
    this.mapName = data.map;
    this.introPopup = data.popup;
    this.arriveAt = data.spawn;
    this.leaving = false;
    this.doors = undefined;
    this.player = undefined;
    this.effects = [];
    this.widgets = [];
    this.townsfolk = undefined;
    this.flowWater = undefined;
  }

  /** Fade out and load the door's map, arriving at its spawn. */
  private goThrough(door: { to: string; spawn: { x: number; y: number } }): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.sfx('close');
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ map: door.to, spawn: door.spawn }));
  }

  /** Blinking status lights on equipment (server racks, power cabinets), from the tile kind's `leds`. */
  private addLeds(block: { kind: string; x: number; w: number }, sprite: { w: number; h: number }, bottom: number): void {
    const leds = kinds[block.kind].leds;
    if (!leds) return;
    makeTexture(this, 'led-dot', 1, 1, (p) => p.px(0, 0, 0xffffff), MAP_SCALE);
    const left = (block.x + block.w / 2) * TILE_PX - (sprite.w * MAP_SCALE) / 2;
    const top = bottom - sprite.h * MAP_SCALE;
    leds.at.forEach(([lx, ly], i) => {
      const led = this.add
        .image(left + lx * MAP_SCALE, top + ly * MAP_SCALE, 'led-dot')
        .setOrigin(0)
        .setTint(leds.colors[(i + block.x) % leds.colors.length])
        .setDepth(bottom + 0.1);
      this.tweens.add({
        targets: led,
        alpha: 0.2,
        duration: Phaser.Math.Between(150, 600),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
        repeatDelay: Phaser.Math.Between(100, 1800),
      });
    });
  }

  /** Alex is unwell: a cough every so often (audio.json → alexCoughSeconds). */
  private scheduleAlexCough(): void {
    const [min, max] = getContent().audio.alexCoughSeconds;
    if (max <= 0) return;
    this.time.delayedCall(Phaser.Math.Between(min * 1000, max * 1000), () => {
      if (this.player && !isPopupOpen()) {
        audio.sfx('cough', { volume: 0.8, pitch: 1.05 });
        coughPuff(this, this.player.x + (this.player.sprite.flipX ? 12 : -12), this.player.y - 40);
        this.tweens.add({ targets: this.player.sprite, scaleY: 0.93, duration: 110, yoyo: true, repeat: 1 });
      }
      this.scheduleAlexCough();
    });
  }

  create(): void {
    const map = getContent().maps[this.mapName];
    if (!map) throw new Error(`Unknown map "${this.mapName}" (expected public/content/maps/${this.mapName}.json)`);
    const grid = parseMap(map);
    if (grid.errors.length) {
      showError(new Error(`public/content/maps/${this.mapName}.json has problems:\n\n- ${grid.errors.join('\n- ')}`));
      return;
    }
    const worldW = grid.w * TILE_PX;
    const worldH = grid.h * TILE_PX;

    // Ground: painted once into a single texture. Grass dries out near the dryness source (the data center).
    const drySources = map.dryness ? grid.centersOf(map.dryness.source) : [];
    const dryAt = (x: number, y: number) => {
      if (!map.dryness) return 0;
      let d = Infinity;
      for (const s of drySources) d = Math.min(d, Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y));
      return Phaser.Math.Clamp(1 - d / map.dryness.radius, 0, 1);
    };
    const groundKey = makeTexture(this, `map-${this.mapName}-ground`, grid.w * TILE, grid.h * TILE, (p) => {
      const rng = seeded(this.mapName.length * 7919 + grid.w);
      for (let y = 0; y < grid.h; y++) {
        for (let x = 0; x < grid.w; x++) {
          paintGround(p.at(x * TILE, y * TILE), grid.kindAt(x, y), grid.neighborsOf(x, y), rng, dryAt(x, y));
        }
      }
    }, MAP_SCALE);
    this.add.image(0, 0, groundKey).setOrigin(0).setDepth(-1);

    // Trees, fences and buildings: sprites sorted by their base so Alex walks behind or in front.
    for (const block of grid.objects) {
      const sprite = kinds[block.kind].object!(grid.neighborsOf(block.x, block.y), block, dryAt(block.x, block.y));
      const key = makeTexture(this, `tile-${block.kind}${sprite.variant ? `-${sprite.variant}` : ''}`, sprite.w, sprite.h, sprite.draw, MAP_SCALE);
      const bottom = (block.y + block.h) * TILE_PX + (sprite.sink ?? 0) * MAP_SCALE;
      this.add.image((block.x + block.w / 2) * TILE_PX, bottom, key).setOrigin(0.5, 1).setDepth(bottom);
      this.addLeds(block, sprite, bottom);
    }

    const start = this.arriveAt ?? map.spawn;
    this.player = new Player(this, (start.x + 0.5) * TILE_PX, (start.y + 0.8) * TILE_PX, grid.walkable);
    this.markers = new HotspotMarkers(this, map.hotspots, grid);
    this.townsfolk = new Townsfolk(this, map.npcs, grid);
    this.flowWater = addWaterFlow(this, grid);
    this.scheduleAlexCough();
    this.doors = new Doors(this, map.doors, () => this.markers.isNear || this.leaving, (door) => this.goThrough(door));

    const centersOf = (kind: string) => grid.centersOf(kind).map((c) => ({ x: c.x * TILE_PX, y: c.y * TILE_PX }));
    const blocksOf = (kind: string) =>
      grid.objects.filter((b) => b.kind === kind).map((b) => ({ x: b.x * TILE_PX, y: b.y * TILE_PX, w: b.w * TILE_PX, h: b.h * TILE_PX }));
    this.effects = startEffects(this, map.effects, { worldW, worldH, tilePx: TILE_PX, centersOf, blocksOf });
    this.widgets = startHud(this, { depth: HUD_DEPTH, tilePx: TILE_PX, centersOf, noise: map.noise });
    addProgressCounter(this, HUD_DEPTH, 20, 166);
    addMuteButton(this, HUD_DEPTH);
    addResetButton(this, HUD_DEPTH);

    const track = map.music ? getContent().audio.music[map.music] : undefined;
    if (map.music && track) audio.playMusic(map.music, track);
    else audio.stopMusic(1.5); // e.g. inside the data center: only the machines


    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH).setRoundPixels(true);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.fadeIn(600, 0, 0, 0);
    if (this.introPopup) {
      const id = this.introPopup;
      this.introPopup = undefined;
      this.time.delayedCall(450, () => void openPopup(id));
    }
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;
    this.player.update(delta, isPopupOpen());
    const { x, y } = this.player;
    this.markers.update(x, y);
    this.doors?.update(x, y);
    for (const fx of this.effects) fx.update?.(x, y);
    for (const w of this.widgets) w.update?.(x, y);
    this.townsfolk?.update(delta, x, y);
    this.flowWater?.(delta);
  }
}
