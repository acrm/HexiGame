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
  focus: Axial; // focus hex - always adjacent to protagonist head
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
  isReleasing?: boolean; // true when turtle moves to focus to release
  isActionMode?: boolean; // true while player is holding action (Space / ACT button)
  releaseTarget?: Axial | null; // cell where an ongoing release should drop the carried hex
  actionHeldTicks?: number; // ticks elapsed since action button was pressed (0..12+)
  actionStartTick?: number | null; // tick when action was started
  lastActionEndTick?: number | null; // tick when the last action finished
  actionTurnedOnStart?: boolean; // whether head turned at action start
  eatFailureFlash?: { startedTick: number }; // flash when eat attempt fails
  lastEatAttemptTick?: number; // track when last eat was attempted for cooldown
  turtleColorIndex?: number; // current turtle color index
  lastColorShiftTick?: number | null; // last tick when turtle color shifted
  standTargetColorIndex?: number | null; // color of hex currently standing on
  isDragging?: boolean; // true when user is dragging protagonist/focus
  autoMoveTarget?: Axial | null; // target cell for automatic movement
  autoMoveTicksRemaining?: number; // ticks until next auto move step (2 ticks per step)
  autoFocusTarget?: Axial | null; // destination focus cell to highlight while moving
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
  const startFocus = addAxial(start, axialDirections[0]); // focus starts ahead of protagonist
  return {
    tick: 0,
    remainingSeconds: params.TimerInitialSeconds,
    focus: startFocus,
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
    actionHeldTicks: 0,
    actionStartTick: null,
    lastActionEndTick: null,
    actionTurnedOnStart: false,
    eatFailureFlash: undefined,
    lastEatAttemptTick: undefined,
    turtleColorIndex: params.PlayerBaseColorIndex,
    lastColorShiftTick: null,
    standTargetColorIndex: null,
    isDragging: false,
    autoMoveTarget: null,
    autoMoveTicksRemaining: 0,
    autoFocusTarget: null,
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
  return getCell(state.grid, state.focus);
}

export function hoveredCellInventory(state: GameState): Cell | undefined {
  return getCell(state.inventoryGrid, state.focus);
}

export function hoveredCellActive(state: GameState): Cell | undefined {
  return state.activeField === 'inventory' ? hoveredCellInventory(state) : hoveredCell(state);
}

// Update focus position to be always in front of protagonist based on facing direction
export function updateFocusPosition(state: GameState): GameState {
  if (state.isDragging) return state; // Don't auto-update focus during drag
  const dir = axialDirections[state.facingDirIndex];
  const newFocus = addAxial(state.protagonist, dir);
  return { ...state, focus: newFocus };
}

// Start automatic movement to target cell (focus will land on target)
export function startAutoMove(state: GameState, target: Axial, params: Params): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  if (state.isDragging) return state; // Don't start auto move during drag
  
  // Calculate where protagonist needs to be so that focus lands on target
  // We need to find adjacent cell to target that's in the direction we'll face
  let bestProtagonistPos: Axial | null = null;
  let bestDir = 0;
  let minDist = Infinity;
  
  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const dir = axialDirections[dirIdx];
    // If focus is at target, protagonist is one step back (opposite direction)
    const candidatePos = { q: target.q - dir.q, r: target.r - dir.r };
    if (!axialInDisk(params.GridRadius, candidatePos.q, candidatePos.r)) continue;
    
    const dist = Math.abs(state.protagonist.q - candidatePos.q) + 
                 Math.abs(state.protagonist.r - candidatePos.r) +
                 Math.abs(-state.protagonist.q - state.protagonist.r + candidatePos.q + candidatePos.r);
    if (dist < minDist) {
      minDist = dist;
      bestProtagonistPos = candidatePos;
      bestDir = dirIdx;
    }
  }
  
  if (!bestProtagonistPos) return state;
  
  return {
    ...state,
    autoMoveTarget: bestProtagonistPos,
    autoMoveTicksRemaining: 0,
    facingDirIndex: bestDir,
    autoFocusTarget: { ...target },
  };
}

// Start drag mode - protagonist and focus move together
export function startDrag(state: GameState): GameState {
  return { ...state, isDragging: true, autoMoveTarget: null };
}

// End drag mode - return to normal
export function endDrag(state: GameState): GameState {
  return updateFocusPosition({ ...state, isDragging: false });
}

