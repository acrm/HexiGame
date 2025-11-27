// Pure, functional game logic for the Color Cell prototype
// No DOM/Canvas, immutable updates, tick-based timing (12 ticks/sec)

// ---------- Types ----------
export type Axial = { q: number; r: number };

export type Cell = {
  q: number;
  r: number;
  colorIndex: number | null;
};

export type Grid = Map<string, Cell>;

export interface FlashState {
  type: "success" | "failure";
  startedTick: number;
}

export interface Params {
  GridRadius: number;
  InitialColorProbability: number; // 0..1
  ColorPalette: string[];
  PlayerBaseColorIndex: number;
  TimerInitialSeconds: number;
  CaptureHoldDurationTicks: number;
  CaptureFailureCooldownTicks: number;
  CaptureFlashDurationTicks: number;
  ChanceBasePercent: number; // usually 100
  ChancePenaltyPerPaletteDistance: number; // usually 20
  CarryFlickerCycleTicks: number;
  CarryFlickerOnFraction: number; // 0..1
  CarryingMoveRequiresEmpty: boolean; // should be true
  GameTickRate: number; // ticks per second, e.g. 12
}

export interface GameState {
  tick: number; // increases by 1 each logic step
  remainingSeconds: number;
  cursor: Axial; // visual target hex (where protagonist is looking)
  protagonist: Axial; // protagonist position
  capturedCell: Axial | null; // anchor cell currently being carried, if any
  captureCooldownTicksRemaining: number;
  captureChargeStartTick: number | null;
  flash: FlashState | null;
  grid: Grid;
  facingDirIndex: number; // 0..5, protagonist facing direction
}

export type RNG = () => number; // returns float in [0,1)

// Optional: a simple seeded RNG (Mulberry32)
export function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Helpers ----------
// Direction indices follow this convention:
// 0: strictly "up" (0, -1), then clockwise around.
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

// ---------- Initialization ----------
export function generateGrid(params: Params, rng: RNG): Grid {
  const g: Grid = new Map();
  const radius = params.GridRadius;
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
  const start: Axial = { q: 0, r: 0 };
  return {
    tick: 0,
    remainingSeconds: params.TimerInitialSeconds,
    cursor: { ...start },
    protagonist: { ...start },
    capturedCell: null,
    captureCooldownTicksRemaining: 0,
    captureChargeStartTick: null,
    flash: null,
    facingDirIndex: 0,
    grid,
  };
}

// ---------- Facing / Orientation ----------
export function rotateFacing(state: GameState, deltaSteps: number): GameState {
  const dir = ((state.facingDirIndex + deltaSteps) % 6 + 6) % 6;
  return { ...state, facingDirIndex: dir };
}

// ---------- Chance & Selectors ----------
export function paletteDistance(colorIndex: number, playerBaseIndex: number, paletteLength: number): number {
  if (paletteLength <= 0) return 0;
  const delta = ((colorIndex - playerBaseIndex) % paletteLength + paletteLength) % paletteLength;
  return Math.min(delta, paletteLength - delta);
}

export function computeCaptureChancePercent(params: Params, colorIndex: number): number {
  const paletteLen = params.ColorPalette.length;
  if (paletteLen <= 0) return 0;

  const dist = paletteDistance(colorIndex, params.PlayerBaseColorIndex, paletteLen);
  const maxDist = Math.floor(paletteLen / 2);

  if (maxDist === 0) {
    return params.ChanceBasePercent;
  }

  if (dist === maxDist) {
    return 0;
  }

  if (dist === 0) {
    return params.ChanceBasePercent;
  }

  const raw = ((maxDist - dist) / maxDist) * params.ChanceBasePercent;
  const mapped = Math.max(10, Math.round(raw));
  return Math.max(0, Math.min(100, mapped));
}

export function hoveredCell(state: GameState): Cell | undefined {
  return getCell(state.grid, state.cursor);
}

