import type { Cell, GameState } from '../core/types';
import type { Params } from '../core/params';
import { getCell } from '../core/grid';
import type { RNG } from '../core/types';

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

  if (maxDist === 0) return params.ChanceBasePercent;
  if (dist === maxDist) return 0;
  if (dist === 0) return params.ChanceBasePercent;

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
