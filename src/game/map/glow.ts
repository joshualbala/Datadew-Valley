import Phaser from 'phaser';

/**
 * A soft round glow (radial gradient), drawn with additive blending so the
 * spot looks lit. Used under unread "!" markers and doors so players can see
 * at a glance where they can do something.
 */
export function addGlow(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, depth: number): Phaser.GameObjects.Image {
  const key = `soft-glow-${color.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const size = 128;
    const tex = scene.textures.createCanvas(key, size, size)!;
    const ctx = tex.getContext();
    const c = Phaser.Display.Color.IntegerToColor(color);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${c.red},${c.green},${c.blue},0.9)`);
    g.addColorStop(0.45, `rgba(${c.red},${c.green},${c.blue},0.4)`);
    g.addColorStop(1, `rgba(${c.red},${c.green},${c.blue},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
  const img = scene.add
    .image(x, y, key)
    .setDisplaySize(radius * 2, radius * 1.3)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth)
    .setAlpha(0.55);
  // Gentle "breathing" so it catches the eye.
  scene.tweens.add({ targets: img, alpha: 0.25, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  return img;
}
