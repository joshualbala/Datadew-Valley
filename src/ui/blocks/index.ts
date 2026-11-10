import type { Block } from '../../content/schemas';
import { gridOf, illustrations } from '../../game/art/illustrations';
import { PixelPainter, type PixelTarget } from '../../game/art/pixel';
import { audio } from '../../game/audio/audioManager';
import { getContent } from '../../content/store';

/** What a block can ask of the pop-up it is in. */
export interface BlockContext {
  /** Run `fn` when the pop-up closes (e.g. stop a sound). */
  onClose(fn: () => void): void;
}

type Renderer<T extends Block['type']> = (block: Extract<Block, { type: T }>, ctx: BlockContext) => HTMLElement;

/** Key names in a "keys" block that are drawn as arrows. */
const ARROWS: Record<string, string> = { '↑': 'up', '↓': 'down', '←': 'left', '→': 'right', Up: 'up', Down: 'down', Left: 'left', Right: 'right' };

/** Create an element with a class and (safe) text. */
function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * How each pop-up block type is shown. To add a block type: add its schema in
 * content/schemas.ts (BlockSchema), then add a renderer here.
 */
export const blockRenderers: { [T in Block['type']]: Renderer<T> } = {
  text: (b) => el('p', 'block-text', b.text),

  stat: (b) => {
    const box = el('div', 'block-stat');
    box.append(el('div', 'block-stat-value', b.value), el('div', 'block-stat-label', b.label));
    return box;
  },

  citation: (b) => {
    const p = el('p', 'block-citation');
    if (b.url) {
      const a = document.createElement('a');
      a.href = b.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = b.text;
      p.append(a);
    } else {
      p.textContent = b.text;
    }
    return p;
  },

  keys: (b) => {
    const list = el('div', 'block-keys');
    for (const row of b.rows) {
      const line = el('div', 'block-keys-row');
      const caps = el('div', 'block-keys-caps');
      for (const key of row.keys) {
        // Arrow keys are drawn as pixel triangles (the pixel font has no arrow characters).
        const arrow = ARROWS[key];
        const cap = el('kbd', arrow ? `keycap keycap-arrow keycap-arrow-${arrow}` : 'keycap', arrow ? '' : key);
        if (arrow) cap.setAttribute('aria-label', `${arrow} arrow`);
        caps.append(cap);
      }
      line.append(caps, el('span', 'block-keys-label', row.label));
      list.append(line);
    }
    return list;
  },

  bill: (b) => {
    const money = (v: number) => `${v < 0 ? '-' : ''}${b.currency}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const table = el('div', 'block-bill');
    const head = el('div', 'bill-row bill-head');
    head.append(el('span', '', ''), el('span', '', b.beforeLabel), el('span', '', b.afterLabel));
    table.append(head);
    let increase = 0;
    for (const item of b.items) {
      const row = el('div', 'bill-row');
      const diff = item.after - item.before;
      increase += diff;
      const after = el('span', diff > 0 ? 'bill-up' : '', money(item.after));
      if (diff > 0) after.append(el('small', 'bill-diff', ` (+${money(diff)})`));
      row.append(el('span', 'bill-label', item.label), el('span', '', money(item.before)), after);
      table.append(row);
    }
    const total = el('div', 'bill-total');
    total.append(el('span', '', b.totalLabel), el('strong', 'bill-up', money(b.total ?? increase)));
    table.append(total);
    if (b.note) table.append(el('div', 'bill-note', b.note));
    return table;
  },

  audioPlayer: (b, ctx) => {
    const box = el('div', 'block-audio');
    const def = getContent().audio.sounds[b.sound];
    const button = el('button', 'audio-toggle') as HTMLButtonElement;
    button.type = 'button';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '80';
    slider.className = 'audio-volume';
    slider.setAttribute('aria-label', b.volumeLabel);
    const volume = el('label', 'audio-volume-label');
    volume.append(el('span', '', b.volumeLabel), slider);
    if (b.label) box.append(el('div', 'audio-title', b.label));
    box.append(button, volume);
    if (!def) {
      console.warn(`No sound "${b.sound}" in audio.json → sounds`);
      return box;
    }
    const sound = audio.sound(b.sound, def);
    sound.setVolume(Number(slider.value) / 100, 0.01);
    const refresh = () => {
      button.textContent = sound.playing ? b.pauseLabel : b.playLabel;
      button.classList.toggle('is-playing', sound.playing);
    };
    button.addEventListener('click', () => {
      if (sound.playing) sound.pause();
      else sound.play();
      refresh();
    });
    slider.addEventListener('input', () => sound.setVolume(Number(slider.value) / 100));
    if (b.autoplay) sound.play();
    refresh();
    ctx.onClose(() => sound.stop());
    return box;
  },

  image: (b) => {
    const figure = el('figure', 'block-image');
    const illustration = illustrations[b.illustration];
    if (illustration) {
      const grid = gridOf(illustration);
      const canvas = document.createElement('canvas');
      canvas.width = grid.w;
      canvas.height = grid.h;
      const ctx = canvas.getContext('2d');
      if (ctx) illustration.paint(new PixelPainter(canvasTarget(ctx), 1));
      figure.append(canvas);
    } else {
      console.warn(`Unknown illustration "${b.illustration}" in an image block`);
    }
    if (b.caption) figure.append(el('figcaption', 'block-image-caption', b.caption));
    return figure;
  },
};

export function renderBlock(block: Block, ctx: BlockContext): HTMLElement {
  return (blockRenderers[block.type] as Renderer<Block['type']>)(block, ctx);
}

/** Lets PixelPainter draw onto a plain 2D canvas (used for still pictures in pop-ups). */
function canvasTarget(ctx: CanvasRenderingContext2D): PixelTarget {
  return {
    fillStyle(color: number, alpha = 1) {
      ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      ctx.fillRect(x, y, w, h);
    },
  };
}
