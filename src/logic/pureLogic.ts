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
  inventoryGrid: Grid;
  activeField?: 'world' | 'inventory';
  facingDirIndex: number; // 0..5, protagonist facing direction
  paletteCounts?: Record<string, number>; // eaten counters by color hex value
  isReleasing?: boolean; // true when turtle moves to cursor to release
  isActionMode?: boolean; // true while player is holding action (Space / ACT button)
  releaseTarget?: Axial | null; // cell where an ongoing release should drop the carried hex
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
  // Inventory grid: same shape, all empty
  const inv: Grid = new Map();
  const radius = params.GridRadius;
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!axialInDisk(radius, q, r)) continue;
      inv.set(keyOf(q, r), { q, r, colorIndex: null });
    }
  }
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
    inventoryGrid: inv,
    activeField: 'world',
    facingDirIndex: 0,
    grid,
    isReleasing: false,
    isActionMode: false,
    releaseTarget: null,
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

export function hoveredCellInventory(state: GameState): Cell | undefined {
  return getCell(state.inventoryGrid, state.cursor);
}

export function hoveredCellActive(state: GameState): Cell | undefined {
  return state.activeField === 'inventory' ? hoveredCellInventory(state) : hoveredCell(state);
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

  // Action mode movement (world): move protagonist toward cursor until adjacent, but never enter cursor cell.
  if (next.isActionMode && next.activeField === 'world' && !next.isReleasing && next.captureChargeStartTick === null) {
    const { q: pq, r: pr } = next.protagonist;
    const { q: cq, r: cr } = next.cursor;
    const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr);
    if (!isAdjacent) {
      const movePeriod = 2; // 1 cell per 2 ticks during action mode
      if (next.tick % movePeriod === 0) {
        let bestDir: Axial | null = null;
        let bestDist = Infinity;
        for (const dir of axialDirections) {
          const nq = pq + dir.q;
          const nr = pr + dir.r;
          // Do not step into cursor cell
          if (nq === cq && nr === cr) continue;
          // Do not step into captured hex cell
          if (next.capturedCell && nq === next.capturedCell.q && nr === next.capturedCell.r) continue;
          const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr);
          if (dist < bestDist) { bestDist = dist; bestDir = dir; }
        }
        if (bestDir) {
          const facingIndex = axialDirections.findIndex(d => d.q === bestDir!.q && d.r === bestDir!.r);
          next = { ...next, protagonist: { q: pq + bestDir.q, r: pr + bestDir.r }, facingDirIndex: facingIndex >= 0 ? facingIndex : next.facingDirIndex };
        }
      }
    } else {
      // Adjacent: trigger capture or release initiation.
      const cursorCell = getCell(next.grid, next.cursor);
      if (next.capturedCell && cursorCell && cursorCell.colorIndex === null) {
        // Move carried hex into cursor cell then start release.
        const carriedCell = getCell(next.grid, next.capturedCell);
        if (carriedCell && carriedCell.colorIndex !== null) {
          const movedColor = carriedCell.colorIndex;
          const updated = updateCells(next.grid, [
            { ...carriedCell, colorIndex: null },
            { ...cursorCell, colorIndex: movedColor },
          ]);
          next = { ...next, grid: updated, capturedCell: { ...next.cursor }, isReleasing: true, releaseTarget: { ...next.cursor } };
        }
      } else if (!next.capturedCell && cursorCell && cursorCell.colorIndex !== null && next.captureCooldownTicksRemaining <= 0) {
        // Begin capture charge when adjacent and hex present under cursor.
        next = { ...next, captureChargeStartTick: next.tick };
      }
    }
  }

  // Move protagonist toward cursor during capture charge (legacy world mode movement if started by adjacency)
  if (next.captureChargeStartTick !== null && next.activeField === 'world') {
    const { q: pq, r: pr } = next.protagonist;
    const { q: cq, r: cr } = next.cursor;
    // Target is adjacent cell to cursor, not cursor itself
    const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr);
    if (!isAdjacent) {
      // Move at 1 cell per 2 ticks during charge
      const movePeriod = 2;
      const heldTicks = next.tick - next.captureChargeStartTick;
      if (heldTicks % movePeriod === 0) {
        // Find adjacent cell closest to cursor
        let bestDir: Axial | null = null;
        let bestDist = Infinity;
        for (const dir of axialDirections) {
          const nq = pq + dir.q;
          const nr = pr + dir.r;
          // Do not step into cursor cell
          if (nq === cq && nr === cr) continue;
          // Do not step into captured hex cell
          if (next.capturedCell && nq === next.capturedCell.q && nr === next.capturedCell.r) continue;
          const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = dir;
          }
        }
        if (bestDir) {
          const facingIndex = axialDirections.findIndex(d => d.q === bestDir!.q && d.r === bestDir!.r);
          next = { ...next, protagonist: { q: pq + bestDir.q, r: pr + bestDir.r }, facingDirIndex: facingIndex >= 0 ? facingIndex : next.facingDirIndex };
        }
      }
    }
  }

  // During release phase: move turtle + carried hex toward cursor at carry speed
  // Release movement continues once started, independent of action mode.
  if (next.isReleasing && next.activeField === 'world' && next.capturedCell) {
    const movePeriod = 4; // 1 cell per 4 ticks when carrying
    if (next.tick % movePeriod === 0) {
      const pq = next.protagonist.q, pr = next.protagonist.r;
      const cq = next.cursor.q, cr = next.cursor.r;
      // Choose movement direction for turtle (toward cursor), excluding the cell with captured hex
      let bestDir: Axial | null = null;
      let bestDist = Infinity;
      for (const dir of axialDirections) {
        const nq = pq + dir.q;
        const nr = pr + dir.r;
        // Do not move into the cell containing the captured hex
        if (next.capturedCell && nq === next.capturedCell.q && nr === next.capturedCell.r) {
          continue;
        }
        // Distance from next position to cursor (using axial metric approximation)
        const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      if (bestDir) {
        // Move turtle one step
        const newProtagonist = { q: pq + bestDir.q, r: pr + bestDir.r };
        next = { ...next, protagonist: newProtagonist, facingDirIndex: axialDirections.findIndex(d => d.q === bestDir!.q && d.r === bestDir!.r) };
        // Head cell = position of the carried hex (in front of turtle head)
        const headDir = axialDirections[next.facingDirIndex];
        const headCell = { q: newProtagonist.q + headDir.q, r: newProtagonist.r + headDir.r };
        const currentCaptured = next.capturedCell;
        const fromKey = currentCaptured ? keyOfAxial(currentCaptured) : null;
        const fromCell = fromKey ? next.grid.get(fromKey) : null;
        const toCell = getCell(next.grid, headCell);
        if (fromCell && fromCell.colorIndex !== null && toCell && (!params.CarryingMoveRequiresEmpty || toCell.colorIndex === null || (currentCaptured && keyOfAxial(currentCaptured) === keyOfAxial(headCell)))) {
          if (fromKey && keyOfAxial(headCell) !== fromKey) {
            const movedColor = fromCell.colorIndex;
            const nextGrid = updateCells(next.grid, [
              { ...fromCell, colorIndex: null },
              { ...toCell, colorIndex: movedColor },
            ]);
            next = { ...next, grid: nextGrid, capturedCell: headCell };
          }
        }
        // Drop when head cell reaches the original release target (cursor at release start)
        const target = next.releaseTarget ?? { q: cq, r: cr };
        if (headCell.q === target.q && headCell.r === target.r) {
          // Release completes: clear capture and start cooldown; clear releaseTarget
          next = { ...next, isReleasing: false, capturedCell: null, captureCooldownTicksRemaining: Math.max(next.captureCooldownTicksRemaining, 6), releaseTarget: null };
        }
      }
    }
  }

  // Auto-complete capture when full charge duration is reached
  const chargeDuration = next.activeField === 'inventory' ? 1 : params.CaptureHoldDurationTicks;
  if (
    rng &&
    next.captureChargeStartTick !== null &&
    (next.tick - next.captureChargeStartTick) >= chargeDuration
  ) {
    next = endCaptureChargeOnActive(next, params, rng);
  }

  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null };
  }

  if (next.tick % params.GameTickRate === 0 && next.remainingSeconds > 0) {
    next = { ...next, remainingSeconds: next.remainingSeconds - 1 };
  }

  // Invariant enforcement: protagonist must never occupy the same cell as capturedCell
  if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
    for (const dir of axialDirections) {
      const candidate = { q: next.capturedCell.q + dir.q, r: next.capturedCell.r + dir.r };
      if (!axialInDisk(params.GridRadius, candidate.q, candidate.r)) continue;
      // Ensure candidate is a real cell on grid
      if (!getCell(next.grid, candidate)) continue;
      // Move protagonist here and keep facing consistent
      next = { ...next, protagonist: candidate };
      break;
    }
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

