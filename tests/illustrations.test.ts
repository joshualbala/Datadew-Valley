import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentCollections, contentFiles } from '../src/content/files';
import { collectionFiles, parseContent, type FileContent } from '../src/content/loader';
import { illustrations } from '../src/game/art/illustrations';
import { PixelPainter, type PixelTarget } from '../src/game/art/pixel';

const contentDir = resolve(__dirname, '../public/content');
const read = (path: string) => readFileSync(resolve(contentDir, path), 'utf8');

describe('intro slide illustrations', () => {
  it('every slide names a built-in illustration', () => {
    const { path, schema } = contentFiles.flow;
    const files = { flow: parseContent(path, read(path), schema) } as FileContent;
    for (const [key, name, file] of collectionFiles(files)) {
      if (key !== 'sequences') continue;
      const sequence = parseContent(file, read(file), contentCollections.sequences.schema);
      sequence.slides.forEach((slide, i) => {
        expect(illustrations, `${file} slide ${i + 1}: unknown illustration "${slide.illustration}" (sequence "${name}")`).toHaveProperty(
          slide.illustration,
        );
      });
    }
  });

  it('every slideshow "music" names a track in audio.json', () => {
    const { path, schema } = contentFiles.flow;
    const files = { flow: parseContent(path, read(path), schema) } as FileContent;
    const audio = parseContent('audio.json', read('audio.json'), contentFiles.audio.schema);
    for (const [key, , file] of collectionFiles(files)) {
      if (key !== 'sequences') continue;
      const { music } = parseContent(file, read(file), contentCollections.sequences.schema);
      if (music) expect(audio.music, `${file}: "music": "${music}"`).toHaveProperty(music);
    }
  });

  for (const [name, illustration] of Object.entries(illustrations)) {
    it(`"${name}" paints without errors`, () => {
      let rects = 0;
      const target: PixelTarget = { fillStyle: () => undefined, fillRect: () => rects++ };
      illustration.paint(new PixelPainter(target));
      expect(rects).toBeGreaterThan(100);
    });
  }
});
