import { z } from 'zod';

/**
 * Every content file must start with these fields so the team can tell
 * which part of the game it controls. Fields starting with "_" are notes
 * for humans: Zod strips them and the game never displays them.
 */
const fileMeta = {
  schemaVersion: z.literal(1),
  _description: z.string().min(1, 'Add a _description explaining what this file controls'),
  _usedIn: z.string().min(1, 'Add _usedIn saying which page/scene reads this file'),
};

/** Wrap a file's schema so it also requires the shared metadata fields. */
export const contentFile = <T extends z.ZodRawShape>(shape: T) => z.object({ ...fileMeta, ...shape });

export const UiSchema = contentFile({
  start: z.object({
    prompt: z.string().min(1),
    soundNote: z.string().default(''),
  }),
  title: z.object({
    heading: z.string().min(1),
    tagline: z.string().default(''),
    enterButton: z.string().min(1),
    hint: z.string().default(''),
  }),
  sequence: z.object({
    nextHint: z.string().min(1),
    backButton: z.string().min(1),
  }),
  popup: z.object({
    continueButton: z.string().min(1),
  }),
  reset: z.object({
    /** Shown after the first click on the Reset button; a second click resets. */
    confirm: z.string().min(1),
  }),
  map: z.object({
    interactHint: z.string().min(1),
    /** "{read}" and "{total}" are replaced with numbers. */
    progress: z.string().min(1),
  }),
});
export type UiContent = z.infer<typeof UiSchema>;

export const MusicTrackSchema = z
  .object({
    synth: z.string().optional(),
    file: z.string().optional(),
    volume: z.number().min(0).max(1).default(0.5),
  })
  .refine((t) => Boolean(t.synth) !== Boolean(t.file), {
    message: 'Each music track needs exactly one of "synth" or "file"',
  });

/** A sound (e.g. the data center recording): a built-in synthesized one, or an audio file. */
export const SoundSchema = z
  .object({
    synth: z.string().optional(),
    file: z.string().optional(),
    volume: z.number().min(0).max(1).default(0.8),
  })
  .refine((t) => Boolean(t.synth) !== Boolean(t.file), {
    message: 'Each sound needs exactly one of "synth" or "file"',
  });

export const AudioSchema = contentFile({
  music: z.record(z.string(), MusicTrackSchema),
  sounds: z.record(z.string(), SoundSchema).default({}),
  /** Alex coughs at a random moment every [min, max] seconds on the map; [0, 0] turns it off. */
  alexCoughSeconds: z.tuple([z.number().min(0), z.number().min(0)]).default([25, 50]),
  /** Volume (0–1) of small effects: pop-up open/close, footsteps. 0 turns them off. */
  sfxVolume: z.number().min(0).max(1).default(0.5),
});
export type AudioContent = z.infer<typeof AudioSchema>;

/**
 * One step of the game flow (public/content/flow.json). Each "type" has a
 * handler in src/game/flow.ts. To add a step type: add its schema here, add it
 * to FlowStepSchema, then register a handler.
 */
export const SequenceStepSchema = z.object({
  type: z.literal('sequence'),
  /** Name of a file in public/content/sequences/ (without .json). */
  sequence: z.string().min(1),
});

export const CardStepSchema = z.object({
  type: z.literal('card'),
  text: z.string().min(1),
  holdSeconds: z.number().positive().default(2.5),
  stopMusic: z.boolean().default(false),
});

export const MapStepSchema = z.object({
  type: z.literal('map'),
  /** Name of a file in public/content/maps/ (without .json). */
  map: z.string().min(1),
  /** Optional pop-up id (popups.json) shown over the map when it first opens, e.g. the controls. */
  popup: z.string().optional(),
  /** "complete" = move on to the next flow step once everything counting toward completion is read. */
  until: z.enum(['complete']).optional(),
});

export const FlowStepSchema = z.discriminatedUnion('type', [SequenceStepSchema, CardStepSchema, MapStepSchema]);
export type FlowStep = z.infer<typeof FlowStepSchema>;

export const FlowSchema = contentFile({
  steps: z.array(FlowStepSchema).min(1),
});
export type FlowContent = z.infer<typeof FlowSchema>;

export const SlideSchema = z.object({
  /** Built-in picture drawn in code (src/game/art/illustrations/). */
  illustration: z.string().min(1),
  caption: z.string().min(1),
  /** Optional sound (audio.json → sounds) that replaces the music while this slide shows. */
  sound: z.string().optional(),
});

export const SequenceSchema = contentFile({
  /** Optional track name from audio.json → music to play during these slides (otherwise the current music continues). */
  music: z.string().optional(),
  slides: z.array(SlideSchema).min(1),
});
export type SequenceContent = z.infer<typeof SequenceSchema>;

// ------------------------------------------------------------------ pop-ups

/**
 * Pop-up bodies are lists of blocks. To add a block type: add its schema here,
 * add it to BlockSchema, then add a renderer in src/ui/blocks/ and register it.
 */
