import Phaser from 'phaser';
import type { Npc } from '../../content/schemas';
import { TOWNSFOLK, WORKERS } from '../art/illustrations/common';
import { makeTexture } from '../art/pixel';
import { WALKER_H, WALKER_W, emote, walker, type Facing } from '../art/walker';
import { audio } from '../audio/audioManager';
import type { ParsedMap } from './grid';
import { MAP_SCALE, TILE, WALK_COST, kinds } from './kinds';
import { findPath } from './path';

const TILE_PX = TILE * MAP_SCALE;
const SPEED = 42; // screen px per second: a slow, tired walk
const STEP_MS = 260;
const CYCLE: (0 | 1 | 2)[] = [1, 0, 2, 0];
const COUGH_RANGE = TILE_PX * 3.2;

type Tile = { x: number; y: number };

/** A place townspeople go: a house door, a shop/town hall door, or a spot beside a well/bench. */
interface Place {
  kind: 'home' | 'visit' | 'linger';
  /** Walkable tile they stand on when they arrive (in front of the door, beside the bench). */
  spot: Tile;
}

interface Person {
  cfg: Npc;
  sprite: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Image | null;
  key: string;
  facing: Facing;
  tile: Tile;
  home: Place | null;
  /** Where they are headed and the tiles left on the way. */
  goal: Place | null;
  path: Tile[];
  /** ms left inside a building or standing around; 0 = ready for the next errand. */
  busy: number;
  inside: boolean;
  stepTime: number;
  step: number;
  bubbleIn: number;
  coughCooldown: number;
  pitch: number;
}

const feet = (t: Tile) => ({ x: (t.x + 0.5) * TILE_PX, y: (t.y + 0.85) * TILE_PX });

/**
 * Neighbors from a map's "npcs" who go about their day: walk (slowly, along
 * sidewalks) to a shop or the town hall and step inside, stand by a well or
 * bench, then head home and go in, and so on. Sad ones show a rain cloud now
 * and then; anyone coughs when Alex walks past. Alex can walk through them.
 */
export class Townsfolk {
  private people: Person[] = [];
  private places: Place[] = [];
  private homes: Place[] = [];
  private costAt: (x: number, y: number) => number;

  constructor(
    private scene: Phaser.Scene,
    npcs: Npc[],
    private grid: ParsedMap,
  ) {
    makeTexture(scene, 'emote-sad', 9, 9, (p) => emote(p, 'sad'), MAP_SCALE);
    makeTexture(scene, 'cough-puff', 5, 4, (p) => p.rect(1, 0, 3, 4, 0xe8e8e0).rect(0, 1, 5, 2, 0xe8e8e0), MAP_SCALE);

    this.costAt = (x, y) => {
      if (!grid.walkable(x, y)) return Infinity;
      return WALK_COST[kinds[grid.kindAt(x, y)].ground] ?? 3;
    };
    this.findPlaces();

    npcs.forEach((cfg, i) => {
      const looks = cfg.role === 'worker' ? WORKERS : TOWNSFOLK;
      const look = looks[cfg.look % looks.length];
      const key = `npc-${cfg.role}-${cfg.look}-${cfg.mood}`;
      for (const facing of ['down', 'up', 'side'] as const) {
        for (const frame of [0, 1, 2] as const) {
          makeTexture(scene, `${key}-${facing}-${frame}`, WALKER_W, WALKER_H, (p) => walker(p, look, facing, frame, cfg.mood), MAP_SCALE);
        }
      }
      const start = { x: cfg.x, y: cfg.y };
      const { x, y } = feet(start);
      const sprite = scene.add.image(x, y, `${key}-down-0`).setOrigin(0.5, 1).setDepth(y);
      const bubble = cfg.mood === 'sad' ? scene.add.image(x, y, 'emote-sad').setDepth(99000).setVisible(false) : null;
      // Home = the nearest house to where they start.
      const home = this.nearest(this.homes, start);
      this.people.push({
        cfg,
        sprite,
        bubble,
        key,
        facing: 'down',
        tile: start,
        home,
        goal: null,
        path: [],
        busy: 400 + i * 700, // stagger the first errands
        inside: false,
        stepTime: 0,
        step: 0,
        bubbleIn: Phaser.Math.Between(2000, 8000),
        coughCooldown: 0,
        pitch: 0.8 + ((cfg.look * 37 + i * 13) % 50) / 100,
      });
    });
  }

  /** Call every frame with Alex's feet position. */
  update(deltaMs: number, px: number, py: number): void {
    for (const p of this.people) {
      if (p.busy > 0) {
        p.busy -= deltaMs;
        if (p.busy <= 0) this.nextErrand(p);
        else this.show(p, 0);
      } else {
        this.walk(p, deltaMs);
      }
      if (!p.inside) this.react(p, deltaMs, px, py);
      p.bubble?.setPosition(p.sprite.x, p.sprite.y - WALKER_H * MAP_SCALE - 16);
    }
  }

  /** Every door and gathering spot on the map that townspeople can use. */
  private findPlaces(): void {
    for (const b of this.grid.objects) {
      const role = kinds[b.kind].npc;
      if (!role) continue;
      let spot: Tile | null = null;
      if (role === 'linger') {
        spot =
          [
            { x: b.x, y: b.y + 1 },
            { x: b.x - 1, y: b.y },
            { x: b.x + 1, y: b.y },
            { x: b.x, y: b.y - 1 },
          ].find((t) => this.grid.walkable(t.x, t.y)) ?? null;
      } else {
        const door = { x: b.x + (kinds[b.kind].door ?? Math.floor(b.w / 2)), y: b.y + b.h };
        spot = this.grid.walkable(door.x, door.y) ? door : null;
      }
      if (!spot) continue;
      const place = { kind: role, spot };
      if (role === 'home') this.homes.push(place);
      else this.places.push(place);
    }
  }

