import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentCollections, contentFiles } from '../src/content/files';
import { ContentError, collectionFiles, parseContent, type FileContent } from '../src/content/loader';
import { UiSchema } from '../src/content/schemas';

const contentDir = resolve(__dirname, '../public/content');

describe('content files', () => {
  for (const [key, { path, schema }] of Object.entries(contentFiles)) {
    it(`${path} (${key}) is valid and self-describing`, () => {
      const text = readFileSync(resolve(contentDir, path), 'utf8');
      expect(() => parseContent(path, text, schema)).not.toThrow();
    });
  }
});

/** Parse every registered file from disk (same as the browser does at startup). */
function readFiles(): FileContent {
  return Object.fromEntries(
    Object.entries(contentFiles).map(([key, { path, schema }]) => [
      key,
      parseContent(path, readFileSync(resolve(contentDir, path), 'utf8'), schema),
    ]),
  ) as FileContent;
}

describe('content collections', () => {
  for (const [key, name, path] of collectionFiles(readFiles())) {
    it(`${path} (referenced as ${key} "${name}") exists, is valid and self-describing`, () => {
      const full = resolve(contentDir, path);
      expect(existsSync(full), `public/content/${path} is missing`).toBe(true);
      expect(() => parseContent(path, readFileSync(full, 'utf8'), contentCollections[key].schema)).not.toThrow();
    });
  }
});

describe('content loader errors', () => {
  it('reports broken JSON clearly', () => {
    expect(() => parseContent('ui.json', '{ "title": ', UiSchema)).toThrow(ContentError);
    expect(() => parseContent('ui.json', '{ "title": ', UiSchema)).toThrow(/not valid JSON/);
  });

  it('requires _description and _usedIn', () => {
    const noMeta = JSON.stringify({
      schemaVersion: 1,
      title: { heading: 'x', enterButton: 'Enter' },
    });
    expect(() => parseContent('ui.json', noMeta, UiSchema)).toThrow(/_description/);
  });
});
