// Pure, functional game logic for the Color Cell prototype
// No DOM/Canvas, immutable updates, tick-based timing (12 ticks/sec)

import type { ActiveTemplateState } from '../templates/templateTypes';
import {
  validateTemplate,
  isTemplateCompleted,
  isTemplateEmpty,
  determineTemplateAnchor,
} from '../templates/templateLogic';
import { getTemplateById } from '../templates/templateLibrary';
import type { BuildTemplate } from '../templates/templateTypes';

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
  flash: FlashState | null;
  grid: Grid;
  inventoryGrid: Grid;
  activeField?: 'world' | 'inventory';
  hotbarSlots: Array<number | null>;
  selectedHotbarIndex: number;
  facingDirIndex: number; // 0..5, protagonist facing direction
  isDragging?: boolean; // true when user is dragging protagonist/focus
  autoMoveTarget?: Axial | null; // target cell for automatic movement
  autoMoveTicksRemaining?: number; // ticks until next auto move step (2 ticks per step)
  autoFocusTarget?: Axial | null; // destination focus cell to highlight while moving
  
  // Tutorial system
  tutorialLevelId?: string | null; // Current tutorial level ID, null if no tutorial
  tutorialProgress?: {
    visitedTargetKeys: Set<string>; // Target cells visited in format "q,r"
    startTick: number;          // Tick when the level started
    completedAtTick?: number;   // Tick when the level completed
  };
  tutorialInteractionMode?: 'desktop' | 'mobile'; // Control mode for hints
  tutorialCompletedLevelIds?: Set<string>; // Completed tutorial level IDs
  
  // Build Template system
  activeTemplate?: ActiveTemplateState | null;
  completedTemplates?: Set<string>;  // IDs of completed templates
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

// Alias for compatibility with template system
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
  // Inventory grid: small fixed grid with radius 3
  const inv: Grid = new Map();
  const invRadius = 3;
  for (let q = -invRadius; q <= invRadius; q++) {
    for (let r = -invRadius; r <= invRadius; r++) {
      if (!axialInDisk(invRadius, q, r)) continue;
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
    flash: null,
    inventoryGrid: inv,
    activeField: 'world',
    hotbarSlots: [null, null, null, null, null, null],
    selectedHotbarIndex: 0,
    facingDirIndex: 0,
    grid,
    isDragging: false,
    autoMoveTarget: null,
    autoMoveTicksRemaining: 0,
    autoFocusTarget: null,
    tutorialCompletedLevelIds: new Set(),
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


// ---------- Core Tick ----------
export function tick(state: GameState, params: Params, rng?: RNG): GameState {
  let next: GameState = { ...state, tick: state.tick + 1 };

  // Clear flash after duration
  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null };
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

// ---------- Capture Flow (REMOVED - all actions are instant) ----------

// Eat to hotbar: central slot (index 3) always remains empty, eaten hex goes to nearest empty slot
// If another slot selected, eaten hex goes there; if that slot had hex, it's placed in world
export function eatToHotbar(state: GameState, params: Params): GameState {
  const cell = getCell(state.grid, state.focus);
  if (!cell || cell.colorIndex === null) {
    return state; // No hex to eat
  }

  const colorIndex = cell.colorIndex;
  const slotIdx = Math.max(0, Math.min(5, state.selectedHotbarIndex));
  const nextGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }]);

  let nextSlots = [...state.hotbarSlots];
  let nextGridFinal = nextGrid;

  // Find nearest empty slot
  let targetSlot = -1;
  let minDist = Infinity;
  for (let i = 0; i < nextSlots.length; i++) {
    if (nextSlots[i] !== null) continue; // Skip occupied slots
    // Prefer closer slots (distance based on slot index, modulo ring distance)
    let dist = Math.abs(i - slotIdx);
    dist = Math.min(dist, 6 - dist); // Ring distance
    if (dist < minDist) {
      minDist = dist;
      targetSlot = i;
    }
  }

  if (targetSlot !== -1) {
    // Place hex in nearest empty slot
    nextSlots[targetSlot] = colorIndex;
  } else {
    // No empty slots: replace the selected slot (exchange)
    const occupiedHex = nextSlots[slotIdx];
    nextSlots[slotIdx] = colorIndex;
    
    if (occupiedHex !== null && occupiedHex !== undefined) {
      // Place old hex back to focus
      const focusCell = getCell(nextGrid, state.focus);
      if (focusCell) {
        nextGridFinal = updateCells(nextGrid, [{ ...focusCell, colorIndex: occupiedHex }]);
      }
    }
  }

  const nextState = {
    ...state,
    grid: nextGridFinal,
    hotbarSlots: nextSlots,
  };

  // Update template state if grid changed
  if (nextState.activeTemplate && nextGridFinal !== state.grid) {
    const { state: updatedState } = updateTemplateState(nextState, params);
    return updatedState;
  }

  return nextState;
}

