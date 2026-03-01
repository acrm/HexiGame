import type { Axial, Cell, Grid, GameState, RNG } from './types';
import type { Params } from './params';

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

  for (let q = center.q - radius; q <= center.q + radius; q++) {
    for (let r = center.r - radius; r <= center.r + radius; r++) {
      const p = { q, r };
      if (axialDistance(center, p) > radius) continue;
      const key = keyOf(q, r);
      if (state.grid.has(key)) continue;
      const colorIndex = random() < params.InitialColorProbability
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

export function updateWorldViewCenter(state: GameState, params: Params): GameState {
  // Determine camera target
  let targetCenter: Axial;

  if (state.autoFocusTarget) {
    // When moving to a target, camera aims at the target cell (independent movement)
    targetCenter = state.autoFocusTarget;
  } else {
    // Normal mode: camera positioned ahead of protagonist so turtle is 3 cells from rear edge
    const forwardDir = axialDirections[state.facingDirIndex];
    const offset = Math.max(0, params.GridRadius - 3);
    targetCenter = {
      q: state.protagonist.q + forwardDir.q * offset,
      r: state.protagonist.r + forwardDir.r * offset,
    };
  }

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
  const inv: Grid = new Map();
  const invRadius = 3;
  for (let q = -invRadius; q <= invRadius; q++) {
    for (let r = -invRadius; r <= invRadius; r++) {
      if (!axialInDisk(invRadius, q, r)) continue;
      inv.set(keyOf(q, r), { q, r, colorIndex: null });
    }
  }
  const start: Axial = { q: 0, r: 0 };
  const initialFacingDirIndex = 0;
  const startFocus = addAxial(start, axialDirections[initialFacingDirIndex]);

  // Initial camera center: ahead of protagonist so turtle is 3 cells from rear edge
  const forwardDir = axialDirections[initialFacingDirIndex];
  const cameraOffset = Math.max(0, params.GridRadius - 3);
  const initialViewCenter = {
    q: start.q + forwardDir.q * cameraOffset,
    r: start.r + forwardDir.r * cameraOffset,
  };

  return {
    tick: 0,
    remainingSeconds: params.TimerInitialSeconds,
    focus: startFocus,
    protagonist: { ...start },
    flash: null,
    inventoryGrid: inv,
    activeField: 'world',
    hotbarSlots: [null, null, null, null, null, null],
    selectedHotbarIndex: 0,
    facingDirIndex: initialFacingDirIndex,
    grid,
    isDragging: false,
    autoMoveTarget: null,
    autoMoveTicksRemaining: 0,
    autoFocusTarget: null,
    worldViewCenter: initialViewCenter,
    cameraLastMoveTick: 0,
    tutorialCompletedLevelIds: new Set(),
  };
}
