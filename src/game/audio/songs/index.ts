import { meadow } from './meadow';
import { picnic } from './picnic';
import type { Song } from './types';

/**
 * Built-in synth songs, referenced by name from public/content/audio.json ("synth": "meadow").
 * To add one: create songs/<name>.ts exporting a Song, then add it here.
 */
export const songs: Record<string, Song> = { picnic, meadow };
