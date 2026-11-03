import { AudioSchema, UiSchema } from './schemas';

/**
 * Registry of every content JSON file the game loads.
 * To add a new content file: create it in public/content/, add a schema in
 * schemas.ts, and add one line here. The loader and the tests pick it up
 * automatically.
 */
export const contentFiles = {
  ui: { path: 'ui.json', schema: UiSchema },
  audio: { path: 'audio.json', schema: AudioSchema },
} as const;

export type ContentKey = keyof typeof contentFiles;
