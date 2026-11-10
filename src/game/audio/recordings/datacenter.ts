/**
 * A synthesized stand-in for a recording made next to a data center: the
 * broadband rush of cooling fans, the 60/120 Hz electrical hum of
 * transformers, a faint high whine, and slow swells as fans speed up.
 * Returns mono samples that loop seamlessly.
 */
export function dataCenterHum(sampleRate: number, seconds = 12): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const fade = Math.floor(sampleRate * 0.5); // crossfade so the loop has no click
  const raw = new Float32Array(n + fade);
  let low1 = 0;
  let low2 = 0;
  let band = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / sampleRate;
    const white = Math.random() * 2 - 1;
    // Fan rush: noise through two gentle low-pass stages, plus a brighter airy layer.
    low1 += 0.06 * (white - low1);
    low2 += 0.06 * (low1 - low2);
    band += 0.35 * (white - band);
    const swell = 1 + 0.18 * Math.sin(2 * Math.PI * (t / seconds) * 2) + 0.06 * Math.sin(2 * Math.PI * 0.75 * t);
    const fans = (low2 * 3.2 + (white - band) * 0.05) * swell;
    // Blade thump: a slight flutter in the fan noise.
    const flutter = 1 + 0.08 * Math.sin(2 * Math.PI * 29 * t);
    // Electrical hum and its harmonics.
    const hum = 0.2 * Math.sin(2 * Math.PI * 60 * t) + 0.14 * Math.sin(2 * Math.PI * 120 * t) + 0.05 * Math.sin(2 * Math.PI * 180 * t) + 0.03 * Math.sin(2 * Math.PI * 240 * t);
    // A faint high whine that wavers.
    const whine = 0.012 * Math.sin(2 * Math.PI * 3150 * t + 0.4 * Math.sin(2 * Math.PI * 0.5 * t));
    raw[i] = fans * flutter + hum + whine;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = raw[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] = raw[n + i] * (1 - k) + raw[i] * k;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.8;
  return out;
}
