import { dataCenter } from '../buildings';
import { IW, rand, type Illustration } from './common';

const WALL = 0x23263a;
const WALL_DARK = 0x1b1e2e;
const WIN_X = 250;
const WIN_Y = 22;
const WIN_W = 150;
const WIN_H = 92;

/** A dark room at night: a laptop glows with an AI chat, while through the window a data center hums on the horizon. */
export const screenGlow: Illustration = {
  paint(p) {
    p.rect(0, 0, IW, 180, WALL);
    for (let x = 0; x < IW; x += 24) p.rect(x, 0, 1, 130, WALL_DARK); // wallpaper stripes
    // Window with a night valley and a far-off data center.
    p.rect(WIN_X - 4, WIN_Y - 4, WIN_W + 8, WIN_H + 8, 0x3a2f2a);
    p.rect(WIN_X, WIN_Y, WIN_W, WIN_H, 0x141a33);
    p.rect(WIN_X, WIN_Y + 60, WIN_W, 32, 0x1f2a24);
    // The data center on the horizon, framed by the window.
    dataCenter(p.at(WIN_X + 8, WIN_Y + 20), 0, 66);
    p.rect(WIN_X, WIN_Y, WIN_W, WIN_H, 0x141a33, 0.35);
    p.rect(WIN_X + WIN_W / 2 - 1, WIN_Y, 2, WIN_H, 0x3a2f2a).rect(WIN_X, WIN_Y + WIN_H / 2 - 1, WIN_W, 2, 0x3a2f2a);
    // Desk.
    p.rect(0, 128, IW, 6, 0x6b4a32).rect(0, 128, IW, 1, 0x8a6544).rect(0, 134, IW, 46, 0x3a2a20);
    // Laptop: open, screen glowing.
    const lx = 70;
    p.rect(lx - 6, 120, 132, 8, 0x8a8f99).rect(lx - 6, 120, 132, 1, 0xb5bcc5); // keyboard base
    p.rect(lx, 40, 120, 80, 0x2a2e33).rect(lx + 4, 44, 112, 72, 0xeef3ff);
    // Chat bubbles (lines, no words).
    p.rect(lx + 10, 52, 60, 10, 0xd6e4ff).rect(lx + 14, 56, 46, 2, 0x8aa0c8);
    p.rect(lx + 46, 68, 62, 18, 0xc8f0d4)
      .rect(lx + 50, 72, 50, 2, 0x6aa67a)
      .rect(lx + 50, 77, 40, 2, 0x6aa67a)
      .rect(lx + 50, 82, 30, 2, 0x6aa67a);
    p.rect(lx + 10, 92, 50, 10, 0xd6e4ff).rect(lx + 14, 96, 34, 2, 0x8aa0c8);
    p.rect(lx + 4, 106, 112, 10, 0xffffff).rect(lx + 8, 109, 80, 4, 0xe6e9f0);
    // Screen light spilling onto the desk and wall.
    p.rect(lx - 30, 128, 180, 6, 0xeef3ff, 0.12).rect(lx - 10, 20, 140, 100, 0xeef3ff, 0.05);
    // A mug.
    p.rect(220, 112, 12, 16, 0xc0473a).rect(232, 116, 3, 7, 0xc0473a).rect(220, 112, 12, 2, 0x963328);
  },

  animate(stage) {
    // Typing indicator and blinking cursor in the chat box.
    const lx = 70;
    const cursor = stage.sprite('illu-cursor', 1, 4, (p) => p.rect(0, 0, 1, 4, 0x3a3f46), lx + 90, 109);
    stage.every(500, () => cursor.setVisible(!cursor.visible));
    const dots = [0, 1, 2].map((i) => stage.sprite('illu-typing', 3, 3, (p) => p.rect(0, 0, 3, 3, 0x6aa67a), lx + 52 + i * 6, 89));
    let step = 0;
    stage.every(300, () => {
      step = (step + 1) % 4;
      dots.forEach((d, i) => d.setAlpha(i < step ? 1 : 0.25));
    });
    // The data center's lights blink far away in the window.
    for (let i = 0; i < 8; i++) {
      const led = stage.sprite('illu-far-led', 1, 1, (p) => p.px(0, 0, 0x9dff9a), WIN_X + 86 + i * 4, WIN_Y + 20 + 52);
      stage.every(rand(300, 900), () => led.setAlpha(led.alpha > 0.5 ? 0.2 : 1));
    }
  },
};