// Visual follower logic for protagonist: follows cursor with one-step lag.
// If cursor is adjacent to protagonist, protagonist stays.
// If cursor leaves adjacency, protagonist moves into previous cursor position
// if that position was adjacent; otherwise it also stays.
export function evolveProtagonistFollower(
  protagonist: Axial,
  cursor: Axial,
  lastCursor: Axial | null,
): { protagonist: Axial; nextLastCursor: Axial | null } {
  // If cursor did not change, nothing to do
  if (lastCursor && lastCursor.q === cursor.q && lastCursor.r === cursor.r) {
    return { protagonist, nextLastCursor: lastCursor };
  }

  const nextLastCursor: Axial = { q: cursor.q, r: cursor.r };

  // 1) Movement: protagonist moves only when cursor is no longer adjacent
  const isAdjacent = axialDirections.some(
    d => protagonist.q + d.q === cursor.q && protagonist.r + d.r === cursor.r,
  );

  if (!isAdjacent && !(protagonist.q === cursor.q && protagonist.r === cursor.r)) {
    // Move protagonist into the previous cursor position, if it was adjacent
    if (
      lastCursor &&
      axialDirections.some(
        d => protagonist.q + d.q === lastCursor.q && protagonist.r + d.r === lastCursor.r,
      )
    ) {
      return { protagonist: { q: lastCursor.q, r: lastCursor.r }, nextLastCursor };
    }
  }

  // Otherwise stay in place
  return { protagonist, nextLastCursor };
}


// ---------- Simple adjacency metric per color ----------
// For each color index i, returns how many cells of that color
// have at least one neighbor of the same color.
export function computeAdjacentSameColorCounts(state: GameState, params: Params): number[] {
  const paletteLen = params.ColorPalette.length;
  const result: number[] = new Array(paletteLen).fill(0);
  if (paletteLen === 0) return result;

  const neighborDirs: Axial[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  for (const cell of state.grid.values()) {
    if (cell.colorIndex === null) continue;
    const colorIndex = ((cell.colorIndex % paletteLen) + paletteLen) % paletteLen;
    let hasSameNeighbor = false;
    for (const d of neighborDirs) {
      const nq = cell.q + d.q;
      const nr = cell.r + d.r;
      const neighbor = state.grid.get(keyOf(nq, nr));
      if (neighbor && neighbor.colorIndex === colorIndex) {
        hasSameNeighbor = true;
        break;
      }
    }
    if (hasSameNeighbor) {
      result[colorIndex] += 1;
    }
  }

  return result;
}

// ---------- Core Tick ----------
export function tick(state: GameState, params: Params, rng?: RNG): GameState {
  let next: GameState = { ...state, tick: state.tick + 1 };

  if (next.captureCooldownTicksRemaining > 0) {
    next = { ...next, captureCooldownTicksRemaining: next.captureCooldownTicksRemaining - 1 };
  }

  // Auto-complete capture exactly once when full charge duration is reached
  if (
    rng &&
    next.captureChargeStartTick !== null &&
    (next.tick - next.captureChargeStartTick) >= params.CaptureHoldDurationTicks
  ) {
    // Debug: auto-complete capture
    console.log(
      `[tick] auto-complete capture at tick=${next.tick}, started=${next.captureChargeStartTick}, held=${next.tick - next.captureChargeStartTick}`,
    );
    next = endCaptureCharge(next, params, rng);
  }

  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null };
  }

  if (next.tick % params.GameTickRate === 0 && next.remainingSeconds > 0) {
    next = { ...next, remainingSeconds: next.remainingSeconds - 1 };
  }

  return next;
}

// ---------- Movement ----------
export function attemptMoveByDirectionIndex(state: GameState, params: Params, dirIndex: number): GameState {
  const normIndex = ((dirIndex % 6) + 6) % 6;
  const dir = axialDirections[normIndex];
  const target = addAxial(state.cursor, dir);
  return attemptMoveTo({ ...state, facingDirIndex: normIndex }, params, target);
}

export function attemptMoveByDelta(state: GameState, params: Params, dq: number, dr: number): GameState {
  const target = { q: state.cursor.q + dq, r: state.cursor.r + dr };
  // Enforce adjacency: must match one of the six axial directions
  const matchedIndex = axialDirections.findIndex(
    d => state.cursor.q + d.q === target.q && state.cursor.r + d.r === target.r,
  );
  if (matchedIndex === -1) return state;
  const nextState: GameState = { ...state, facingDirIndex: matchedIndex };
  return attemptMoveTo(nextState, params, target);
}

export function attemptMoveTo(state: GameState, params: Params, target: Axial): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  const targetCell = getCell(state.grid, target);
  if (!targetCell) return state; // outside generated grid

  if (state.capturedCell) {
    // carrying: must move only into empty cells if required
    if (params.CarryingMoveRequiresEmpty && targetCell.colorIndex !== null) {
      return state; // blocked
    }

    const fromKey = keyOfAxial(state.capturedCell);
    const fromCell = state.grid.get(fromKey);
    if (!fromCell || fromCell.colorIndex === null) {
      // Inconsistent state; treat as not carrying
      return { ...state, capturedCell: null, cursor: target };
    }

    // Transport color: move color to target, clear previous
    const movedColor = fromCell.colorIndex;
    const nextGrid = updateCells(state.grid, [
      { ...fromCell, colorIndex: null },
      { ...targetCell, colorIndex: movedColor },
    ]);

    return {
      ...state,
      grid: nextGrid,
      capturedCell: { ...target },
      cursor: { ...target },
    };
  }

  // not carrying: move cursor only; protagonist follows cursor visually in UI
  return { ...state, cursor: { ...target } };
}

