import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contentCollections } from '../src/content/files';
import { collectionFiles, parseContent, type FileContent } from '../src/content/loader';
import { AudioSchema, FlowSchema, HudSchema, MapSchema, PopupsSchema, type MapContent } from '../src/content/schemas';
import { portrait } from '../src/game/art/portrait';
import { recordings } from '../src/game/audio/recordings';
import { PixelPainter, type PixelTarget } from '../src/game/art/pixel';
import { emote, walker } from '../src/game/art/walker';
import { ALEX, seeded } from '../src/game/art/illustrations/common';
import { parseMap } from '../src/game/map/grid';
import { kinds, paintGround } from '../src/game/map/kinds';
import { blockRenderers } from '../src/ui/blocks';

const contentDir = resolve(__dirname, '../public/content');
const read = (path: string) => readFileSync(resolve(contentDir, path), 'utf8');
const flow = parseContent('flow.json', read('flow.json'), FlowSchema);
const popups = parseContent('popups.json', read('popups.json'), PopupsSchema);
const maps = collectionFiles({ flow } as FileContent)
  .filter(([key]) => key === 'maps')
  .map(([, name, file]) => [name, parseContent(file, read(file), contentCollections.maps.schema)] as const);

const fakeTarget = (): PixelTarget & { count: number } => {
  const t = { count: 0, fillStyle: () => undefined, fillRect: () => void t.count++ };
  return t;
};

describe('maps', () => {
  it('flow.json has at least one map', () => {
    expect(maps.length).toBeGreaterThan(0);
  });

  for (const [name, map] of maps) {
    it(`maps/${name}.json: grid, legend, buildings, spawn and hotspots are valid`, () => {
      expect(parseMap(map).errors).toEqual([]);
    });

    it(`maps/${name}.json: every hotspot opens an existing pop-up`, () => {
      for (const spot of map.hotspots) expect(popups.popups, `hotspot "${spot.id}"`).toHaveProperty(spot.popup);
    });
  }

  it('hotspot ids are unique across all maps', () => {
    const ids = maps.flatMap(([, m]) => m.hotspots.map((h) => h.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('catches common grid mistakes', () => {
    const base: MapContent = MapSchema.parse({
      schemaVersion: 1,
      _description: 'test',
      _usedIn: 'test',
      legend: { '.': 'grass', H: 'cottage', '~': 'water' },
      grid: ['.....', '.HHH.', '.HHH.', '.....'],
      spawn: { x: 0, y: 0 },
    });
    expect(parseMap(base).errors).toEqual([]);
    expect(parseMap({ ...base, grid: ['.....', '.HH..', '.HHH.', '.....'] }).errors.join()).toMatch(/3×2 block/);
    expect(parseMap({ ...base, grid: ['....', '.HHH.', '.HHH.', '.....'] }).errors.join()).toMatch(/Row 0/);
    expect(parseMap({ ...base, grid: ['..x..', '.HHH.', '.HHH.', '.....'] }).errors.join()).toMatch(/"x"/);
    expect(parseMap({ ...base, spawn: { x: 2, y: 1 } }).errors.join()).toMatch(/spawn/);
    expect(parseMap({ ...base, legend: { ...base.legend, '.': 'lava' } }).errors.join()).toMatch(/lava/);
  });

  it('every tile kind paints its ground and sprite without errors', () => {
    for (const [name, kind] of Object.entries(kinds)) {
      const t = fakeTarget();
      paintGround(new PixelPainter(t), name, () => 'grass', seeded(1));
      kind.object?.(() => 'grass', { x: 3, y: 5 }).draw(new PixelPainter(t));
      expect(t.count, name).toBeGreaterThan(0);
    }
  });

  it('walking sprites draw every direction, frame and mood, plus mood bubbles', () => {
    for (const mood of ['happy', 'sad', 'angry'] as const) {
      for (const facing of ['down', 'up', 'side'] as const) {
        for (const frame of [0, 1, 2] as const) {
          const t = fakeTarget();
          walker(new PixelPainter(t), ALEX, facing, frame, mood);
          expect(t.count).toBeGreaterThan(12);
        }
      }
    }
    for (const mood of ['sad', 'angry'] as const) {
      const t = fakeTarget();
      emote(new PixelPainter(t), mood);
      expect(t.count).toBeGreaterThan(4);
    }
  });
});

describe('pop-ups', () => {
  it('every flow "popup" names a pop-up in popups.json', () => {
    for (const step of flow.steps) if (step.type === 'map' && step.popup) expect(popups.popups).toHaveProperty(step.popup);
  });

  it('every block type has a renderer', () => {
    for (const popup of Object.values(popups.popups)) {
      for (const block of popup.body) expect(blockRenderers).toHaveProperty(block.type);
    }
  });
});

describe('HUD, bills and sounds', () => {
  const hud = parseContent('hud.json', read('hud.json'), HudSchema);
  const audioFile = parseContent('audio.json', read('audio.json'), AudioSchema);

  it('every HUD widget opens an existing pop-up and has a unique id', () => {
    const ids = new Set(maps.flatMap(([, m]) => m.hotspots.map((h) => h.id)));
    for (const w of hud.widgets) {
      expect(popups.popups, `widget "${w.id}"`).toHaveProperty(w.popup);
      expect(ids.has(w.id), `"${w.id}" is also a hotspot id`).toBe(false);
      ids.add(w.id);
    }
  });

  it('every sound used by pop-ups or the HUD exists in audio.json, and every synth sound is built in', () => {
    for (const popup of Object.values(popups.popups)) {
      for (const b of popup.body) if (b.type === 'audioPlayer') expect(audioFile.sounds).toHaveProperty(b.sound);
    }
    for (const w of hud.widgets) if (w.type === 'noise' && w.ambientSound) expect(audioFile.sounds).toHaveProperty(w.ambientSound);
    for (const [key, s] of Object.entries(audioFile.sounds)) if (s.synth) expect(recordings, `sounds.${key}`).toHaveProperty(s.synth);
  });

  it('the synthesized data center recording is a usable loop', () => {
    const samples = recordings.datacenter(8000);
    expect(samples.length).toBeGreaterThan(8000 * 5);
    let peak = 0;
    for (const v of samples) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it("Alex's portrait draws both states", () => {
    for (const state of ['healthy', 'sickly'] as const) {
      const t = fakeTarget();
      portrait(new PixelPainter(t), ALEX, state);
      expect(t.count).toBeGreaterThan(20);
    }
  });
});