export function attemptMoveByDeltaOnActive(state: GameState, params: Params, dq: number, dr: number): GameState {
  // In world mode with captured cell, throttle movement to 1 cell per 4 ticks
  if (state.activeField === 'world' && state.capturedCell) {
    const movePeriod = 4;
    const lastMove = (state as any).lastCarryMoveTick ?? 0;
    if (state.tick - lastMove < movePeriod) {
      return state; // too soon, ignore move
    }
  }
  const target = { q: state.cursor.q + dq, r: state.cursor.r + dr };
  const matchedIndex = axialDirections.findIndex(
    d => state.cursor.q + d.q === target.q && state.cursor.r + d.r === target.r,
  );
  if (matchedIndex === -1) return state;
  const nextState: GameState = { ...state, facingDirIndex: matchedIndex };
  return attemptMoveToOnActive(nextState, params, target);
}

export function attemptMoveTo(state: GameState, params: Params, target: Axial): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  const targetCell = getCell(state.grid, target);
  if (!targetCell) return state; // outside generated grid
  // Always move the cursor only (the carried hex is moved by the turtle, not by the cursor)
  return { ...state, cursor: { ...target } };
}

export function attemptMoveToOnActive(state: GameState, params: Params, target: Axial): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  const usingInventory = state.activeField === 'inventory';
  const grid = usingInventory ? state.inventoryGrid : state.grid;
  const targetCell = getCell(grid, target);
  if (!targetCell) return state;
  // Cursor always moves empty; moving the carried hex happens in release tick
  return { ...state, cursor: { ...target } };
}

