import type { GameState } from '../core/types';
import type { Params } from '../core/params';
import { getCell, updateCells } from '../core/grid';
import { updateTemplateState } from './template';

export function eatToHotbar(state: GameState, params: Params): GameState {
  const cell = getCell(state.grid, state.focus);
  if (!cell || cell.colorIndex === null) return state;

  const colorIndex = cell.colorIndex;
  const slotIdx = Math.max(0, Math.min(5, state.selectedHotbarIndex));
  const nextGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }]);

  let nextSlots = [...state.hotbarSlots];
  let nextGridFinal = nextGrid;

  let targetSlot = -1;
  let minDist = Infinity;
  for (let i = 0; i < nextSlots.length; i++) {
    if (nextSlots[i] !== null) continue;
    let dist = Math.abs(i - slotIdx);
    dist = Math.min(dist, 6 - dist);
    if (dist < minDist) {
      minDist = dist;
      targetSlot = i;
    }
  }

  if (targetSlot !== -1) {
    nextSlots[targetSlot] = colorIndex;
  } else {
    const occupiedHex = nextSlots[slotIdx];
    nextSlots[slotIdx] = colorIndex;

    if (occupiedHex !== null && occupiedHex !== undefined) {
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

  if (nextState.activeTemplate && nextGridFinal !== state.grid) {
    const { state: updatedState } = updateTemplateState(nextState, params);
    return updatedState;
  }

  return nextState;
}

export function exchangeWithHotbarSlot(state: GameState, params: Params, slotIdx: number): GameState {
  if (slotIdx < 0 || slotIdx >= 6) return state;

  const slotValue = state.hotbarSlots[slotIdx];
  const focusCell = getCell(state.grid, state.focus);
  if (!focusCell) return state;

  const focusHasHex = focusCell.colorIndex !== null;
  const slotHasHex = slotValue !== null && slotValue !== undefined;

  let nextState = state;

  if (!slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    nextSlots[slotIdx] = focusCell.colorIndex;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: null }]);
    nextState = { ...state, hotbarSlots: nextSlots, grid: nextGrid, selectedHotbarIndex: slotIdx };
  } else if (slotHasHex && !focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const colorIndex = slotValue as number;
    nextSlots[slotIdx] = null;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex }]);
    nextState = { ...state, hotbarSlots: nextSlots, grid: nextGrid, selectedHotbarIndex: slotIdx };
  } else if (slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const temp = focusCell.colorIndex;
    nextSlots[slotIdx] = temp;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: slotValue as number }]);
    nextState = { ...state, hotbarSlots: nextSlots, grid: nextGrid, selectedHotbarIndex: slotIdx };
  }

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

  if (!slotHasHex && focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    nextSlots[slotIdx] = focusCell.colorIndex;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex: null }]);
    nextState = { ...state, hotbarSlots: nextSlots, grid: nextGrid };
  } else if (slotHasHex && !focusHasHex) {
    const nextSlots = [...state.hotbarSlots];
    const colorIndex = slotValue as number;
    nextSlots[slotIdx] = null;
    const nextGrid = updateCells(state.grid, [{ ...focusCell, colorIndex }]);
    nextState = { ...state, hotbarSlots: nextSlots, grid: nextGrid };
  }

  if (nextState !== state && nextState.activeTemplate) {
    const { state: updatedState } = updateTemplateState(nextState, params);
    return updatedState;
  }

  return nextState;
}

export function performContextAction(state: GameState, params: Params): GameState {
  if (state.activeField !== 'world') return state;
  if (state.isDragging || state.autoMoveTarget) return state;

  const afterTransfer = performHotbarTransfer(state, params);
  if (afterTransfer !== state) return afterTransfer;

  const cell = getCell(state.grid, state.focus);
  if (cell && cell.colorIndex !== null) {
    return eatToHotbar(state, params);
  }

  return state;
}
