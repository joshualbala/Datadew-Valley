import { AudioSchema, FlowSchema, SequenceSchema, UiSchema, type FlowContent } from './schemas';

/**
 * Registry of every content JSON file the game loads.
 * To add a new content file: create it in public/content/, add a schema in
 * schemas.ts, and add one line here. The loader and the tests pick it up
 * automatically.
 */
export const contentFiles = {
  ui: { path: 'ui.json', schema: UiSchema },
  audio: { path: 'audio.json', schema: AudioSchema },
  flow: { path: 'flow.json', schema: FlowSchema },
} as const;

export type ContentKey = keyof typeof contentFiles;

/**
 * Folders of same-shaped files (e.g. one file per slideshow). A static site
 * can't list a folder, so each collection says which files to load by reading
 * the names other content refers to (e.g. flow.json's "sequence" steps).
 * Loaded after contentFiles, as `getContent().<key>[name]`.
 */
export const contentCollections = {
  sequences: {
    dir: 'sequences',
    schema: SequenceSchema,
    names: (files: { flow: FlowContent }) =>
      files.flow.steps.flatMap((step) => (step.type === 'sequence' ? [step.sequence] : [])),
  },
} as const;

export type CollectionKey = keyof typeof contentCollections;
