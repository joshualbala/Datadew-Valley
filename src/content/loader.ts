import { z } from 'zod';
import { contentFiles, type ContentKey } from './files';

export type Content = {
  [K in ContentKey]: z.infer<(typeof contentFiles)[K]['schema']>;
};

/** Thrown when a content file is missing, isn't valid JSON, or fails its schema. */
export class ContentError extends Error {
  constructor(
    public file: string,
    message: string,
  ) {
    super(`public/content/${file}\n\n${message}`);
    this.name = 'ContentError';
  }
}

/** Parse + validate the text of one content file. Shared by the browser loader and the tests. */
export function parseContent<S extends z.ZodType>(file: string, text: string, schema: S): z.infer<S> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new ContentError(file, `This file is not valid JSON (check for missing commas or quotes).\n${(err as Error).message}`);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ContentError(file, `Some fields are missing or have the wrong type:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

async function loadOne<S extends z.ZodType>(file: string, schema: S): Promise<z.infer<S>> {
  const url = `${import.meta.env.BASE_URL}content/${file}`;
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new ContentError(file, `Could not load the file (HTTP ${res.status}).`);
  return parseContent(file, await res.text(), schema);
}

/** Load and validate every file listed in contentFiles. */
export async function loadContent(): Promise<Content> {
  const entries = await Promise.all(
    (Object.keys(contentFiles) as ContentKey[]).map(
      async (key) => [key, await loadOne(contentFiles[key].path, contentFiles[key].schema)] as const,
    ),
  );
  return Object.fromEntries(entries) as Content;
}
