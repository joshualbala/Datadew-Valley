/**
 * Render `seconds` of sound with `sample(t, i)` and make it loop seamlessly:
 * the extra half second at the end is crossfaded into the start, then the
 * whole thing is normalized so its loudest moment is `peak`.
 */
export function renderLoop(sampleRate: number, seconds: number, sample: (t: number) => number, peak = 0.8): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const fade = Math.floor(sampleRate * 0.5);
  const raw = new Float32Array(n + fade);
  for (let i = 0; i < raw.length; i++) raw[i] = sample(i / sampleRate);
  const out = raw.slice(0, n);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out[i] = raw[n + i] * (1 - k) + raw[i] * k;
  }
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] = (out[i] / (max || 1)) * peak;
  return out;
}
