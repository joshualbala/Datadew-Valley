import Phaser from 'phaser';
import { ALEX } from '../art/illustrations/common';
import { makeTexture } from '../art/pixel';
import { WALKER_H, WALKER_W, walker, type Facing } from '../art/walker';
import { audio } from '../audio/audioManager';
import { MAP_SCALE, TILE } from './kinds';

const SPEED = 200; // screen pixels per second (about 4 tiles a second)
const STEP_MS = 130; // time per walk frame
const CYCLE: (0 | 1 | 2)[] = [1, 0, 2, 0];
/** Collision box around Alex's feet, in screen pixels (half width, height). */
const FOOT_HALF_W = 4 * MAP_SCALE;
const FOOT_H = 3 * MAP_SCALE;
const TILE_PX = TILE * MAP_SCALE;

/** Alex on the map: keyboard movement, tile collisions and the walk animation. */
export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private keys: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private facing: Facing = 'down';
  private stepTime = 0;
  private step = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private walkable: (tx: number, ty: number) => boolean,
  ) {
    for (const facing of ['down', 'up', 'side'] as const) {
      for (const frame of [0, 1, 2] as const) {
        makeTexture(scene, `alex-${facing}-${frame}`, WALKER_W, WALKER_H, (p) => walker(p, ALEX, facing, frame, 'sad'), MAP_SCALE);
      }
    }
    this.sprite = scene.add.image(x, y, 'alex-down-0').setOrigin(0.5, 1);
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Player['keys'];
    this.sprite.setDepth(y);
  }

  /** Feet position in screen pixels. */
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  update(deltaMs: number, frozen: boolean): void {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (!frozen) {
      if (k.A.isDown || k.LEFT.isDown) dx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) dx += 1;
      if (k.W.isDown || k.UP.isDown) dy -= 1;
      if (k.S.isDown || k.DOWN.isDown) dy += 1;
    }

    if (dx === 0 && dy === 0) {
      this.show(0);
      return;
    }

    const len = Math.hypot(dx, dy);
    const dist = (SPEED * deltaMs) / 1000;
    const mx = (dx / len) * dist;
    const my = (dy / len) * dist;
    // Move one axis at a time so Alex slides along walls instead of sticking.
    if (this.free(this.sprite.x + mx, this.sprite.y)) this.sprite.x += mx;
    if (this.free(this.sprite.x, this.sprite.y + my)) this.sprite.y += my;
    this.sprite.setDepth(this.sprite.y);

    this.facing = Math.abs(dx) > 0 && dy === 0 ? 'side' : dy < 0 ? 'up' : dy > 0 ? 'down' : 'side';
    if (this.facing === 'side') this.sprite.setFlipX(dx > 0);
    else this.sprite.setFlipX(false);

    this.stepTime += deltaMs;
    if (this.stepTime >= STEP_MS) {
      this.stepTime -= STEP_MS;
      this.step = (this.step + 1) % CYCLE.length;
      if (CYCLE[this.step] !== 0) audio.sfx('step');
    }
    this.show(CYCLE[this.step]);
  }

  /** Can Alex's feet stand at (x, y)? Checks all four corners of the foot box. */
  private free(x: number, y: number): boolean {
    const corners = [
      [x - FOOT_HALF_W, y - FOOT_H],
      [x + FOOT_HALF_W, y - FOOT_H],
      [x - FOOT_HALF_W, y - 1],
      [x + FOOT_HALF_W, y - 1],
    ];
    return corners.every(([cx, cy]) => this.walkable(Math.floor(cx / TILE_PX), Math.floor(cy / TILE_PX)));
  }

  private show(frame: 0 | 1 | 2): void {
    const key = `alex-${this.facing}-${frame}`;
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
  }
}
