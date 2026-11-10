import Phaser from 'phaser';
import { getContent } from '../../content/store';
import { progress } from '../../state/progress';
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
import { Townsfolk, coughPuff } from '../map/npcs';
import { Player } from '../map/player';
import { addWaterFlow } from '../map/waterFlow';
import { addMuteButton } from '../ui/muteButton';

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

  constructor() {
    super('Map');
  }

  init(data: { map: string; popup?: string }): void {
    this.mapName = data.map;
    this.introPopup = data.popup;
    this.player = undefined;
    this.effects = [];
    this.widgets = [];
    this.townsfolk = undefined;
    this.flowWater = undefined;
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
      const sprite = kinds[block.kind].object!(grid.neighborsOf(block.x, block.y), block);
      const key = makeTexture(this, `tile-${block.kind}${sprite.variant ? `-${sprite.variant}` : ''}`, sprite.w, sprite.h, sprite.draw, MAP_SCALE);
      const bottom = (block.y + block.h) * TILE_PX + (sprite.sink ?? 0) * MAP_SCALE;
      this.add.image((block.x + block.w / 2) * TILE_PX, bottom, key).setOrigin(0.5, 1).setDepth(bottom);
    }

    this.player = new Player(this, (map.spawn.x + 0.5) * TILE_PX, (map.spawn.y + 0.8) * TILE_PX, grid.walkable);
    this.markers = new HotspotMarkers(this, map.hotspots, grid);
    this.townsfolk = new Townsfolk(this, map.npcs, grid.walkable);
    this.flowWater = addWaterFlow(this, grid);
    this.scheduleAlexCough();

    const centersOf = (kind: string) => grid.centersOf(kind).map((c) => ({ x: c.x * TILE_PX, y: c.y * TILE_PX }));
    this.effects = startEffects(this, map.effects, { worldW, worldH, tilePx: TILE_PX, centersOf });
    this.widgets = startHud(this, { depth: HUD_DEPTH, tilePx: TILE_PX, centersOf });
    addProgressCounter(this, HUD_DEPTH, 20, 166);
    addMuteButton(this, HUD_DEPTH);

    if (map.music) {
      const track = getContent().audio.music[map.music];
      if (track) audio.playMusic(map.music, track);
    }

    // TEMPORARY (until the website's Reset button, build step 9): R clears progress so the team can replay.
    this.input.keyboard?.on('keydown-R', () => {
      if (isPopupOpen()) return;
      progress.reset();
      this.scene.restart({ map: this.mapName });
    });

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
    for (const fx of this.effects) fx.update?.(x, y);
    for (const w of this.widgets) w.update?.(x, y);
    this.townsfolk?.update(delta, x, y);
    this.flowWater?.(delta);
  }
}
