import type { Axial, GameState } from '../core/types';
import type { Params } from '../core/params';
import {
  axialDirections,
  addAxial,
  axialInDisk,
  axialDistance,
  getCell,
  findDirectionToward,
  ensureGeneratedAround,
  updateWorldViewCenter,
} from '../core/grid';

export function rotateFacing(state: GameState, deltaSteps: number): GameState {
  const dir = ((state.facingDirIndex + deltaSteps) % 6 + 6) % 6;
  return { ...state, facingDirIndex: dir };
}

export function updateFocusPosition(state: GameState): GameState {
  if (state.isDragging) return state;
  const dir = axialDirections[state.facingDirIndex];
  const newFocus = addAxial(state.protagonist, dir);
  return { ...state, focus: newFocus };
}

export function startAutoMove(state: GameState, target: Axial, params: Params): GameState {
  if (state.isDragging) return state;

  let bestProtagonistPos: Axial | null = null;
  let bestDir = 0;
  let minDist = Infinity;

  for (let dirIdx = 0; dirIdx < 6; dirIdx++) {
    const dir = axialDirections[dirIdx];
    const candidatePos = { q: target.q - dir.q, r: target.r - dir.r };

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

export function startDrag(state: GameState): GameState {
  return { ...state, isDragging: true, autoMoveTarget: null };
}

export function endDrag(state: GameState): GameState {
  return updateFocusPosition({ ...state, isDragging: false });
}

export function dragMoveProtagonist(state: GameState, params: Params, dq: number, dr: number): GameState {
  if (!state.isDragging) return state;

  const dist = Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr);
  if (dist !== 2) return state;

  const newPos = { q: state.protagonist.q + dq, r: state.protagonist.r + dr };
  const newFocus = { q: state.focus.q + dq, r: state.focus.r + dr };

  const dirIndex = axialDirections.findIndex(d => d.q === dq && d.r === dr);
  if (dirIndex !== -1) {
    const moved = { ...state, protagonist: newPos, focus: newFocus, facingDirIndex: dirIndex };
    return updateWorldViewCenter(ensureGeneratedAround(moved, params), params);
  }

  const moved = { ...state, protagonist: newPos, focus: newFocus };
  return updateWorldViewCenter(ensureGeneratedAround(moved, params), params);
}

export function attemptMoveByDirectionIndex(state: GameState, params: Params, dirIndex: number): GameState {
  if (state.isDragging || state.autoMoveTarget) return state;
  const normIndex = ((dirIndex % 6) + 6) % 6;
  const next = { ...state, facingDirIndex: normIndex };
  return updateFocusPosition(next);
}

export function attemptMoveByDelta(state: GameState, params: Params, dq: number, dr: number): GameState {
  if (state.isDragging || state.autoMoveTarget) return state;
  const target = { q: state.focus.q + dq, r: state.focus.r + dr };
  const matchedIndex = axialDirections.findIndex(
    d => state.focus.q + d.q === target.q && state.focus.r + d.r === target.r,
  );
  if (matchedIndex === -1) return state;
  const nextState: GameState = { ...state, facingDirIndex: matchedIndex };
  return updateFocusPosition(nextState);
}

export function attemptMoveByDeltaOnActive(state: GameState, params: Params, dq: number, dr: number): GameState {
  return attemptMoveByDelta(state, params, dq, dr);
}

export function attemptMoveTo(state: GameState, params: Params, target: Axial): GameState {
  return startAutoMove(state, target, params);
}

export function attemptMoveToOnActive(state: GameState, params: Params, target: Axial): GameState {
  const usingInventory = state.activeField === 'inventory';
  if (usingInventory && !axialInDisk(3, target.q, target.r)) return state;
  const grid = usingInventory ? state.inventoryGrid : state.grid;
  const targetCell = getCell(grid, target);
  if (!targetCell) return state;
  return startAutoMove(state, target, params);
}

export function computeShortestPath(from: Axial, to: Axial, params: Params): Axial[] {
  const path: Axial[] = [];
  let cur = { q: from.q, r: from.r };
  const maxSteps = axialDistance(from, to) + 2;
  for (let i = 0; i < maxSteps; i++) {
    if (cur.q === to.q && cur.r === to.r) break;
    const dirIndex = findDirectionToward(cur.q, cur.r, to.q, to.r);
    if (dirIndex == null) break;
    const dir = axialDirections[dirIndex];
    const next = { q: cur.q + dir.q, r: cur.r + dir.r };
    path.push(next);
    cur = next;
  }
  return path;
}

export function computeBreadcrumbs(state: GameState, params: Params): Axial[] {
  if (state.protagonist.q === state.focus.q && state.protagonist.r === state.focus.r) return [];
  const headDir = axialDirections[state.facingDirIndex];
  const start = { q: state.protagonist.q + headDir.q, r: state.protagonist.r + headDir.r };
  return computeShortestPath(start, state.focus, params);
}
