import Phaser from 'phaser';
import type { MapEffect } from '../../content/schemas';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

/** What an effect needs to know about the map it is applied to. */
export interface EffectContext {
  /** World size in screen pixels. */
  worldW: number;
  worldH: number;
  tilePx: number;
  /** Centers (screen px) of every tile/building of a kind, e.g. the data center. */
  centersOf(kind: string): { x: number; y: number }[];
}

/** A running effect; `update` gets Alex's feet position every frame. */
export interface RunningEffect {
  update?(px: number, py: number): void;
}

type EffectFactory = (scene: Phaser.Scene, cfg: Record<string, unknown>, ctx: EffectContext) => RunningEffect;

const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const color = (v: unknown, fallback: number) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? Number.parseInt(v.slice(1), 16) : fallback);

/** Soft round blob texture (alpha falls off from the middle), used for smog and cloud shadows. */
function softBlob(scene: Phaser.Scene, key: string, size: number): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}

/**
 * Atmosphere effects a map can list in its "effects" (public/content/maps/*.json).
 * To add one: write a factory here and register it; then enable it per map in JSON.
 */
export const effects: Record<string, EffectFactory> = {
  /** Mutes all colors: { "type": "desaturate", "amount": 0–1 }. WebGL only. */
  desaturate(scene, cfg) {
    const fx = scene.cameras.main.postFX?.addColorMatrix();
    fx?.saturate(-num(cfg.amount, 0.3));
    return {};
  },

  /**
   * Smog around a source (e.g. the data center): a haze that is thickest at
   * the source and fades over `radius` tiles, puffs drifting through it, and a
   * screen tint that grows as Alex gets close.
   * { "type": "smog", "source": "data-center", "radius": 14, "maxAlpha": 0.5, "color": "#8a8070" }
   */
  smog(scene, cfg, ctx) {
    const sources = ctx.centersOf(str(cfg.source, 'data-center'));
    const radius = num(cfg.radius, 14) * ctx.tilePx;
    const maxAlpha = num(cfg.maxAlpha, 0.5);
    const tint = color(cfg.color, 0x8a8070);
    const blob = softBlob(scene, 'fx-blob', 128);
    for (const s of sources) {
      scene.add.image(s.x, s.y, blob).setDisplaySize(radius * 2.2, radius * 2.2).setTint(tint).setAlpha(maxAlpha).setDepth(60000);
      for (let i = 0; i < 9; i++) {
        const puff = scene.add
          .image(s.x + Phaser.Math.Between(-radius / 2, radius / 2), s.y + Phaser.Math.Between(-radius / 2, radius / 2), blob)
          .setDisplaySize(radius * 0.7, radius * 0.5)
          .setTint(tint)
          .setAlpha(maxAlpha * 0.6)
          .setDepth(60001);
        scene.tweens.add({
          targets: puff,
          x: puff.x + Phaser.Math.Between(radius * 0.2, radius * 0.5),
          y: puff.y - Phaser.Math.Between(10, radius * 0.2),
          alpha: { from: maxAlpha * 0.6, to: maxAlpha * 0.15 },
          duration: Phaser.Math.Between(9000, 16000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
    }
    // Screen-wide haze that thickens as Alex walks toward the source.
    const veil = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, tint).setOrigin(0).setScrollFactor(0).setDepth(90000).setAlpha(0);
    return {
      update(px, py) {
        let closest = Infinity;
        for (const s of sources) closest = Math.min(closest, Phaser.Math.Distance.Between(px, py, s.x, s.y));
        const near = Phaser.Math.Clamp(1 - closest / (radius * 1.6), 0, 1);
        veil.setAlpha(near * maxAlpha * 0.55);
      },
    };
  },

  /** Overcast sky: soft cloud shadows drifting across the map. { "type": "overcast", "clouds": 7, "alpha": 0.18 } */
  overcast(scene, cfg, ctx) {
    const blob = softBlob(scene, 'fx-blob', 128);
    const count = num(cfg.clouds, 7);
    const alpha = num(cfg.alpha, 0.18);
    for (let i = 0; i < count; i++) {
      const w = Phaser.Math.Between(ctx.tilePx * 8, ctx.tilePx * 16);
      const cloud = scene.add
        .image(Phaser.Math.Between(0, ctx.worldW), Phaser.Math.Between(0, ctx.worldH), blob)
        .setDisplaySize(w, w * 0.6)
        .setTint(0x2a3140)
        .setAlpha(alpha)
        .setDepth(70000);
      const cross = () => {
        scene.tweens.add({
          targets: cloud,
          x: ctx.worldW + w,
          duration: ((ctx.worldW + w - cloud.x) / ctx.worldW) * Phaser.Math.Between(70000, 110000),
          onComplete: () => {
            cloud.setPosition(-w, Phaser.Math.Between(0, ctx.worldH));
            cross();
          },
        });
      };
      cross();
    }
    return {};
  },
};

/** Start every effect a map lists; unknown types are skipped with a warning. */
export function startEffects(scene: Phaser.Scene, list: MapEffect[], ctx: EffectContext): RunningEffect[] {
  return list.flatMap((cfg) => {
    const make = effects[cfg.type];
    if (!make) {
      console.warn(`Unknown map effect "${cfg.type}" (known: ${Object.keys(effects).join(', ')})`);
      return [];
    }
    return [make(scene, cfg as Record<string, unknown>, ctx)];
  });
}
