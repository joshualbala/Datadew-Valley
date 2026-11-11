import type { MapContent } from '../../content/schemas';
import { TOWNSFOLK, WORKERS } from '../art/illustrations/common';
import { kinds, type Neighbors } from './kinds';

export interface Block {
  kind: string;
  /** Top-left tile and size in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParsedMap {
  /** Size in tiles. */
  w: number;
  h: number;
  kindAt(x: number, y: number): string;
  neighborsOf(x: number, y: number): Neighbors;
  walkable(x: number, y: number): boolean;
  /** Every tile or building that has a sprite (buildings once, at their block). */
  objects: Block[];
  /** Every tile of a kind, e.g. all the river's water tiles. */
  tilesOf(kind: string): { x: number; y: number }[];
  /** Center (in tiles) of every tile or building of a kind, e.g. the data center. */
  centersOf(kind: string): { x: number; y: number }[];
  /** Readable problems with the map file; empty when it is fine. */
  errors: string[];
}

/** Turn a map file's letter grid into tiles and buildings, and check it for mistakes. */
export function parseMap(map: MapContent): ParsedMap {
  const errors: string[] = [];
  const h = map.grid.length;
  const w = Math.max(...map.grid.map((r) => r.length));

  map.grid.forEach((row, y) => {
    if (row.length !== w) errors.push(`Row ${y} has ${row.length} characters; every row needs ${w}.`);
  });
  for (const [char, kind] of Object.entries(map.legend)) {
    if (!kinds[kind]) errors.push(`Legend "${char}" → "${kind}" is not a known tile kind (${Object.keys(kinds).join(', ')}).`);
  }

  const kindAt = (x: number, y: number): string => {
    if (x < 0 || y < 0 || x >= w || y >= h) return '';
    return map.legend[map.grid[y][x] ?? ''] ?? '';
  };

  const unknown = new Set<string>();
  map.grid.forEach((row) => [...row].forEach((c) => !(c in map.legend) && unknown.add(c)));
  for (const c of unknown) errors.push(`The letter "${c}" is used in the grid but missing from the legend.`);

  // Buildings: each must fill an exact w×h block of its letter.
  const objects: Block[] = [];
  const taken = new Set<string>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const kind = kindAt(x, y);
      const def = kinds[kind];
      if (!def?.object || taken.has(`${x},${y}`)) continue;
      const [bw, bh] = def.size ?? [1, 1];
      let ok = true;
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          if (kindAt(x + dx, y + dy) !== kind || taken.has(`${x + dx},${y + dy}`)) ok = false;
          taken.add(`${x + dx},${y + dy}`);
        }
      }
      if (!ok) errors.push(`"${kind}" at column ${x}, row ${y} must fill a ${bw}×${bh} block of the same letter.`);
      objects.push({ kind, x, y, w: bw, h: bh });
    }
  }

  const walkable = (x: number, y: number) => Boolean(kinds[kindAt(x, y)]?.walkable);

  const reachable = (x: number, y: number) =>
    walkable(x, y) || walkable(x - 1, y) || walkable(x + 1, y) || walkable(x, y - 1) || walkable(x, y + 1);
  const usedKinds = new Set(Object.values(map.legend));
  const ids = new Set<string>();
  for (const spot of map.hotspots) {
    if (ids.has(spot.id)) errors.push(`Hotspot id "${spot.id}" is used twice.`);
    ids.add(spot.id);
    if (!reachable(spot.x, spot.y)) {
      errors.push(`Hotspot "${spot.id}" (column ${spot.x}, row ${spot.y}) must be on, or right next to, a walkable tile.`);
    }
    if (spot.area && !usedKinds.has(spot.area))
      errors.push(`Hotspot "${spot.id}" has area "${spot.area}", but no tile of that kind is in the legend.`);
  }
  for (const source of [map.dryness?.source].filter(Boolean) as string[]) {
    if (!usedKinds.has(source)) errors.push(`dryness.source "${source}" is not a tile kind in the legend.`);
  }
  map.npcs.forEach((npc, i) => {
    if (!walkable(npc.x, npc.y)) errors.push(`Person ${i + 1} (column ${npc.x}, row ${npc.y}) must start on a walkable tile.`);
    const looks = npc.role === 'worker' ? WORKERS : TOWNSFOLK;
    if (npc.look >= looks.length)
      errors.push(`Person ${i + 1} (${npc.role}) has look ${npc.look}; looks go from 0 to ${looks.length - 1}.`);
  });
  map.doors.forEach((door, i) => {
    if (!reachable(door.x, door.y))
      errors.push(`Door ${i + 1} (to "${door.to}", column ${door.x}, row ${door.y}) must be on, or right next to, a walkable tile.`);
  });
  if (!walkable(map.spawn.x, map.spawn.y)) errors.push(`The spawn (column ${map.spawn.x}, row ${map.spawn.y}) must be a walkable tile.`);

  const tilesOf = (kind: string) => {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (kindAt(x, y) === kind) out.push({ x, y });
    return out;
  };
  const centersOf = (kind: string) => {
    const blocks = objects.filter((o) => o.kind === kind);
    if (blocks.length) return blocks.map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }));
    return tilesOf(kind).map((t) => ({ x: t.x + 0.5, y: t.y + 0.5 }));
  };

  return {
    w,
    h,
    kindAt,
    neighborsOf: (x, y) => (dx, dy) => kindAt(x + dx, y + dy),
    walkable,
    objects,
    tilesOf,
    centersOf,
    errors,
  };
}
