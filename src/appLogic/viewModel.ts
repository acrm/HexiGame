/**
 * viewModel — transforms GameState into a flat, UI-ready data structure.
 *
 * `buildGameViewModel` is the single point where derived UI data is computed.
 * React components receive a `GameViewModel` and never import game-logic
 * functions directly — this keeps the UI layer pure and easy to test.
 *
 * Phase 8 deliverable (architecture plan section 7.2).
 */

import type { GameState, Axial, Cell } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { computeCaptureChancePercent } from '../gameLogic/systems/capture';

// ─── Cell View ────────────────────────────────────────────────────────────────

export interface CellView {
  q: number;
  r: number;
  colorIndex: number | null;
}

// ─── GameViewModel ────────────────────────────────────────────────────────────

export interface GameViewModel {
  /** Current simulation tick. */
  tick: number;

  /** Remaining timer seconds. */
  remainingSeconds: number;

  /** Whether the inventory field is active (false = world field). */
  isInventory: boolean;

  /** Protagonist position. */
  protagonist: Axial;

  /** Focus cell position. */
  focus: Axial;

  /** Protagonist facing direction index (0–5). */
  facingDirIndex: number;

  /** Color index of the hex at the world focus cell, or null if empty. */
  hoverWorldColorIndex: number | null;

  /** Color index of the hex at the inventory focus cell, or null if empty. */
  hoverInventoryColorIndex: number | null;

  /** Capture chance (0–100) for the hex under focus, or null if focus is empty. */
  captureChancePercent: number | null;

  /** Whether carry-flicker is currently in the "on" phase. */
  isCarryFlickerOn: boolean;

  /** Color palette hex strings. */
  colorPalette: string[];

  /** Hotbar slot contents (null = empty). */
  hotbarSlots: Array<number | null>;

  /** Currently selected hotbar slot index. */
  selectedHotbarIndex: number;

  /** Flat array of all world grid cells (for rendering). */
  worldCells: CellView[];

  /** Flat array of all inventory grid cells (for rendering). */
  inventoryCells: CellView[];

  /** Center of the visible world viewport. */
  worldViewCenter: Axial;

  /** Whether protagonist is performing auto-movement. */
  isAutoMoving: boolean;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Derives the complete UI view model from the pure game state.
 *
 * This is a pure function: same inputs always produce the same output.
 * Call it once per render cycle, cache the result, pass it to components.
 */
export function buildGameViewModel(
  state: GameState,
  params: Params,
): GameViewModel {
  const isInventory = state.activeField === 'inventory';

  // Focus cell color indices
  const worldFocusCell: Cell | undefined = state.grid.get(`${state.focus.q},${state.focus.r}`);
  const invFocusCell: Cell | undefined = state.inventoryGrid.get(`${state.focus.q},${state.focus.r}`);
  const hoverWorldColorIndex = worldFocusCell?.colorIndex ?? null;
  const hoverInventoryColorIndex = invFocusCell?.colorIndex ?? null;

  // Capture chance for world focus
  const focusColorIndex = isInventory ? hoverInventoryColorIndex : hoverWorldColorIndex;
  const captureChancePercent =
    focusColorIndex !== null
      ? computeCaptureChancePercent(params, focusColorIndex)
      : null;

  // Carry-flicker: cycles based on tick
  const flickerCycle = params.CarryFlickerCycleTicks;
  const flickerOn = params.CarryFlickerOnFraction;
  const phase = (state.tick % flickerCycle) / flickerCycle;
  const isCarryFlickerOn = phase < flickerOn;

  // Flatten grids into arrays
  const worldCells: CellView[] = [];
  for (const cell of state.grid.values()) {
    worldCells.push({ q: cell.q, r: cell.r, colorIndex: cell.colorIndex });
  }

  const inventoryCells: CellView[] = [];
  for (const cell of state.inventoryGrid.values()) {
    inventoryCells.push({ q: cell.q, r: cell.r, colorIndex: cell.colorIndex });
  }

  return {
    tick: state.tick,
    remainingSeconds: state.remainingSeconds,
    isInventory,
    protagonist: { ...state.protagonist },
    focus: { ...state.focus },
    facingDirIndex: state.facingDirIndex,
    hoverWorldColorIndex,
    hoverInventoryColorIndex,
    captureChancePercent,
    isCarryFlickerOn,
    colorPalette: params.ColorPalette,
    hotbarSlots: [...state.hotbarSlots],
    selectedHotbarIndex: state.selectedHotbarIndex,
    worldCells,
    inventoryCells,
    worldViewCenter: { ...(state.worldViewCenter ?? state.protagonist) },
    isAutoMoving: !!state.autoMoveTarget,
  };
}
