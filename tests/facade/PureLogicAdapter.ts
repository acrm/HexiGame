/**
 * PureLogicAdapter — реализация GameTestFacade поверх текущего src/logic/pureLogic.ts.
 *
 * Единственное место, которое зависит от конкретного модуля логики.
 * Все тесты пишутся против интерфейса GameTestFacade — не против этого класса.
 */

import {
  createInitialState,
  DefaultParams,
  tick as logicTick,
  attemptMoveByDelta,
  attemptMoveByDirectionIndex,
  attemptMoveTo,
  performContextAction,
  exchangeWithHotbarSlot,
  updateCells,
  getCell,
  keyOfAxial,
  mulberry32,
  type GameState,
  type Params,
  type Axial,
} from '../../src/gameLogic';

import type {
  GameTestFacade,
  FacadeParams,
  Position,
  CellInfo,
} from './GameTestFacade';

import { expect } from 'vitest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAxial(pos: Position): Axial {
  return { q: pos.q, r: pos.r };
}

function buildParams(fp: FacadeParams = {}): Params {
  const base = { ...DefaultParams };
  if (fp.gridRadius !== undefined) base.GridRadius = fp.gridRadius;
  if (fp.paletteSize !== undefined) {
    // Resize palette to requested length (use same hue series)
    base.ColorPalette = base.ColorPalette.slice(0, fp.paletteSize);
    if (base.ColorPalette.length < fp.paletteSize) {
      // Pad with extra colours if needed
      while (base.ColorPalette.length < fp.paletteSize) {
        base.ColorPalette.push('#000000');
      }
    }
  }
  if (fp.initialColorProbability !== undefined)
    base.InitialColorProbability = fp.initialColorProbability;
  if (fp.timerInitialSeconds !== undefined)
    base.TimerInitialSeconds = fp.timerInitialSeconds;
  if (fp.tickRate !== undefined) base.GameTickRate = fp.tickRate;
  return base;
}

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class PureLogicAdapter implements GameTestFacade {
  protected state!: GameState;
  protected params!: Params;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init(facadeParams: FacadeParams = {}, seed = 42): void {
    this.params = buildParams(facadeParams);
    const rng = mulberry32(seed);
    this.state = createInitialState(this.params, rng);
  }

  tick(n = 1): void {
    for (let i = 0; i < n; i++) {
      this.state = logicTick(this.state, this.params);
    }
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  moveFocusDelta(dq: number, dr: number): void {
    this.state = attemptMoveByDelta(this.state, this.params, dq, dr);
  }

  moveFocusDirection(dirIndex: number): void {
    this.state = attemptMoveByDirectionIndex(this.state, this.params, dirIndex);
  }

  moveToTarget(target: Position): void {
    this.state = attemptMoveTo(this.state, this.params, toAxial(target));
  }

  pressAction(): void {
    this.state = performContextAction(this.state, this.params);
  }

  selectHotbarSlot(index: number): void {
    this.state = { ...this.state, selectedHotbarIndex: index };
  }

  exchangeWithSlot(slotIndex: number): void {
    this.state = exchangeWithHotbarSlot(this.state, this.params, slotIndex);
  }

  setCell(pos: Position, colorIndex: number | null): void {
    const existing = getCell(this.state.grid, toAxial(pos));
    if (!existing) return; // outside grid
    this.state = {
      ...this.state,
      grid: updateCells(this.state.grid, [{ q: pos.q, r: pos.r, colorIndex }]),
    };
  }

  setProtagonistPosition(pos: Position): void {
    const { q, r } = pos;
    this.state = { ...this.state, protagonist: { q, r } };
  }

  setHotbarSlot(index: number, colorIndex: number | null): void {
    const slots = [...this.state.hotbarSlots];
    slots[index] = colorIndex;
    this.state = { ...this.state, hotbarSlots: slots };
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  getProtagonistPosition(): Position {
    return { q: this.state.protagonist.q, r: this.state.protagonist.r };
  }

  getFocusPosition(): Position {
    return { q: this.state.focus.q, r: this.state.focus.r };
  }

  getFacingDirection(): number {
    return this.state.facingDirIndex;
  }

  getFocusCell(): CellInfo | undefined {
    const cell = getCell(this.state.grid, this.state.focus);
    if (!cell) return undefined;
    return { q: cell.q, r: cell.r, colorIndex: cell.colorIndex };
  }

  getCell(pos: Position): CellInfo | undefined {
    const cell = getCell(this.state.grid, toAxial(pos));
    if (!cell) return undefined;
    return { q: cell.q, r: cell.r, colorIndex: cell.colorIndex };
  }

  getHotbarSlots(): Array<number | null> {
    return [...this.state.hotbarSlots];
  }

  getSelectedHotbarIndex(): number {
    return this.state.selectedHotbarIndex;
  }

  getTick(): number {
    return this.state.tick;
  }

  getRemainingSeconds(): number {
    return this.state.remainingSeconds;
  }

  getColoredCells(): CellInfo[] {
    const result: CellInfo[] = [];
    for (const cell of this.state.grid.values()) {
      if (cell.colorIndex !== null) {
        result.push({ q: cell.q, r: cell.r, colorIndex: cell.colorIndex });
      }
    }
    return result;
  }

  getTotalColorCount(): number {
    let count = 0;
    for (const cell of this.state.grid.values()) {
      if (cell.colorIndex !== null) count++;
    }
    for (const slot of this.state.hotbarSlots) {
      if (slot !== null) count++;
    }
    return count;
  }

  isAutoMoving(): boolean {
    return !!this.state.autoMoveTarget;
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  assertColorConservation(expectedTotal: number): void {
    const actual = this.getTotalColorCount();
    expect(actual).toBe(expectedTotal);
  }
}