// ---------- Capture Flow ----------
// Begin charge (Space down). In world mode, only starts if cursor cell contains hex.
export function beginCaptureCharge(state: GameState): GameState {
  if (state.capturedCell !== null) return state; // dropping is handled elsewhere
  if (state.captureCooldownTicksRemaining > 0) return state;
  if (state.captureChargeStartTick !== null) return state; // already charging
  
  // In world mode, charge only starts if cursor cell contains a hex
  if (state.activeField === 'world') {
    const cursorCell = hoveredCell(state);
    if (!cursorCell || cursorCell.colorIndex === null) {
      return state; // no hex at cursor, cannot start charge
    }
  }
  
  const next = { ...state, captureChargeStartTick: state.tick };
  console.log(`[capture] begin at tick=${state.tick}`);
  return next;
}

// End charge (Space up). If held long enough, attempt capture on hovered cell.
export function endCaptureCharge(state: GameState, params: Params, rng: RNG): GameState {
  if (state.captureChargeStartTick === null) return state;
  const heldTicks = state.tick - state.captureChargeStartTick;
  let next: GameState = { ...state, captureChargeStartTick: null };

  const inInventory = state.activeField === 'inventory';
  const chargeDuration = inInventory ? 1 : params.CaptureHoldDurationTicks;
  if (!inInventory && heldTicks < chargeDuration) {
    console.log(`[capture] end too early at tick=${next.tick}, held=${heldTicks}`);
    return next;
  }

  if (next.capturedCell !== null) {
    return next;
  }

  if (next.captureCooldownTicksRemaining > 0) {
    return next;
  }

  // In world mode, check if protagonist reached adjacent cell to cursor
  if (!inInventory) {
    const { q: pq, r: pr } = next.protagonist;
    const { q: cq, r: cr } = next.cursor;
    const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr);
    if (!isAdjacent) {
      console.log(`[capture] FAIL: turtle didn't reach cursor adjacency at tick=${next.tick}`);
      next = {
        ...next,
        captureCooldownTicksRemaining: params.CaptureFailureCooldownTicks,
        flash: { type: "failure", startedTick: next.tick },
      };
      return next;
    }
  }

  const usingInventory = next.activeField === 'inventory';
  const cell = usingInventory ? hoveredCellInventory(next) : hoveredCell(next);
  if (!cell) {
    console.log(`[capture] no cell at cursor at tick=${next.tick}`);
    return next;
  }

  // Allow capture on empty cells (turtle just walks to cursor)
  if (cell.colorIndex === null) {
    console.log(`[capture] empty cell at tick=${next.tick}, turtle reached`);
    return next;
  }

  const chance = usingInventory ? 100 : computeCaptureChancePercent(params, cell.colorIndex);
  const roll = usingInventory ? 0 : rng() * 100; // [0,100)
  if (roll < chance) {
    // success
    console.log(`[capture] SUCCESS at tick=${next.tick}, held=${heldTicks}, roll=${roll.toFixed(2)}, chance=${chance}`);
    next = {
      ...next,
      capturedCell: { q: cell.q, r: cell.r },
      flash: { type: "success", startedTick: next.tick },
    };
    // Ensure protagonist is not in the same cell as captured; keep them adjacent.
    if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
      const pq = next.protagonist.q, pr = next.protagonist.r;
      const cq = next.capturedCell.q, cr = next.capturedCell.r;
      let bestDir: Axial | null = null;
      let bestDist = Infinity;
      for (const dir of axialDirections) {
        const nq = pq + dir.q;
        const nr = pr + dir.r;
        // Must not be the captured cell and must remain in grid
        if (nq === cq && nr === cr) continue;
        if (!axialInDisk(params.GridRadius, nq, nr)) continue;
        // Prefer the smallest distance to captured to keep adjacency while not overlapping
        const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr);
        if (dist < bestDist) { bestDist = dist; bestDir = dir; }
      }
      if (bestDir) {
        next = { ...next, protagonist: { q: pq + bestDir.q, r: pr + bestDir.r } };
      }
    }
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

