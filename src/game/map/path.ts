/**
 * Cheapest route between two tiles (4 directions), e.g. so neighbors walk
 * along sidewalks and only cross roads where they need to. Pure code (no
 * Phaser) so it can be tested.
 */
export interface PathGrid {
  w: number;
  h: number;
  /** Cost of stepping onto a tile; Infinity = can't walk there. */
  cost(x: number, y: number): number;
}

export function findPath(grid: PathGrid, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number }[] | null {
  const idx = (x: number, y: number) => y * grid.w + x;
  const dist = new Float64Array(grid.w * grid.h).fill(Infinity);
  const prev = new Int32Array(grid.w * grid.h).fill(-1);
  const start = idx(from.x, from.y);
  const goal = idx(to.x, to.y);
  dist[start] = 0;
  // Small binary heap of [cost, index].
  const heap: [number, number][] = [[0, start]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };

  while (heap.length) {
    const [d, i] = pop();
    if (i === goal) break;
    if (d > dist[i]) continue;
    const x = i % grid.w;
    const y = (i - x) / grid.w;
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
      const step = grid.cost(nx, ny);
      if (!Number.isFinite(step)) continue;
      const j = idx(nx, ny);
      if (d + step < dist[j]) {
        dist[j] = d + step;
        prev[j] = i;
        push([dist[j], j]);
      }
    }
  }
  if (!Number.isFinite(dist[goal])) return null;
  const out: { x: number; y: number }[] = [];
  for (let i = goal; i !== -1 && i !== start; i = prev[i]) out.push({ x: i % grid.w, y: Math.floor(i / grid.w) });
  return out.reverse();
}