// Move protagonist by delta during drag (focus moves with it)
export function dragMoveProtagonist(state: GameState, params: Params, dq: number, dr: number): GameState {
  if (!state.isDragging) return state;
  
  // Only allow movement to adjacent cells (1 step at a time)
  const dist = Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr);
  if (dist !== 2) return state; // Not a single hex step
  
  const newPos = { q: state.protagonist.q + dq, r: state.protagonist.r + dr };
  if (!axialInDisk(params.GridRadius, newPos.q, newPos.r)) return state;
  
  const newFocus = { q: state.focus.q + dq, r: state.focus.r + dr };
  if (!axialInDisk(params.GridRadius, newFocus.q, newFocus.r)) return state;
  
  // Update facing direction based on movement
  const dirIndex = axialDirections.findIndex(d => d.q === dq && d.r === dr);
  if (dirIndex !== -1) {
    return { ...state, protagonist: newPos, focus: newFocus, facingDirIndex: dirIndex };
  }
  
  return { ...state, protagonist: newPos, focus: newFocus };
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

  // Update action held ticks if action is being held
  if (next.isActionMode && next.actionStartTick !== null && next.actionStartTick !== undefined) {
    next = { ...next, actionHeldTicks: next.tick - next.actionStartTick };
  }

  // Auto-complete long action at 12 ticks
  if (next.isActionMode && (next.actionHeldTicks ?? 0) >= 12) {
    next = finalizeAction(next, params, rng ?? mulberry32(next.tick));
  }

  // Clear eat failure flash after duration
  if (next.eatFailureFlash && (next.tick - next.eatFailureFlash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, eatFailureFlash: undefined };
  }

  // Auto-movement logic: move 1 cell every 2 ticks
  if (next.autoMoveTarget && !next.isDragging) {
    if (next.autoMoveTicksRemaining === undefined || next.autoMoveTicksRemaining <= 0) {
      // Time to move
      if (next.protagonist.q === next.autoMoveTarget.q && next.protagonist.r === next.autoMoveTarget.r) {
        // Reached target: align facing toward destination focus so focus lands exactly there
        if (next.autoFocusTarget) {
          const dirTowardFocus = findDirectionToward(next.protagonist.q, next.protagonist.r, next.autoFocusTarget.q, next.autoFocusTarget.r);
          if (dirTowardFocus !== null) {
            next = { ...next, facingDirIndex: dirTowardFocus };
          }
        }
        next = updateFocusPosition(next); // place focus in front of head (at destination)
        next = { ...next, autoMoveTarget: null, autoMoveTicksRemaining: 0, autoFocusTarget: null };
      } else {
        // Move one step toward target
        const dirIndex = findDirectionToward(next.protagonist.q, next.protagonist.r, next.autoMoveTarget.q, next.autoMoveTarget.r);
        if (dirIndex !== null) {
          const dir = axialDirections[dirIndex];
          const newPos = { q: next.protagonist.q + dir.q, r: next.protagonist.r + dir.r };
          if (axialInDisk(params.GridRadius, newPos.q, newPos.r)) {
            next = { ...next, protagonist: newPos, facingDirIndex: dirIndex, autoMoveTicksRemaining: 2 };
            // Keep focus always ahead of turtle even during auto-move
            next = updateFocusPosition(next);
          } else {
            // Can't move further, stop
            next = { ...next, autoMoveTarget: null, autoMoveTicksRemaining: 0 };
            next = updateFocusPosition(next);
          }
        } else {
          // Already at target
          next = { ...next, autoMoveTarget: null, autoMoveTicksRemaining: 0 };
          next = updateFocusPosition(next);
        }
      }
    } else {
      // Count down
      next = { ...next, autoMoveTicksRemaining: next.autoMoveTicksRemaining - 1 };
    }
  }

  // NOTE: Capture logic is disabled. Only movement and eating on release are active.

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

  // Always keep focus updated when not dragging
  if (!next.isDragging) {
    next = updateFocusPosition(next);
  }

  return next;
}

// ---------- Movement ----------
// Rotate protagonist to face a direction (updates focus automatically)
export function attemptMoveByDirectionIndex(state: GameState, params: Params, dirIndex: number): GameState {
  if (state.isDragging || state.autoMoveTarget) return state;
  const normIndex = ((dirIndex % 6) + 6) % 6;
  const next = { ...state, facingDirIndex: normIndex };
  return updateFocusPosition(next);
}