export function endCaptureChargeOnActive(state: GameState, params: Params, rng: RNG): GameState {
  return endCaptureCharge(state, params, rng);
}

// Drop carried color (Space press while carrying). Pure: just clears carrying anchor.
export function dropCarried(state: GameState): GameState {
  if (state.capturedCell === null) return state;
  return { ...state, capturedCell: null, captureCooldownTicksRemaining: Math.max(state.captureCooldownTicksRemaining, 6), releaseTarget: null };
}

// Begin releasing: turtle will move with carried hex toward cursor and drop on arrival
export function beginRelease(state: GameState): GameState {
  if (state.activeField !== 'world') return state;
  if (state.capturedCell === null) return state;
  return { ...state, isReleasing: true, releaseTarget: { ...state.cursor } };
}

// Consume the currently carried cell: remove its color from grid and increment palette counter.
export function eatCaptured(state: GameState, params: Params): GameState {
  if (state.capturedCell === null) return state;
  const anchor = state.capturedCell;
  const key = keyOf(anchor.q, anchor.r);
  const cell = state.grid.get(key);
  if (!cell || cell.colorIndex === null) {
    // Inconsistent carry; just clear capture
    return { ...state, capturedCell: null };
  }
  const color = params.ColorPalette[cell.colorIndex] || `#${cell.colorIndex}`;
  const nextGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }]);
  const nextCounts: Record<string, number> = { ...(state.paletteCounts || {}) };
  nextCounts[color] = (nextCounts[color] || 0) + 1;
  return { ...state, grid: nextGrid, capturedCell: null, paletteCounts: nextCounts };
}

// Eat in world and store in a random empty inventory cell
export function eatCapturedToInventory(state: GameState, params: Params, rng: RNG): GameState {
  if (state.capturedCell === null) return state;
  const anchor = state.capturedCell;
  const key = keyOf(anchor.q, anchor.r);
  const cell = state.grid.get(key);
  if (!cell || cell.colorIndex === null) {
    return { ...state, capturedCell: null };
  }
  const colorIndex = cell.colorIndex;
  const color = params.ColorPalette[colorIndex] || `#${colorIndex}`;
  const worldGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }]);
  // Collect empty inventory cells
  const empties: Cell[] = [];
  for (const c of state.inventoryGrid.values()) {
    if (c.colorIndex === null) empties.push(c);
  }
  if (empties.length > 0) {
    const idx = Math.floor(rng() * empties.length);
    const target = empties[idx];
    const nextInv = updateCells(state.inventoryGrid, [{ ...target, colorIndex }]);
    const nextCounts: Record<string, number> = { ...(state.paletteCounts || {}) };
    nextCounts[color] = (nextCounts[color] || 0) + 1;
    return { ...state, grid: worldGrid, inventoryGrid: nextInv, capturedCell: null, paletteCounts: nextCounts };
  }
  // No space in inventory: just drop count
  const nextCounts: Record<string, number> = { ...(state.paletteCounts || {}) };
  nextCounts[color] = (nextCounts[color] || 0) + 1;
  return { ...state, grid: worldGrid, capturedCell: null, paletteCounts: nextCounts };
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
  CaptureFailureCooldownTicks: 12,
  CaptureFlashDurationTicks: 2,
  ChanceBasePercent: 100,
  ChancePenaltyPerPaletteDistance: 20,
  CarryFlickerCycleTicks: 6,
  CarryFlickerOnFraction: 0.5,
  CarryingMoveRequiresEmpty: true,
  GameTickRate: 12,
};
