import { dataCenterHum } from './datacenter';

/**
 * Built-in synthesized sounds, referenced by name from public/content/audio.json
 * → sounds ("synth": "datacenter"). Each returns mono samples at the given rate.
 * To add one: write a generator in this folder and register it here. A real
 * recording can replace any of them with "file": "assets/audio/x.mp3".
 */
export const recordings: Record<string, (sampleRate: number) => Float32Array> = {
  datacenter: (rate) => dataCenterHum(rate),
};