// ---------- Context Action (instant, no mode needed) ----------

// Perform instant context action at focus: transfer if moving, or eat if stationary
export function performContextAction(state: GameState, params: Params): GameState {
  if (state.activeField !== 'world') return state;
  if (state.isDragging || state.autoMoveTarget) return state; // Don't act while moving
  
  // Try transfer first (swap hotbar slot with focus hex)
  const afterTransfer = performHotbarTransfer(state, params);
  if (afterTransfer !== state) return afterTransfer;
  
  // If no transfer, try eat (consume hex at focus into hotbar)
  const cell = getCell(state.grid, state.focus);
  if (cell && cell.colorIndex !== null) {
    return eatToHotbar(state, params);
  }
  
  return state;
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

// Chance by distance between player base color and target color
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

// Deprecated: use performContextAction instead
export function beginAction(state: GameState): GameState {
  return state;
}

// Deprecated: use performContextAction instead  
export function handleActionRelease(state: GameState, params: Params, rng: RNG): GameState {
  return state;
}

// Hotbar slot click: exchange/absorb hex with specific slot
export function exchangeWithHotbarSlot(state: GameState, params: Params, slotIdx: number): GameState {
  if (slotIdx < 0 || slotIdx >= 6) return state;
  
  const slotValue = state.hotbarSlots[slotIdx];
  const focusCell = getCell(state.grid, state.focus);
  if (!focusCell) return state;

  const focusHasHex = focusCell.colorIndex !== null;
  const slotHasHex = slotValue !== null && slotValue !== undefined;

  let nextState = state;

  // If slot is empty and focus has hex: absorb to slot
  if (!slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    nextSlots[slotIdx] = focusCell.colorIndex;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: null }]);
    nextState = {
      ...state,
      hotbarSlots: nextSlots,
      grid: nextGrid,
      selectedHotbarIndex: slotIdx,
    };
  }
  // If slot has hex and focus is empty: take from slot
  else if (slotHasHex && !focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const colorIndex = slotValue as number;
    nextSlots[slotIdx] = null;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex }]);
    nextState = {
      ...state,
      hotbarSlots: nextSlots,
      grid: nextGrid,
      selectedHotbarIndex: slotIdx,
    };
  }
  // If both have hex: exchange
  else if (slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const temp = focusCell.colorIndex;
    nextSlots[slotIdx] = temp;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: slotValue as number }]);
    nextState = {
      ...state,
      hotbarSlots: nextSlots,
      grid: nextGrid,
      selectedHotbarIndex: slotIdx,
    };
  }

  // Update template state if grid changed
  if (nextState !== state && nextState.activeTemplate) {
    const { state: updatedState } = updateTemplateState(nextState, params);
    return updatedState;
  }

  return nextState;
}

function performHotbarTransfer(state: GameState, params: Params): GameState {
  const slotIdx = Math.max(0, Math.min(5, state.selectedHotbarIndex));
  
  const slotValue = state.hotbarSlots[slotIdx];
  const focusCell = getCell(state.grid, state.focus);
  if (!focusCell) return state;

  const focusHasHex = focusCell.colorIndex !== null;
  const slotHasHex = slotValue !== null && slotValue !== undefined;

  let nextState = state;

  // Move from focus to hotbar if slot empty and focus has hex
  if (!slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    nextSlots[slotIdx] = focusCell.colorIndex;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: null }]);
    nextState = {
      ...state,
      hotbarSlots: nextSlots,
      grid: nextGrid,
    };
  }
  // Move from hotbar to focus if slot filled and focus empty
  else if (slotHasHex && !focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const colorIndex = slotValue as number;
    nextSlots[slotIdx] = null;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex }]);
    nextState = {
      ...state,
      hotbarSlots: nextSlots,
      grid: nextGrid,
    };
  }

  // Update template state if grid changed
  if (nextState !== state && nextState.activeTemplate) {
    const { state: updatedState } = updateTemplateState(nextState, params);
    return updatedState;
  }

  return nextState;
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

