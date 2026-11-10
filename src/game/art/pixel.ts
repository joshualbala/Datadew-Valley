import type Phaser from 'phaser';

/** The two Graphics methods the painter uses (kept minimal so tests can pass a fake). */
export interface PixelTarget {
  fillStyle(color: number, alpha?: number): unknown;
  fillRect(x: number, y: number, w: number, h: number): unknown;
}

/**
 * Tiny helper for drawing placeholder pixel art with Phaser Graphics.
 * Coordinates are in "art pixels"; each art pixel is `size` screen pixels.
 * Real sprite/tile art replaces this in Step 13, but it is handy for prototypes.
 */
export class PixelPainter {
  constructor(
    private g: PixelTarget,
    public readonly size = 2,
    private ox = 0,
    private oy = 0,
  ) {}

  /** A painter whose (0, 0) is at (x, y) of this one. Lets a drawing made for its own texture be reused inside a bigger picture. */
  at(x: number, y: number): PixelPainter {
    return new PixelPainter(this.g, this.size, this.ox + Math.round(x), this.oy + Math.round(y));
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): this {
    this.g.fillStyle(color, alpha);
    this.g.fillRect(
      (Math.round(x) + this.ox) * this.size,
      (Math.round(y) + this.oy) * this.size,
      Math.round(w) * this.size,
      Math.round(h) * this.size,
    );
    return this;
  }

  px(x: number, y: number, color: number, alpha = 1): this {
    return this.rect(x, y, 1, 1, color, alpha);
  }

  /** Checkerboard of `color` over an area, for pixel-art shading and soft gradients. */
  dither(x: number, y: number, w: number, h: number, color: number, alpha = 1, phase = 0): this {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = (yy + phase) % 2; xx < w; xx += 2) this.px(x + xx, y + yy, color, alpha);
    }
    return this;
  }

  /** 1-pixel outline of a rectangle. */
  frame(x: number, y: number, w: number, h: number, color: number): this {
    return this.rect(x, y, w, 1, color).rect(x, y + h - 1, w, 1, color).rect(x, y, 1, h, color).rect(x + w - 1, y, 1, h, color);
  }

  /** Top half of a disc (for arches and domes). */
  halfDisc(cx: number, cy: number, r: number, color: number, alpha = 1): this {
    for (let y = -r; y <= 0; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      this.rect(cx - half, cy + y, half * 2 + 1, 1, color, alpha);
    }
    return this;
  }

  /** Filled, pixel-stepped circle. */
  disc(cx: number, cy: number, r: number, color: number, alpha = 1): this {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      this.rect(cx - half, cy + y, half * 2 + 1, 1, color, alpha);
    }
    return this;
  }
}

/**
 * Draw something with a PixelPainter into a reusable texture (e.g. a tree or cloud),
 * so it can be placed many times as an Image.
 */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  artW: number,
  artH: number,
  draw: (p: PixelPainter) => void,
  size = 2,
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  draw(new PixelPainter(g, size));
  g.generateTexture(key, artW * size, artH * size);
  g.destroy();
  return key;
}