// Rotate protagonist by delta direction (updates focus automatically)
export function attemptMoveByDelta(state: GameState, params: Params, dq: number, dr: number): GameState {
  if (state.isDragging || state.autoMoveTarget) return state;
  const target = { q: state.focus.q + dq, r: state.focus.r + dr };
  // Enforce adjacency: must match one of the six axial directions
  const matchedIndex = axialDirections.findIndex(
    d => state.focus.q + d.q === target.q && state.focus.r + d.r === target.r,
  );
  if (matchedIndex === -1) return state;
  const nextState: GameState = { ...state, facingDirIndex: matchedIndex };
  return updateFocusPosition(nextState);
}

export function attemptMoveByDeltaOnActive(state: GameState, params: Params, dq: number, dr: number): GameState {
  // Same as attemptMoveByDelta for now
  return attemptMoveByDelta(state, params, dq, dr);
}

// Start auto-move to target position (focus will be placed on target)
export function attemptMoveTo(state: GameState, params: Params, target: Axial): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  const targetCell = getCell(state.grid, target);
  if (!targetCell) return state; // outside generated grid
  // Start automatic movement to target
  return startAutoMove(state, target, params);
}

export function attemptMoveToOnActive(state: GameState, params: Params, target: Axial): GameState {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state;
  const usingInventory = state.activeField === 'inventory';
  const grid = usingInventory ? state.inventoryGrid : state.grid;
  const targetCell = getCell(grid, target);
  if (!targetCell) return state;
  // Start automatic movement to target
  return startAutoMove(state, target, params);
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

  // In world mode, check if protagonist is adjacent to focus
  if (!inInventory) {
    const { q: pq, r: pr } = next.protagonist;
    const { q: fq, r: fr } = next.focus;
    const isAdjacent = axialDirections.some(d => pq + d.q === fq && pr + d.r === fr);
    if (!isAdjacent) {
      console.log(`[capture] FAIL: turtle didn't reach focus adjacency at tick=${next.tick}`);
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
    console.log(`[capture] no cell at focus at tick=${next.tick}`);
    return next;
  }

  // Allow capture on empty cells (turtle just walks to focus)
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

// Begin releasing: turtle will move with carried hex toward focus and drop on arrival
export function beginRelease(state: GameState): GameState {
  if (state.activeField !== 'world') return state;
  if (state.capturedCell === null) return state;
  return { ...state, isReleasing: true, releaseTarget: { ...state.focus } };
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
  const turtleColorIndex = state.turtleColorIndex ?? params.PlayerBaseColorIndex;
  return computeChanceByPlayerIndex(params, turtleColorIndex, cell.colorIndex);
}

// Utility to test whether flicker should be "on" for the captured cell at this tick
export function isCarryFlickerOn(state: GameState, params: Params): boolean {
  if (!state.capturedCell) return false;
  const cycle = params.CarryFlickerCycleTicks;
  if (cycle <= 0) return false;
  const phase = state.tick % cycle;
  return phase < Math.floor(cycle * params.CarryFlickerOnFraction);
}

// Utility to test whether action mode flicker should be "on" (accelerated flicker)
// Flicker is visible after 2 ticks of holding, at 2x speed
export function isActionModeFlickerOn(state: GameState, params: Params): boolean {
  if (!state.isActionMode || state.actionHeldTicks === undefined || state.actionHeldTicks < 2) return false;
  const cycle = Math.max(1, Math.floor(params.CarryFlickerCycleTicks / 2)); // 2x faster
  const phase = state.tick % cycle;
  return phase < Math.floor(cycle * params.CarryFlickerOnFraction);
}

// Handle action release: perform turn (if needed) or move+eat (if held 12 ticks at cursor with hex)
export function handleActionRelease(state: GameState, params: Params, rng: RNG): GameState {
  if (!state.isActionMode) return state;
  if (state.activeField !== 'world') return state;
  
  // Release finalizes a short action if held <12, otherwise long (handled by finalizeAction)
  if ((state.actionHeldTicks ?? 0) >= 12) {
    return finalizeAction(state, params, rng);
  }
  return finalizeShortAction(state, params);
}

// Find direction index pointing toward target; null if at target
function findDirectionToward(fromQ: number, fromR: number, toQ: number, toR: number): number | null {
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

// Attempt to eat a cell (move from world to inventory)
// On success: cell is removed from world, added to random empty inventory cell
// On failure: show red flash for cooldown duration
export function attemptEatCellToInventory(state: GameState, cellPos: Axial, params: Params, rng: RNG): GameState {
  const cell = getCell(state.grid, cellPos);
  if (!cell || cell.colorIndex === null) {
    // No hex to eat
    return { ...state, isActionMode: false, actionStartTick: null, actionHeldTicks: 0 };
  }
  
  const colorIndex = cell.colorIndex;
  const color = params.ColorPalette[colorIndex] || `#${colorIndex}`;
  
  // Compute eat chance based on turtle's current color vs cell
  const baseIndex = state.turtleColorIndex ?? params.PlayerBaseColorIndex;
  const chance = computeChanceByPlayerIndex(params, baseIndex, colorIndex);
  const roll = rng() * 100;
  
  if (roll < chance) {
    // Success: move to inventory
    const worldGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }]);
    
    // Find empty inventory cells
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
      return {
        ...state,
        grid: worldGrid,
        inventoryGrid: nextInv,
        paletteCounts: nextCounts,
        isActionMode: false,
        actionStartTick: null,
        actionHeldTicks: 0,
      };
    } else {
      // Inventory full: eat anyway, just lose the color
      const nextCounts: Record<string, number> = { ...(state.paletteCounts || {}) };
      nextCounts[color] = (nextCounts[color] || 0) + 1;
      return {
        ...state,
        grid: worldGrid,
        paletteCounts: nextCounts,
        isActionMode: false,
        actionStartTick: null,
        actionHeldTicks: 0,
      };
    }
    } else {
      // Failure: show red flash
      return {
        ...state,
        eatFailureFlash: { startedTick: state.tick },
        isActionMode: false,
        actionStartTick: null,
        actionHeldTicks: 0,
      };
    }
}

