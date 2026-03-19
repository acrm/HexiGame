/**
 * movement.test.ts — tests for focus and protagonist movement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFacade,
  emptyParams,
  DIR_UP,
  DIR_DOWN,
  DIR_UP_RIGHT,
  DIR_DOWN_LEFT,
  DIR_UP_LEFT,
  DIR_DOWN_RIGHT,
} from './facade/testHelpers';
import type { GameTestFacade } from './facade/GameTestFacade';
import {
  axialDirections,
  attemptMoveTo,
  createInitialState,
  DefaultParams,
  dragMoveProtagonist,
  mulberry32,
  startDrag,
  tick as logicTick,
  updateCells,
} from '../src/gameLogic';

function createEmptyWorldState() {
  const params = {
    ...DefaultParams,
    InitialColorProbability: 0,
  };

  return {
    params,
    state: createInitialState(params, mulberry32(42)),
  };
}

describe('Focus movement by delta', () => {
  let g: GameTestFacade;

  beforeEach(() => {
    g = createFacade(emptyParams);
  });

  it('focus moves down (dq=0, dr=+1) from current position', () => {
    // Initial focus is always adjacent to protagonist
    const before = g.getFocusPosition();
    // Move focus in one of 6 directions
    g.moveFocusDelta(0, 1); // down
    const after = g.getFocusPosition();
    // Focus should change
    expect(after).not.toEqual(before);
  });

  it('moveFocusDelta ignores non-adjacent delta', () => {
    const before = g.getFocusPosition();
    // (2, 0) — not a unit hex step
    g.moveFocusDelta(2, 0);
    expect(g.getFocusPosition()).toEqual(before);
  });

  it('moveFocusDirection changes facing direction', () => {
    g.moveFocusDirection(DIR_DOWN);
    expect(g.getFacingDirection()).toBe(DIR_DOWN);
  });

  it('moveFocusDirection normalizes dir > 5', () => {
    g.moveFocusDirection(6); // 6 % 6 = 0 = UP
    expect(g.getFacingDirection()).toBe(DIR_UP);
  });

  it('moveFocusDirection normalizes negative dir', () => {
    g.moveFocusDirection(-1); // should become 5 (UP_LEFT)
    expect(g.getFacingDirection()).toBe(DIR_UP_LEFT);
  });

  it('focus is always adjacent to protagonist after regular movement', () => {
    for (const dir of [DIR_UP, DIR_DOWN, DIR_UP_RIGHT, DIR_DOWN_LEFT, DIR_UP_LEFT, DIR_DOWN_RIGHT]) {
      g.moveFocusDirection(dir);
      const prot = g.getProtagonistPosition();
      const focus = g.getFocusPosition();
      // hex-distance should be 1
      const dist = (Math.abs(focus.q - prot.q) + Math.abs(focus.r - prot.r) +
        Math.abs((-focus.q - focus.r) - (-prot.q - prot.r))) / 2;
      expect(dist).toBe(1);
    }
  });
});

describe('Auto-move to target', () => {
  it('moveToTarget activates auto-move', () => {
    const g = createFacade(emptyParams);
    g.moveToTarget({ q: 3, r: 0 });
    expect(g.isAutoMoving()).toBe(true);
  });

  it('after sufficient ticks protagonist approaches target', () => {
    const g = createFacade(emptyParams);
    // Start from (0,0), move to (3, 0)
    g.moveToTarget({ q: 3, r: 0 });
    // Every 2 ticks = 1 step, 3 steps = 6 ticks + margin
    g.tick(20);
    expect(g.isAutoMoving()).toBe(false);
  });

  it('moveToTarget rejects unreachable target outside generated world', () => {
    const { params } = createEmptyWorldState();
    let state = createInitialState(params, mulberry32(7));

    state = attemptMoveTo(state, params, { q: 10, r: 10 });

    expect(state.autoFocusTarget).toBeNull();
    expect(state.invalidMoveTarget?.position).toEqual({ q: 10, r: 10 });
  });

  it('protagonist stays in place without auto-move during ticks', () => {
    const g = createFacade(emptyParams);
    const before = g.getProtagonistPosition();
    g.tick(10);
    // Without autoMove protagonist does not move
    expect(g.getProtagonistPosition()).toEqual(before);
  });

  it('focus lands on target cell after auto-move (straight line)', () => {
    const g = createFacade(emptyParams);
    const targetFocus = { q: 5, r: 0 };
    g.moveToTarget(targetFocus);
    g.tick(20); // Allow enough time to complete movement
    expect(g.isAutoMoving()).toBe(false);
    expect(g.getFocusPosition()).toEqual(targetFocus);
  });

  it('focus lands on target cell after auto-move (diagonal)', () => {
    const g = createFacade(emptyParams);
    const targetFocus = { q: 3, r: 3 };
    g.moveToTarget(targetFocus);
    g.tick(20);
    expect(g.isAutoMoving()).toBe(false);
    expect(g.getFocusPosition()).toEqual(targetFocus);
  });

  it('focus lands on target cell after auto-move (negative coords)', () => {
    const g = createFacade(emptyParams);
    const targetFocus = { q: -4, r: 2 };
    g.moveToTarget(targetFocus);
    g.tick(20);
    expect(g.isAutoMoving()).toBe(false);
    expect(g.getFocusPosition()).toEqual(targetFocus);
  });

  it('focus lands on target cell from various starting directions', () => {
    const testCases = [
      { target: { q: 3, r: 0 } },   // Right
      { target: { q: -3, r: 0 } },  // Left
      { target: { q: 0, r: 3 } },   // Down
      { target: { q: 0, r: -3 } },  // Up
      { target: { q: 2, r: 2 } },   // Down-right diagonal
      { target: { q: -2, r: -2 } }, // Up-left diagonal
    ];

    for (const testCase of testCases) {
      const g = createFacade(emptyParams);
      g.moveToTarget(testCase.target);
      g.tick(20);
      expect(g.isAutoMoving()).toBe(false);
      expect(g.getFocusPosition()).toEqual(testCase.target);
    }
  });
});

describe('Facing direction rotation', () => {
  it('all 6 directions are set correctly', () => {
    const g = createFacade(emptyParams);
    for (let d = 0; d < 6; d++) {
      g.moveFocusDirection(d);
      expect(g.getFacingDirection()).toBe(d);
    }
  });
});

describe('Blocked world pathing', () => {
  it('finds a detour around blocking colored hexes', () => {
    const { params, state: initialState } = createEmptyWorldState();
    let state = {
      ...initialState,
      grid: updateCells(initialState.grid, [
        { q: 1, r: 0, colorIndex: 1 },
        { q: 2, r: 0, colorIndex: 1 },
      ]),
    };

    state = attemptMoveTo(state, params, { q: 3, r: 0 });
    expect(state.autoFocusTarget).toEqual({ q: 3, r: 0 });
    expect(state.autoMovePath && state.autoMovePath.length).toBeGreaterThan(0);

    for (let step = 0; step < 30; step++) {
      state = logicTick(state, params);
    }

    expect(state.autoFocusTarget).toBeNull();
    expect(state.focus).toEqual({ q: 3, r: 0 });
  });

  it('allows auto-move to a colored target if an adjacent free approach cell exists', () => {
    const { params, state: initialState } = createEmptyWorldState();
    let state = {
      ...initialState,
      grid: updateCells(initialState.grid, [{ q: 3, r: 0, colorIndex: 2 }]),
    };

    state = attemptMoveTo(state, params, { q: 3, r: 0 });

    expect(state.autoFocusTarget).toEqual({ q: 3, r: 0 });
    expect(state.invalidMoveTarget).toBeNull();
  });

  it('marks target invalid when no adjacent approach cell is reachable', () => {
    const { params, state: initialState } = createEmptyWorldState();
    const target = { q: 3, r: 0 };
    const blockedCells = [
      { q: target.q, r: target.r, colorIndex: 2 },
      ...axialDirections.map((dir, index) => ({
        q: target.q + dir.q,
        r: target.r + dir.r,
        colorIndex: (index % 3) + 1,
      })),
    ];
    let state = {
      ...initialState,
      grid: updateCells(initialState.grid, blockedCells),
    };

    state = attemptMoveTo(state, params, target);

    expect(state.autoFocusTarget).toBeNull();
    expect(state.invalidMoveTarget?.position).toEqual(target);
  });

  it('blocks dragging the turtle into a colored hex', () => {
    const { params, state: initialState } = createEmptyWorldState();
    let state = {
      ...initialState,
      grid: updateCells(initialState.grid, [{ q: 1, r: -1, colorIndex: 4 }]),
    };

    state = startDrag(state);
    state = dragMoveProtagonist(state, params, 1, -1);

    expect(state.protagonist).toEqual({ q: 0, r: 0 });
    expect(state.invalidMoveTarget?.position).toEqual({ q: 1, r: -1 });
  });
});