  private nearest(list: Place[], from: Tile): Place | null {
    let best: Place | null = null;
    let bestD = Infinity;
    for (const pl of list) {
      const d = Math.abs(pl.spot.x - from.x) + Math.abs(pl.spot.y - from.y);
      if (d < bestD) {
        best = pl;
        bestD = d;
      }
    }
    return best;
  }

  /** Come back out (if inside) and set off for the next place: an errand, or home after one. */
  private nextErrand(p: Person): void {
    if (p.inside) {
      p.inside = false;
      p.sprite.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: p.sprite, alpha: 1, duration: 400 });
      p.facing = 'down';
    }
    const wasHome = p.goal === p.home;
    for (let attempt = 0; attempt < 4; attempt++) {
      const goHome = !wasHome && p.home && Math.random() < 0.6;
      const options = this.places.filter((pl) => pl !== p.goal);
      const goal = goHome ? p.home : Phaser.Utils.Array.GetRandom(options.length ? options : this.places);
      if (!goal) break;
      const path = findPath({ w: this.grid.w, h: this.grid.h, cost: this.costAt }, p.tile, goal.spot);
      if (path && path.length) {
        p.goal = goal;
        p.path = path;
        return;
      }
    }
    p.busy = 3000; // nowhere reachable right now: wait and try again
  }

  /** Follow the path one tile at a time; arriving starts the visit. */
  private walk(p: Person, deltaMs: number): void {
    const next = p.path[0];
    if (!next) {
      this.arrive(p);
      return;
    }
    const target = feet(next);
    const dx = target.x - p.sprite.x;
    const dy = target.y - p.sprite.y;
    const len = Math.hypot(dx, dy);
    const dist = (SPEED * deltaMs) / 1000;
    if (Math.abs(dx) > Math.abs(dy)) {
      p.facing = 'side';
      p.sprite.setFlipX(dx > 0);
    } else {
      p.facing = dy < 0 ? 'up' : 'down';
      p.sprite.setFlipX(false);
    }
    if (len <= dist) {
      p.sprite.setPosition(target.x, target.y);
      p.tile = next;
      p.path.shift();
    } else {
      p.sprite.x += (dx / len) * dist;
      p.sprite.y += (dy / len) * dist;
    }
    p.sprite.setDepth(p.sprite.y);
    p.stepTime += deltaMs;
    if (p.stepTime >= STEP_MS) {
      p.stepTime -= STEP_MS;
      p.step = (p.step + 1) % CYCLE.length;
    }
    this.show(p, CYCLE[p.step]);
  }

  private arrive(p: Person): void {
    const goal = p.goal;
    if (goal && goal.kind !== 'linger') {
      // Step inside: walk "up" into the door and fade away.
      p.facing = 'up';
      this.show(p, 0);
      p.inside = true;
      p.bubble?.setVisible(false);
      this.scene.tweens.add({ targets: p.sprite, alpha: 0, duration: 400, onComplete: () => p.sprite.setVisible(false) });
      p.busy = goal.kind === 'home' ? Phaser.Math.Between(9000, 18000) : Phaser.Math.Between(5000, 11000);
    } else {
      // Stand around for a bit.
      p.facing = 'down';
      p.busy = Phaser.Math.Between(4000, 9000);
    }
  }

  private react(p: Person, deltaMs: number, px: number, py: number): void {
    if (p.bubble) {
      p.bubbleIn -= deltaMs;
      if (p.bubbleIn <= 0) {
        p.bubble.setVisible(!p.bubble.visible);
        p.bubbleIn = p.bubble.visible ? 1600 : Phaser.Math.Between(5000, 10000);
      }
    }
    // Neighbors cough when Alex comes close (not too often).
    if (p.cfg.role !== 'neighbor') return;
    p.coughCooldown -= deltaMs;
    const d = Phaser.Math.Distance.Between(px, py, p.sprite.x, p.sprite.y);
    if (d < COUGH_RANGE && p.coughCooldown <= 0) {
      p.coughCooldown = Phaser.Math.Between(6000, 10000);
      audio.sfx('cough', { volume: 1.3 + 0.9 * (1 - d / COUGH_RANGE), pitch: p.pitch });
      coughPuff(this.scene, p.sprite.x + (p.sprite.flipX ? 10 : -10), p.sprite.y - WALKER_H * MAP_SCALE * 0.65);
    }
  }

  private show(p: Person, frame: 0 | 1 | 2): void {
    const key = `${p.key}-${p.facing}-${frame}`;
    if (p.sprite.texture.key !== key) p.sprite.setTexture(key);
  }
}

/** A small cloud that puffs out of someone's mouth and fades. */
export function coughPuff(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 2; i++) {
    const puff = scene.add.image(x, y, 'cough-puff').setDepth(99500).setAlpha(0.85).setScale(0.6);
    scene.tweens.add({
      targets: puff,
      x: x + Phaser.Math.Between(-14, 14),
      y: y - Phaser.Math.Between(10, 22),
      scale: 1.3,
      alpha: 0,
      delay: i * 260,
      duration: 700,
      onComplete: () => puff.destroy(),
    });
  }
}
