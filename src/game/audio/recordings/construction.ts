import { renderLoop } from './loop';

/** A short metallic "clank": a few inharmonic partials that ring and die away. */
function clank(dt: number): number {
  if (dt < 0 || dt > 0.25) return 0;
  const env = Math.exp(-dt * 28);
  return env * (0.5 * Math.sin(2 * Math.PI * 1870 * dt) + 0.35 * Math.sin(2 * Math.PI * 2930 * dt) + 0.25 * Math.sin(2 * Math.PI * 4410 * dt));
}

/**
 * A synthesized construction site for the intro: a diesel engine rumbling
 * and revving, a reversing truck's beeper, hammer clanks and a burst of
 * jackhammer, over distant traffic noise. Loops every 10 seconds.
 */
export function constructionSite(sampleRate: number, seconds = 10): Float32Array {
  const hammers = [0.6, 1.1, 1.6, 4.9, 5.35, 5.8, 8.3, 8.75];
  let rumble = 0;
  let traffic = 0;
  let phase = 0;
  return renderLoop(sampleRate, seconds, (t) => {
    const white = Math.random() * 2 - 1;
    // Diesel engine: a buzzy low tone whose speed rises and falls (revving), smoothed.
    const rpm = 38 + 10 * Math.sin(2 * Math.PI * (t / seconds) * 2) + 6 * Math.max(0, Math.sin(2 * Math.PI * 0.4 * t));
    phase += rpm / sampleRate;
    const saw = 2 * (phase % 1) - 1;
    rumble += 0.08 * (saw * 0.8 + white * 0.3 - rumble);
    const engine = rumble * 1.6;
    // Reversing beeper (on for 3 seconds of every 10).
    const beeping = t > 2 && t < 5 && (t * 2) % 1 < 0.5;
    const beep = beeping ? 0.16 * Math.sin(2 * Math.PI * 1100 * t) : 0;
    // Hammer clanks.
    let hits = 0;
    for (const h of hammers) hits += clank(t - h);
    // Jackhammer: rapid bursts of grit.
    const jack = t > 6.4 && t < 7.8 && (t * 22) % 1 < 0.45 ? white * 0.35 : 0;
    // Distant traffic / wind bed.
    traffic += 0.02 * (white - traffic);
    return engine + beep + hits * 0.4 + jack + traffic * 2.5;
  });
}
