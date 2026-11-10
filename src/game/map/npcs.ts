import Phaser from 'phaser';
import type { Npc } from '../../content/schemas';
import { TOWNSFOLK } from '../art/illustrations/common';
import { makeTexture } from '../art/pixel';
import { WALKER_H, WALKER_W, emote, walker, type Facing } from '../art/walker';
import { audio } from '../audio/audioManager';
import { MAP_SCALE, TILE } from './kinds';

const TILE_PX = TILE * MAP_SCALE;
const SPEED = 42; // screen px per second: a slow, tired walk
const STEP_MS = 260;
const CYCLE: (0 | 1 | 2)[] = [1, 0, 2, 0];
const COUGH_RANGE = TILE_PX * 2.4;
const DIRS: [number, number, Facing, boolean][] = [
  [0, 1, 'down', false],
  [0, -1, 'up', false],
  [-1, 0, 'side', false],
  [1, 0, 'side', true],
];

interface Walker {
  cfg: Npc;
  sprite: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Image;
  key: string;
  facing: Facing;
  tile: { x: number; y: number };
  target: { x: number; y: number } | null;
  wait: number;
  stepTime: number;
  step: number;
  bubbleIn: number;
  coughCooldown: number;
  pitch: number;
}

/**
 * Neighbors from a map's "npcs": they wander slowly near home, show a rain
 * cloud (sad) or anger mark (angry) now and then, and cough as Alex passes.
 * Alex can walk through them, so nobody gets stuck.
 */
export class Townsfolk {
  private people: Walker[] = [];

  constructor(
    private scene: Phaser.Scene,
    npcs: Npc[],
    private walkable: (x: number, y: number) => boolean,
  ) {
    for (const mood of ['sad', 'angry'] as const) makeTexture(scene, `emote-${mood}`, 9, 9, (p) => emote(p, mood), MAP_SCALE);
    makeTexture(scene, 'cough-puff', 5, 4, (p) => p.rect(1, 0, 3, 4, 0xe8e8e0).rect(0, 1, 5, 2, 0xe8e8e0), MAP_SCALE);

    npcs.forEach((cfg, i) => {
      const look = TOWNSFOLK[cfg.look % TOWNSFOLK.length];
      const key = `npc-${cfg.look}-${cfg.mood}`;
      for (const facing of ['down', 'up', 'side'] as const) {
        for (const frame of [0, 1, 2] as const) {
          makeTexture(scene, `${key}-${facing}-${frame}`, WALKER_W, WALKER_H, (p) => walker(p, look, facing, frame, cfg.mood), MAP_SCALE);
        }
      }
      const x = (cfg.x + 0.5) * TILE_PX;
      const y = (cfg.y + 0.85) * TILE_PX;
      const sprite = scene.add.image(x, y, `${key}-down-0`).setOrigin(0.5, 1).setDepth(y);
      const bubble = scene.add.image(x, y, `emote-${cfg.mood}`).setDepth(99000).setVisible(false);
      this.people.push({
        cfg,
        sprite,
        bubble,
        key,
        facing: 'down',
        tile: { x: cfg.x, y: cfg.y },
        target: null,
        wait: 500 + i * 400,
        stepTime: 0,
        step: 0,
        bubbleIn: Phaser.Math.Between(1500, 6000),
        coughCooldown: 0,
        pitch: 0.8 + ((cfg.look * 37 + i * 13) % 50) / 100,
      });
    });
  }

  /** Call every frame with Alex's feet position. */
  update(deltaMs: number, px: number, py: number): void {
    for (const w of this.people) {
      this.move(w, deltaMs);
      this.react(w, deltaMs, px, py);
      w.bubble.setPosition(w.sprite.x, w.sprite.y - WALKER_H * MAP_SCALE - 16);
    }
  }

  private move(w: Walker, deltaMs: number): void {
    if (!w.target) {
      w.wait -= deltaMs;
      this.show(w, 0);
      if (w.wait > 0) return;
      // Pick a random neighboring tile that is walkable and not too far from home.
      const options = Phaser.Utils.Array.Shuffle([...DIRS]).filter(([dx, dy]) => {
        const nx = w.tile.x + dx;
        const ny = w.tile.y + dy;
        return this.walkable(nx, ny) && Math.abs(nx - w.cfg.x) + Math.abs(ny - w.cfg.y) <= w.cfg.wander;
      });
      if (!options.length) {
        w.wait = 1500;
        return;
      }
      const [dx, dy, facing, flip] = options[0];
      w.tile = { x: w.tile.x + dx, y: w.tile.y + dy };
      w.target = { x: (w.tile.x + 0.5) * TILE_PX, y: (w.tile.y + 0.85) * TILE_PX };
      w.facing = facing;
      w.sprite.setFlipX(flip);
      return;
    }
    const dist = (SPEED * deltaMs) / 1000;
    const dx = w.target.x - w.sprite.x;
    const dy = w.target.y - w.sprite.y;
    const len = Math.hypot(dx, dy);
    if (len <= dist) {
      w.sprite.setPosition(w.target.x, w.target.y);
      w.target = null;
      // Sometimes keep walking, often stop and stand a while.
      w.wait = Math.random() < 0.45 ? 0 : Phaser.Math.Between(1200, 4000);
    } else {
      w.sprite.x += (dx / len) * dist;
      w.sprite.y += (dy / len) * dist;
    }
    w.sprite.setDepth(w.sprite.y);
    w.stepTime += deltaMs;
    if (w.stepTime >= STEP_MS) {
      w.stepTime -= STEP_MS;
      w.step = (w.step + 1) % CYCLE.length;
    }
    this.show(w, CYCLE[w.step]);
  }

  private react(w: Walker, deltaMs: number, px: number, py: number): void {
    // Mood bubble every few seconds.
    w.bubbleIn -= deltaMs;
    if (w.bubbleIn <= 0) {
      w.bubble.setVisible(!w.bubble.visible);
      w.bubbleIn = w.bubble.visible ? 1600 : Phaser.Math.Between(4000, 9000);
    }
    // Cough when Alex comes close (not too often).
    w.coughCooldown -= deltaMs;
    const d = Phaser.Math.Distance.Between(px, py, w.sprite.x, w.sprite.y);
    if (d < COUGH_RANGE && w.coughCooldown <= 0) {
      w.coughCooldown = Phaser.Math.Between(7000, 12000);
      audio.sfx('cough', { volume: 0.45 + 0.55 * (1 - d / COUGH_RANGE), pitch: w.pitch });
      coughPuff(this.scene, w.sprite.x + (w.sprite.flipX ? 10 : -10), w.sprite.y - WALKER_H * MAP_SCALE * 0.65);
    }
  }

  private show(w: Walker, frame: 0 | 1 | 2): void {
    const key = `${w.key}-${w.facing}-${frame}`;
    if (w.sprite.texture.key !== key) w.sprite.setTexture(key);
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
