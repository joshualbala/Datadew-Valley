import { renderLoop } from './loop';

/**
 * A synthesized stand-in for a recording made next to a data center: the
 * rush of many cooling fans (bright, hissy), a buzzing electrical hum with
 * strong upper harmonics, and two piercing high whines, with slow swells as
 * fans speed up. Pitched fairly high: that whine is what neighbors complain about.
 */
export function dataCenterHum(sampleRate: number, seconds = 12): Float32Array {
  let low = 0;
  let band = 0;
  return renderLoop(sampleRate, seconds, (t) => {
    const white = Math.random() * 2 - 1;
    // Fan rush: mostly mid/high noise (only lightly smoothed), swelling slowly.
    low += 0.22 * (white - low);
    band += 0.6 * (white - band);
    const swell = 1 + 0.2 * Math.sin(2 * Math.PI * (t / seconds) * 2) + 0.07 * Math.sin(2 * Math.PI * 0.75 * t);
    const flutter = 1 + 0.1 * Math.sin(2 * Math.PI * 41 * t);
    const fans = (low * 1.4 + (white - band) * 0.25) * swell * flutter;
    // Electrical buzz: 120 Hz with strong upper harmonics.
    const buzz =
      0.1 * Math.sin(2 * Math.PI * 120 * t) +
      0.12 * Math.sin(2 * Math.PI * 240 * t) +
      0.1 * Math.sin(2 * Math.PI * 360 * t) +
      0.08 * Math.sin(2 * Math.PI * 480 * t) +
      0.05 * Math.sin(2 * Math.PI * 720 * t);
    // Two high whines that waver against each other.
    const whine =
      0.07 * Math.sin(2 * Math.PI * 3150 * t + 0.5 * Math.sin(2 * Math.PI * 0.5 * t)) +
      0.04 * Math.sin(2 * Math.PI * 5240 * t + 0.4 * Math.sin(2 * Math.PI * 0.33 * t));
    return fans + buzz + whine;
  });
}
