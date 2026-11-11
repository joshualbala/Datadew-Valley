import {
  AboutSchema,
  AudioSchema,
  BibliographySchema,
  FlowSchema,
  HudSchema,
  MapSchema,
  PopupsSchema,
  SequenceSchema,
  SiteSchema,
  UiSchema,
  type FlowContent,
} from './schemas';

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
  popups: { path: 'popups.json', schema: PopupsSchema },
  hud: { path: 'hud.json', schema: HudSchema },
  site: { path: 'site.json', schema: SiteSchema },
  about: { path: 'about.json', schema: AboutSchema },
  bibliography: { path: 'bibliography.json', schema: BibliographySchema },
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
    names: (files: { flow: FlowContent }) => files.flow.steps.flatMap((step) => (step.type === 'sequence' ? [step.sequence] : [])),
  },
  maps: {
    dir: 'maps',
    schema: MapSchema,
    names: (files: { flow: FlowContent }) => files.flow.steps.flatMap((step) => (step.type === 'map' ? [step.map] : [])),
    /** Maps reached through a door are loaded too. */
    refs: (map: { doors: { to: string }[] }) => map.doors.map((d) => d.to),
  },
} as const;

export type CollectionKey = keyof typeof contentCollections;