export const TextBlockSchema = z.object({ type: z.literal('text'), text: z.string().min(1) });
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  /** A built-in picture drawn in code (same names as the slide illustrations). */
  illustration: z.string().min(1),
  caption: z.string().default(''),
});
export const StatBlockSchema = z.object({ type: z.literal('stat'), value: z.string().min(1), label: z.string().min(1) });
export const CitationBlockSchema = z.object({ type: z.literal('citation'), text: z.string().min(1), url: z.string().optional() });
export const BillBlockSchema = z.object({
  type: z.literal('bill'),
  currency: z.string().default('$'),
  beforeLabel: z.string().default('Before'),
  afterLabel: z.string().default('Now'),
  items: z.array(z.object({ label: z.string().min(1), before: z.number(), after: z.number() })).min(1),
  /** Text before the total, e.g. "You now owe". */
  totalLabel: z.string().min(1),
  /** The amount owed; if left out, the sum of every increase. */
  total: z.number().optional(),
  /** Small text under the total, e.g. "per month". */
  note: z.string().default(''),
});
export const AudioPlayerBlockSchema = z.object({
  type: z.literal('audioPlayer'),
  /** A sound name from audio.json → sounds. */
  sound: z.string().min(1),
  label: z.string().default(''),
  /** Start playing as soon as the pop-up opens. */
  autoplay: z.boolean().default(false),
  playLabel: z.string().default('Play'),
  pauseLabel: z.string().default('Pause'),
  volumeLabel: z.string().default('Volume'),
});
export const KeysBlockSchema = z.object({
  type: z.literal('keys'),
  rows: z.array(z.object({ keys: z.array(z.string().min(1)).min(1), label: z.string().min(1) })).min(1),
});

export const BlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  ImageBlockSchema,
  StatBlockSchema,
  CitationBlockSchema,
  KeysBlockSchema,
  BillBlockSchema,
  AudioPlayerBlockSchema,
]);
export type Block = z.infer<typeof BlockSchema>;

export const PopupSchema = z.object({
  title: z.string().min(1),
  body: z.array(BlockSchema).min(1),
  /** Button label; defaults to ui.json → popup.continueButton. */
  button: z.string().optional(),
});
export type Popup = z.infer<typeof PopupSchema>;

export const PopupsSchema = contentFile({
  popups: z.record(z.string(), PopupSchema),
});
export type PopupsContent = z.infer<typeof PopupsSchema>;

// ------------------------------------------------------------------ maps

export const HotspotSchema = z.object({
  /** Unique across all maps; used to remember which "!" were read. */
  id: z.string().min(1),
  /** Pop-up id in popups.json. */
  popup: z.string().min(1),
  /** Tile column / row (0 = left / top) the "!" stands on. */
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  /** Counts toward "x / N read" and the ending. Default true. */
  countsTowardCompletion: z.boolean().default(true),
  /** What floats above it: "!" (default) or "-$" (money owed). */
  indicator: z.enum(['!', '-$']).default('!'),
  /**
   * Optional tile kind (e.g. "water") that makes every tile of that kind part
   * of the hotspot: it glows in `highlightColor` when Alex is near any of them.
   */
  area: z.string().optional(),
  highlightColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#fff2a8'),
});
export type Hotspot = z.infer<typeof HotspotSchema>;

/**
 * A person who starts at (x, y). Neighbors live in the nearest house and run
 * errands around town; workers move between stations (consoles, racks).
 */
export const NpcSchema = z.object({
  /** "neighbor" (TOWNSFOLK looks, coughs as Alex passes) or "worker" (lab coats; WORKERS looks). */
  role: z.enum(['neighbor', 'worker']).default('neighbor'),
  /** Which built-in look (neighbors 0–9, workers 0–3; see src/game/art/illustrations/common.ts). */
  look: z.number().int().min(0),
  /** "sad" (frown, rain cloud now and then), "angry" (tight mouth, hard brows) or "neutral" (flat mouth). */
  mood: z.enum(['sad', 'angry', 'neutral']),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});
export type Npc = z.infer<typeof NpcSchema>;

export const MapSchema = contentFile({
  /** Character → built-in tile kind (see src/game/map/kinds.ts). */
  legend: z.record(z.string().length(1), z.string().min(1)),
  /** One string per row; every row the same length. */
  grid: z.array(z.string().min(1)).min(1),
  spawn: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
  hotspots: z.array(HotspotSchema).default([]),
  /** People walking around this map. */
  npcs: z.array(NpcSchema).default([]),
  /** Doors to other maps: press E next to (x, y) to go to map `to`, arriving at `spawn`. */
  doors: z
    .array(
      z.object({
        x: z.number().int().min(0),
        y: z.number().int().min(0),
        /** Name of a file in public/content/maps/ (without .json). */
        to: z.string().min(1),
        spawn: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
        /** Hint shown when Alex is close, e.g. "Press E to enter". */
        hint: z.string().min(1),
      }),
    )
    .default([]),
  /**
   * Fix the noise meter and background hum on this map instead of using distance,
   * e.g. inside the data center: { "level": 1, "volume": 1.4 } (level 0–1; volume
   * like hud.json's ambientVolume, can go above 1 for really loud).
   */
  noise: z.object({ level: z.number().min(0).max(1), volume: z.number().min(0).max(2) }).optional(),
  /** Music track (audio.json → music) for this map; leave out for no music (e.g. inside the data center). */
  music: z.string().optional(),
  /** Atmosphere effects, applied in order (see src/game/effects/). */
  effects: z.array(z.object({ type: z.string().min(1) }).passthrough()).default([]),
  /** Grass dries out and thins near this tile kind (e.g. the data center), up to `radius` tiles away. */
  dryness: z.object({ source: z.string().min(1), radius: z.number().positive() }).optional(),
});
export type MapContent = z.infer<typeof MapSchema>;
export type MapEffect = MapContent['effects'][number];

