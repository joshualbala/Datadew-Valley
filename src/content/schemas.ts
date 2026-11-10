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
export const contentFile = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ ...fileMeta, ...shape });

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

export const AudioSchema = contentFile({
  music: z.record(z.string(), MusicTrackSchema),
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

export const FlowStepSchema = z.discriminatedUnion('type', [SequenceStepSchema, CardStepSchema]);
export type FlowStep = z.infer<typeof FlowStepSchema>;

export const FlowSchema = contentFile({
  steps: z.array(FlowStepSchema).min(1),
});
export type FlowContent = z.infer<typeof FlowSchema>;

export const SlideSchema = z.object({
  /** Built-in picture drawn in code (src/game/art/illustrations/). */
  illustration: z.string().min(1),
  caption: z.string().min(1),
});

export const SequenceSchema = contentFile({
  /** Optional track name from audio.json → music to play during these slides (otherwise the current music continues). */
  music: z.string().optional(),
  slides: z.array(SlideSchema).min(1),
});
export type SequenceContent = z.infer<typeof SequenceSchema>;