// ---------- Build Template System ----------

/**
 * Activate a build template (enters flickering mode, attached to focus)
 */
export function activateTemplate(state: GameState, templateId: string): GameState {
  const template = getTemplateById(templateId);
  if (!template) return state;
  
  return {
    ...state,
    activeTemplate: {
      templateId,
      anchoredAt: null, // Starts in flickering mode
      hasErrors: false,
      filledCells: new Set(),
    },
    completedTemplates: state.completedTemplates || new Set(),
  };
}

/**
 * Deactivate current template
 */
export function deactivateTemplate(state: GameState): GameState {
  return {
    ...state,
    activeTemplate: null,
  };
}

/**
 * Update template state after a hex is placed or removed
 * Should be called after any grid modification
 */
export function updateTemplateState(
  state: GameState,
  params: Params
): { state: GameState; event?: 'cell_correct' | 'cell_wrong' | 'template_completed' } {
  if (!state.activeTemplate) return { state };
  
  const template = getTemplateById(state.activeTemplate.templateId);
  if (!template) return { state };
  
  let nextState = { ...state };
  let event: 'cell_correct' | 'cell_wrong' | 'template_completed' | undefined;
  
  // If not yet anchored, check if we should anchor
  if (!state.activeTemplate.anchoredAt) {
    // Check if a hex was placed at focus position
    const focusCell = getCell(state.grid, state.focus);
    if (focusCell && focusCell.colorIndex !== null) {
      // Try to anchor the template
      const anchor = determineTemplateAnchor(
        template,
        state.focus,
        focusCell.colorIndex,
        state.focus,
        state.facingDirIndex
      );
      
      if (anchor) {
        // Template is now anchored
        nextState = {
          ...nextState,
          activeTemplate: {
            ...state.activeTemplate,
            anchoredAt: {
              q: anchor.anchorPos.q,
              r: anchor.anchorPos.r,
              baseColorIndex: anchor.baseColorIndex,
              rotation: state.facingDirIndex,
            },
            filledCells: new Set([axialToKey(state.focus)]),
          },
        };
        event = 'cell_correct';
      }
    }
  } else {
    // Template is anchored, validate it
    const validation = validateTemplate(
      template,
      state.activeTemplate.anchoredAt,
      state.activeTemplate.anchoredAt.baseColorIndex,
      state.activeTemplate.anchoredAt.rotation,
      state.grid,
      params.ColorPalette.length
    );
    
    const previousErrors = state.activeTemplate.hasErrors;
    const previousFilledCount = state.activeTemplate.filledCells.size;
    const newFilledCount = validation.correctCells.length;
    
    // Check if template should reset to flickering (all cells empty)
    if (isTemplateEmpty(
      template,
      state.activeTemplate.anchoredAt,
      state.activeTemplate.anchoredAt.rotation,
      state.grid
    )) {
      nextState = {
        ...nextState,
        activeTemplate: {
          ...state.activeTemplate,
          anchoredAt: null,
          hasErrors: false,
          filledCells: new Set(),
        },
      };
    } else {
      // Update template state with validation results
      nextState = {
        ...nextState,
        activeTemplate: {
          ...state.activeTemplate,
          hasErrors: validation.hasErrors,
          filledCells: new Set(validation.correctCells),
        },
      };
      
      // Determine event
      if (newFilledCount > previousFilledCount) {
        event = validation.hasErrors ? 'cell_wrong' : 'cell_correct';
      } else if (!previousErrors && validation.hasErrors) {
        event = 'cell_wrong';
      }
      
      // Check if completed
      if (isTemplateCompleted(
        template,
        state.activeTemplate.anchoredAt,
        state.activeTemplate.anchoredAt.baseColorIndex,
        state.activeTemplate.anchoredAt.rotation,
        state.grid,
        params.ColorPalette.length
      )) {
        const completedTemplates = new Set(state.completedTemplates || []);
        completedTemplates.add(template.id);
        nextState = {
          ...nextState,
          activeTemplate: {
            ...nextState.activeTemplate!,
            completedAtTick: state.tick,
          },
          completedTemplates,
        };
        event = 'template_completed';
      }
    }
  }
  
  return { state: nextState, event };
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