// ------------------------------------------------------------------ HUD

export const PortraitWidgetSchema = z.object({
  type: z.literal('portrait'),
  /** Remembers whether it was read; counts toward completion like a "!". */
  id: z.string().min(1),
  popup: z.string().min(1),
  /** Name shown under the portrait. */
  name: z.string().min(1),
  /** Which built-in portrait to draw: "healthy" or "sickly". */
  state: z.enum(['healthy', 'sickly']).default('sickly'),
  countsTowardCompletion: z.boolean().default(true),
});
export const NoiseWidgetSchema = z.object({
  type: z.literal('noise'),
  id: z.string().min(1),
  popup: z.string().min(1),
  /** The volume bars rise as Alex gets closer to this tile kind (or any of these kinds). */
  source: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  /** Distance in tiles where the bars reach zero. */
  range: z.number().positive(),
  /** Sound (audio.json → sounds) that hums in the background, louder near the source. Optional. */
  ambientSound: z.string().optional(),
  /** Loudest the background hum gets (0–1), right next to the source. */
  ambientVolume: z.number().min(0).max(1).default(0.35),
  /** Quietest it gets (0–1), anywhere on the map, so the hum is always faintly there. */
  ambientMinVolume: z.number().min(0).max(1).default(0.05),
  /** Tiles over which the hum fades from loudest to quietest (usually bigger than `range`). */
  ambientRange: z.number().positive().default(45),
  /** How much the music dips right next to the source (0 = not at all, 1 = silent). */
  musicDip: z.number().min(0).max(1).default(0.55),
  countsTowardCompletion: z.boolean().default(true),
});
export const HudWidgetSchema = z.discriminatedUnion('type', [PortraitWidgetSchema, NoiseWidgetSchema]);
export type HudWidget = z.infer<typeof HudWidgetSchema>;

export const HudSchema = contentFile({
  widgets: z.array(HudWidgetSchema),
});
export type HudContent = z.infer<typeof HudSchema>;

// ------------------------------------------------------------------ website

/**
 * A page is a list of sections. To add a section type: add its schema here,
 * add it to SectionSchema, then add a renderer in src/site/sections.ts.
 */
export const SectionSchema = z.discriminatedUnion('type', [
  /** The game itself (the Simulation page). */
  z.object({ type: z.literal('game') }),
  z.object({ type: z.literal('text'), heading: z.string().default(''), text: z.string().min(1) }),
  /** The people in about.json. */
  z.object({ type: z.literal('people'), heading: z.string().default('') }),
  /** The entries in bibliography.json (or `emptyMessage` when there are none). */
  z.object({ type: z.literal('bibliography'), heading: z.string().default(''), emptyMessage: z.string().min(1) }),
]);
export type Section = z.infer<typeof SectionSchema>;

export const SiteSchema = contentFile({
  title: z.string().min(1),
  /** Links in the header, in order; `route` is a key of `pages`. */
  nav: z.array(z.object({ label: z.string().min(1), route: z.string().min(1) })).min(1),
  /** The page shown when the address has no route (#/). */
  home: z.string().min(1),
  pages: z.record(z.string(), z.object({ title: z.string().min(1), sections: z.array(SectionSchema).min(1) })),
  /** Shown instead of the site on phones and small windows. */
  smallScreen: z.object({ title: z.string().min(1), text: z.string().min(1) }),
});
export type SiteContent = z.infer<typeof SiteSchema>;

export const AboutSchema = contentFile({
  people: z.array(
    z.object({
      name: z.string().min(1),
      role: z.string().default(''),
      /** Path to a photo inside public/ (e.g. "assets/team/jane.jpg"); leave "" for a pixel avatar. */
      image: z.string().default(''),
      description: z.string().default(''),
    }),
  ),
});
export type AboutContent = z.infer<typeof AboutSchema>;

export const BibliographySchema = contentFile({
  entries: z.array(
    z.object({
      citation: z.string().min(1),
      annotation: z.string().default(''),
      url: z.string().optional(),
    }),
  ),
});
export type BibliographyContent = z.infer<typeof BibliographySchema>;
