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

describe('Focus movement by delta', () => {
  let g: GameTestFacade;

  beforeEach(() => {
    g = createFacade(emptyParams);
  });

  it('focus moves down (dq=0, dr=+1) from current position', () => {
    // Initial focus: (0, -1) — directly in front of protagonist (UP direction)
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

  it('moveToTarget far from center is allowed in infinite world', () => {
    const g = createFacade({ ...emptyParams, gridRadius: 3 });
    g.moveToTarget({ q: 10, r: 10 });
    expect(g.isAutoMoving()).toBe(true);
  });

  it('protagonist stays in place without auto-move during ticks', () => {
    const g = createFacade(emptyParams);
    const before = g.getProtagonistPosition();
    g.tick(10);
    // Without autoMove protagonist does not move
    expect(g.getProtagonistPosition()).toEqual(before);
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