// Step one color toward target along shortest path on the wheel
export function stepTowardsColor(current: number, target: number, paletteLen: number): number {
  if (paletteLen <= 0) return current;
  const mod = (n: number) => ((n % paletteLen) + paletteLen) % paletteLen;
  current = mod(current);
  target = mod(target);
  if (current === target) return current;
  // Distances clockwise and counter-clockwise
  const cw = mod(target - current);
  const ccw = mod(current - target);
  // Move one step in the direction that reduces distance
  if (cw <= ccw) {
    return mod(current + 1);
  } else {
    return mod(current - 1);
  }
}

// Shift turtle color when it leaves a colored hex
function applyColorDriftOnDeparture(state: GameState, params: Params, from: Axial): GameState {
  const cell = getCell(state.grid, from);
  if (!cell || cell.colorIndex === null) return state;
  const paletteLen = params.ColorPalette.length;
  if (paletteLen <= 0) return state;
  const current = state.turtleColorIndex ?? params.PlayerBaseColorIndex;
  const nextColor = stepTowardsColor(current, cell.colorIndex, paletteLen);
  if (nextColor === current) {
    return { ...state, standTargetColorIndex: cell.colorIndex, lastColorShiftTick: state.tick };
  }
  return {
    ...state,
    turtleColorIndex: nextColor,
    standTargetColorIndex: cell.colorIndex,
    lastColorShiftTick: state.tick,
  };
}

// Chance by distance between player (current turtle color) and target color
export function computeChanceByPlayerIndex(params: Params, playerIndex: number, colorIndex: number): number {
  const paletteLen = params.ColorPalette.length;
  if (paletteLen <= 0) return 0;
  const dist = paletteDistance(colorIndex, playerIndex, paletteLen);
  const maxDist = Math.floor(paletteLen / 2);
  if (maxDist === 0) return params.ChanceBasePercent;
  if (dist === maxDist) return 0;
  if (dist === 0) return params.ChanceBasePercent;
  const raw = ((maxDist - dist) / maxDist) * params.ChanceBasePercent;
  const mapped = Math.max(10, Math.round(raw));
  return Math.max(0, Math.min(100, mapped));
}

