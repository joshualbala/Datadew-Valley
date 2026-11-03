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
