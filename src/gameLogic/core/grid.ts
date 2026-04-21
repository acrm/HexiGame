import type { Axial, Cell, Grid, GameState, RNG } from './types';
import type { Params } from './params';

const VISIBILITY_FORWARD_OFFSET = 1;

export const axialDirections: Readonly<Axial[]> = [
  { q: 0, r: -1 },  // 0 - up
  { q: +1, r: -1 }, // 1 - up-right
  { q: +1, r: 0 },  // 2 - down-right
  { q: 0, r: +1 },  // 3 - down
  { q: -1, r: +1 }, // 4 - down-left
  { q: -1, r: 0 },  // 5 - up-left
] as const;

export function addAxial(a: Axial, b: Axial): Axial {
  return { q: a.q + b.q, r: a.r + b.r };
}

function normalizeDirectionIndex(dirIndex: number): number {
  return ((dirIndex % 6) + 6) % 6;
}

export function getVisibilityCenter(protagonist: Axial, facingDirIndex: number): Axial {
  const forwardDir = axialDirections[normalizeDirectionIndex(facingDirIndex)];
  return {
    q: protagonist.q + forwardDir.q * VISIBILITY_FORWARD_OFFSET,
    r: protagonist.r + forwardDir.r * VISIBILITY_FORWARD_OFFSET,
  };
}

export function getForwardVisibilityEdgeTarget(
  protagonist: Axial,
  facingDirIndex: number,
  visibleRadius: number,
): Axial {
  const forwardDir = axialDirections[normalizeDirectionIndex(facingDirIndex)];
  const forwardDistance = Math.max(1, visibleRadius + VISIBILITY_FORWARD_OFFSET);
  return {
    q: protagonist.q + forwardDir.q * forwardDistance,
    r: protagonist.r + forwardDir.r * forwardDistance,
  };
}

function buildSafeStartCells(start: Axial, facingDirIndex: number, visibleRadius: number): Cell[] {
  const uniqueCells = new Map<string, Cell>();
  const addSafeCell = (cell: Cell) => {
    uniqueCells.set(keyOf(cell.q, cell.r), cell);
  };

  addSafeCell({ q: start.q, r: start.r, colorIndex: null });
  for (const dir of axialDirections) {
    addSafeCell({ q: start.q + dir.q, r: start.r + dir.r, colorIndex: null });
  }

  const forwardDir = axialDirections[normalizeDirectionIndex(facingDirIndex)];
  const forwardDistance = Math.max(1, visibleRadius + VISIBILITY_FORWARD_OFFSET);
  for (let step = 1; step <= forwardDistance; step++) {
    addSafeCell({
      q: start.q + forwardDir.q * step,
      r: start.r + forwardDir.r * step,
      colorIndex: null,
    });
  }

  return Array.from(uniqueCells.values());
}

export function equalAxial(a: Axial | null, b: Axial | null): boolean {
  return !!a && !!b && a.q === b.q && a.r === b.r;
}

export function keyOf(q: number, r: number): string {
  return `${q},${r}`;
}

export function keyOfAxial(p: Axial): string {
  return keyOf(p.q, p.r);
}

export function axialDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function axialToKey(p: Axial): string {
  return keyOfAxial(p);
}

export function axialInDisk(radius: number, q: number, r: number): boolean {
  const s = -q - r;
  return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius;
}

export function getCell(grid: Grid, p: Axial): Cell | undefined {
  return grid.get(keyOfAxial(p));
}

export function isWorldCellWalkable(grid: Grid, p: Axial): boolean {
  const cell = getCell(grid, p);
  return !!cell && cell.colorIndex === null;
}

export function setCell(grid: Grid, cell: Cell): Grid {
  const next = new Map(grid);
  next.set(keyOf(cell.q, cell.r), cell);
  return next;
}

export function updateCells(grid: Grid, cells: Cell[]): Grid {
  if (cells.length === 0) return grid;
  const next = new Map(grid);
  for (const c of cells) next.set(keyOf(c.q, c.r), c);
  return next;
}