// ---------- Capture Flow ----------
// Begin charge (Space down). Does not require hovered cell to be colored.
export function beginCaptureCharge(state: GameState): GameState {
  if (state.capturedCell !== null) return state; // dropping is handled elsewhere
  if (state.captureCooldownTicksRemaining > 0) return state;
  if (state.captureChargeStartTick !== null) return state; // already charging
  const next = { ...state, captureChargeStartTick: state.tick };
  console.log(`[capture] begin at tick=${state.tick}`);
  return next;
}

// End charge (Space up). If held long enough, attempt capture on hovered cell.
export function endCaptureCharge(state: GameState, params: Params, rng: RNG): GameState {
  if (state.captureChargeStartTick === null) return state; // no active charge
  const heldTicks = state.tick - state.captureChargeStartTick;
  let next: GameState = { ...state, captureChargeStartTick: null };

  if (heldTicks < params.CaptureHoldDurationTicks) {
    console.log(`[capture] end too early at tick=${state.tick}, held=${heldTicks}`);
    return next; // not enough charge
  }

  if (next.capturedCell !== null) {
    return next; // already carrying (shouldn't happen if begin blocked correctly)
  }

  if (next.captureCooldownTicksRemaining > 0) {
    return next; // cooldown blocks attempt
  }

  const cell = hoveredCell(next);
  if (!cell || cell.colorIndex === null) {
    console.log(`[capture] no cell to capture at tick=${next.tick}`);
    return next; // nothing to capture
  }

  const chance = computeCaptureChancePercent(params, cell.colorIndex);
  const roll = rng() * 100; // [0,100)
  if (roll < chance) {
    // success
    console.log(`[capture] SUCCESS at tick=${next.tick}, held=${heldTicks}, roll=${roll.toFixed(2)}, chance=${chance}`);
    next = {
      ...next,
      capturedCell: { q: cell.q, r: cell.r },
      flash: { type: "success", startedTick: next.tick },
    };
  } else {
    // failure
    console.log(`[capture] FAIL at tick=${next.tick}, held=${heldTicks}, roll=${roll.toFixed(2)}, chance=${chance}`);
    next = {
      ...next,
      captureCooldownTicksRemaining: params.CaptureFailureCooldownTicks,
      flash: { type: "failure", startedTick: next.tick },
    };
  }
  return next;
}

// Drop carried color (Space press while carrying). Pure: just clears carrying anchor.
export function dropCarried(state: GameState): GameState {
  if (state.capturedCell === null) return state;
  return { ...state, capturedCell: null };
}

// Preview capture chance at the current cursor (or null if not applicable)
export function previewCaptureChanceAtCursor(state: GameState, params: Params): number | null {
  if (state.capturedCell !== null) return null;
  if (state.captureCooldownTicksRemaining > 0) return null;
  const cell = hoveredCell(state);
  if (!cell || cell.colorIndex === null) return null;
  return computeCaptureChancePercent(params, cell.colorIndex);
}

// Utility to test whether flicker should be "on" for the captured cell at this tick
export function isCarryFlickerOn(state: GameState, params: Params): boolean {
  if (!state.capturedCell) return false;
  const cycle = params.CarryFlickerCycleTicks;
  if (cycle <= 0) return false;
  const phase = state.tick % cycle;
  return phase < Math.floor(cycle * params.CarryFlickerOnFraction);
}

// ---------- Default Parameters (mirroring the doc) ----------
export const DefaultParams: Params = {
  GridRadius: 5,
  InitialColorProbability: 0.30,
  ColorPalette: [
    "#FF8000","#CC6600","#996600","#666600","#660099","#9933FF","#CC66FF","#FF99FF"
  ],
  PlayerBaseColorIndex: 0,
  TimerInitialSeconds: 300,
  CaptureHoldDurationTicks: 6,
  CaptureFailureCooldownTicks: 24,
  CaptureFlashDurationTicks: 2,
  ChanceBasePercent: 100,
  ChancePenaltyPerPaletteDistance: 20,
  CarryFlickerCycleTicks: 6,
  CarryFlickerOnFraction: 0.5,
  CarryingMoveRequiresEmpty: true,
  GameTickRate: 12,
};