// Begin action: validate 2-tick spacing, perform turn if needed
export function beginAction(state: GameState): GameState {
  if (state.captureCooldownTicksRemaining > 0) return state;
  const since = state.lastActionEndTick == null ? Infinity : (state.tick - state.lastActionEndTick);
  if (since < 2) return state;
  // On action start, mark whether a turn happens (for short action extra step rule)
  const { q: pq, r: pr } = state.protagonist;
  const { q: fq, r: fr } = state.focus;
  const dirTowardFocus = findDirectionToward(pq, pr, fq, fr);
  let turned = false;
  let nextFacing = state.facingDirIndex;
  if (!(pq === fq && pr === fr) && dirTowardFocus !== null && dirTowardFocus !== state.facingDirIndex) {
    nextFacing = dirTowardFocus;
    turned = true;
  }
  const next = {
    ...state,
    isActionMode: true,
    actionStartTick: state.tick,
    actionHeldTicks: 0,
    actionTurnedOnStart: turned,
    facingDirIndex: nextFacing,
  };
  return updateFocusPosition(next);
}

// Finalize short action: step forward if there was no turn; else nothing
export function finalizeShortAction(state: GameState, params: Params): GameState {
  const atFocus = state.protagonist.q === state.focus.q && state.protagonist.r === state.focus.r;
  let next = { ...state };
  if (!atFocus && !state.actionTurnedOnStart) {
    const dir = axialDirections[next.facingDirIndex];
    const from = next.protagonist;
    const to = { q: next.protagonist.q + dir.q, r: next.protagonist.r + dir.r };
    next = { ...next, protagonist: to };
  }
  next = { ...next, isActionMode: false, actionStartTick: null, actionHeldTicks: 0, lastActionEndTick: next.tick, actionTurnedOnStart: false };
  return updateFocusPosition(next);
}

// Finalize long action: eat if at focus and hex exists; otherwise jump up to 6 steps toward focus
export function finalizeAction(state: GameState, params: Params, rng: RNG): GameState {
  const atFocus = state.protagonist.q === state.focus.q && state.protagonist.r === state.focus.r;
  if (atFocus) {
    const cell = getCell(state.grid, state.focus);
    if (cell && cell.colorIndex !== null) {
      const eaten = attemptEatCellToInventory(state, state.focus, params, rng);
      return { ...eaten, lastActionEndTick: eaten.tick, actionTurnedOnStart: false };
    }
    // No hex: long action does nothing extra when at focus
    return { ...state, isActionMode: false, actionStartTick: null, actionHeldTicks: 0, lastActionEndTick: state.tick, actionTurnedOnStart: false };
  }
  // Jump toward focus up to 6 steps or stop at focus
  const path = computeShortestPath(state.protagonist, state.focus, params);
  const jumpLen = Math.min(6, path.length);
  let working: GameState = { ...state };
  let current = working.protagonist;
  for (let i = 0; i < jumpLen; i++) {
    const step = path[i];
    current = step;
  }
  const next = {
    ...working,
    protagonist: { q: current.q, r: current.r },
    isActionMode: false,
    actionStartTick: null,
    actionHeldTicks: 0,
    lastActionEndTick: state.tick,
    actionTurnedOnStart: false,
  };
  return next;
}

// Compute greedy shortest path from from->to (list of cells excluding start, including destination)
export function computeShortestPath(from: Axial, to: Axial, params: Params): Axial[] {
  const path: Axial[] = [];
  let cur = { q: from.q, r: from.r };
  const maxSteps = params.GridRadius * 2 + 2; // safe guard
  for (let i = 0; i < maxSteps; i++) {
    if (cur.q === to.q && cur.r === to.r) break;
    const dirIndex = findDirectionToward(cur.q, cur.r, to.q, to.r);
    if (dirIndex == null) break;
    const dir = axialDirections[dirIndex];
    const next = { q: cur.q + dir.q, r: cur.r + dir.r };
    if (!axialInDisk(params.GridRadius, next.q, next.r)) break;
    path.push(next);
    cur = next;
  }
  return path;
}

// Compute breadcrumbs path starting from facing cell toward focus
export function computeBreadcrumbs(state: GameState, params: Params): Axial[] {
  if (state.protagonist.q === state.focus.q && state.protagonist.r === state.focus.r) return [];
  const headDir = axialDirections[state.facingDirIndex];
  const start = { q: state.protagonist.q + headDir.q, r: state.protagonist.r + headDir.r };
  if (!axialInDisk(params.GridRadius, start.q, start.r)) return [];
  return computeShortestPath(start, state.focus, params);
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