// Find direction index pointing toward target; null if at target
export function findDirectionToward(fromQ: number, fromR: number, toQ: number, toR: number): number | null {
  if (fromQ === toQ && fromR === toR) return null;

  let bestDir: Axial | null = null;
  let bestDist = Infinity;

  for (const dir of axialDirections) {
    const nq = fromQ + dir.q;
    const nr = fromR + dir.r;
    const dist = Math.abs(toQ - nq) + Math.abs(toR - nr) + Math.abs(-toQ - toR + nq + nr);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  if (!bestDir) return null;
  return axialDirections.findIndex(d => d.q === bestDir!.q && d.r === bestDir!.r);
}

export function ensureGeneratedAround(state: GameState, params: Params, rng?: RNG): GameState {
  const center = state.protagonist;
  const radius = Math.max(1, params.GridRadius * 2);
  const paletteLen = params.ColorPalette.length;
  if (paletteLen <= 0) return state;

  const random = rng ?? Math.random;
  const toAdd: Cell[] = [];

  // Colored hexes auto-generate ONLY on layer 0. Other layers generate walkable (null) cells only.
  const isLayer0 = (state.activeLayerIndex ?? 0) === 0;

  for (let q = center.q - radius; q <= center.q + radius; q++) {
    for (let r = center.r - radius; r <= center.r + radius; r++) {
      const p = { q, r };
      if (axialDistance(center, p) > radius) continue;
      const key = keyOf(q, r);
      if (state.grid.has(key)) continue;
      const colorIndex = isLayer0 && random() < params.InitialColorProbability
        ? Math.floor(random() * paletteLen)
        : null;
      toAdd.push({ q, r, colorIndex });
    }
  }

  if (toAdd.length === 0) return state;
  return { ...state, grid: updateCells(state.grid, toAdd) };
}

// Compute path from source to target using greedy pathfinding
export function computePath(from: Axial, to: Axial, maxSteps: number = 100): Axial[] {
  const path: Axial[] = [];
  let current = { ...from };
  let steps = 0;

  while (steps < maxSteps) {
    if (current.q === to.q && current.r === to.r) break;
    const dirIndex = findDirectionToward(current.q, current.r, to.q, to.r);
    if (dirIndex === null) break;
    const dir = axialDirections[dirIndex];
    current = { q: current.q + dir.q, r: current.r + dir.r };
    path.push({ ...current });
    steps++;
  }

  return path;
}

function reconstructPath(
  parents: Map<string, string | null>,
  nodes: Map<string, Axial>,
  endKey: string,
): Axial[] {
  const path: Axial[] = [];
  let currentKey: string | null = endKey;

  while (currentKey) {
    const node = nodes.get(currentKey);
    const parentKey: string | null = parents.get(currentKey) ?? null;
    if (!node) break;
    if (parentKey !== null) {
      path.push(node);
    }
    currentKey = parentKey;
  }

  return path.reverse();
}

export function findWalkablePath(
  grid: Grid,
  start: Axial,
  goalKeys: Set<string>,
): Axial[] | null {
  const startKey = keyOfAxial(start);
  if (goalKeys.has(startKey)) return [];

  const queue: Axial[] = [{ ...start }];
  const visited = new Set<string>([startKey]);
  const parents = new Map<string, string | null>([[startKey, null]]);
  const nodes = new Map<string, Axial>([[startKey, { ...start }]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = keyOfAxial(current);

    for (const dir of axialDirections) {
      const next = addAxial(current, dir);
      const nextKey = keyOfAxial(next);

      if (visited.has(nextKey)) continue;
      if (!isWorldCellWalkable(grid, next)) continue;

      visited.add(nextKey);
      parents.set(nextKey, currentKey);
      nodes.set(nextKey, next);

      if (goalKeys.has(nextKey)) {
        return reconstructPath(parents, nodes, nextKey);
      }

      queue.push(next);
    }
  }

  return null;
}

export function computePathToFocusTarget(grid: Grid, from: Axial, target: Axial): Axial[] | null {
  if (!getCell(grid, target)) return null;
  if (axialDistance(from, target) === 1) return [];

  const goalKeys = new Set<string>();
  for (const dir of axialDirections) {
    const candidate = addAxial(target, dir);
    if (candidate.q === from.q && candidate.r === from.r) {
      goalKeys.add(keyOfAxial(candidate));
      continue;
    }
    if (isWorldCellWalkable(grid, candidate)) {
      goalKeys.add(keyOfAxial(candidate));
    }
  }

  if (goalKeys.size === 0) return null;
  return findWalkablePath(grid, from, goalKeys);
}

export function updateWorldViewCenter(state: GameState, params: Params): GameState {
  const targetCenter = getVisibilityCenter(state.protagonist, state.facingDirIndex);

  const currentCenter = state.worldViewCenter ?? targetCenter;
  const dist = axialDistance(currentCenter, targetCenter);

  // Camera at target - no movement needed
  if (dist === 0) {
    return state.worldViewCenter ? state : { ...state, worldViewCenter: currentCenter, cameraLastMoveTick: state.tick };
  }

  // Lagged camera: move only once every CameraLagTicks ticks
  const lastMoveTick = state.cameraLastMoveTick ?? 0;
  const ticksSinceLastMove = state.tick - lastMoveTick;

  if (ticksSinceLastMove < params.CameraLagTicks) {
    return state;
  }

  // Move 1 step toward target
  const dirIndex = findDirectionToward(currentCenter.q, currentCenter.r, targetCenter.q, targetCenter.r);
  if (dirIndex === null) {
    return { ...state, worldViewCenter: targetCenter, cameraLastMoveTick: state.tick };
  }

  const dir = axialDirections[dirIndex];
  const newCenter = {
    q: currentCenter.q + dir.q,
    r: currentCenter.r + dir.r,
  };

  return { ...state, worldViewCenter: newCenter, cameraLastMoveTick: state.tick };
}

export function generateGrid(params: Params, rng: RNG): Grid {
  const g: Grid = new Map();
  const radius = params.GridRadius * 2;
  const paletteLen = params.ColorPalette.length;
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!axialInDisk(radius, q, r)) continue;
      const colorIndex = rng() < params.InitialColorProbability
        ? Math.floor(rng() * paletteLen)
        : null;
      g.set(keyOf(q, r), { q, r, colorIndex });
    }
  }
  return g;
}

export function createInitialState(params: Params, rng: RNG): GameState {
  const grid = generateGrid(params, rng);
  const initialFacingDirIndex = 1;
  const safeStartCells = buildSafeStartCells({ q: 0, r: 0 }, initialFacingDirIndex, params.GridRadius);
  const safeGrid = updateCells(grid, safeStartCells);
  const inv: Grid = new Map();
  const invRadius = 3;
  for (let q = -invRadius; q <= invRadius; q++) {
    for (let r = -invRadius; r <= invRadius; r++) {
      if (!axialInDisk(invRadius, q, r)) continue;
      inv.set(keyOf(q, r), { q, r, colorIndex: null });
    }
  }
  const start: Axial = { q: 0, r: 0 };
  const startFocus = addAxial(start, axialDirections[initialFacingDirIndex]);
  const initialViewCenter = getVisibilityCenter(start, initialFacingDirIndex);

  return {
    tick: 0,
    remainingSeconds: params.TimerInitialSeconds,
    focus: startFocus,
    protagonist: { ...start },
    flash: null,
    invalidMoveTarget: null,
    inventoryGrid: inv,
    activeField: 'world',
    activeLayerIndex: 0,
    layerGrids: {},
    hotbarSlots: [null, null, null, null, null, null],
    selectedHotbarIndex: 0,
    facingDirIndex: initialFacingDirIndex,
    grid: safeGrid,
    isDragging: false,
    autoMoveTarget: null,
    autoMoveTicksRemaining: 0,
    autoFocusTarget: null,
    worldViewCenter: initialViewCenter,
    cameraLastMoveTick: 0,
    taskCompletedIds: new Set(),
    structureInstances: [],
  };
}
