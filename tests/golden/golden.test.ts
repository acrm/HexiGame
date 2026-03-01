/**
 * golden.test.ts — regression prevention via deterministic scenario snapshots.
 *
 * Each test runs a fixed sequence of actions with seed=42 and compares the
 * resulting state to a stored snapshot.  If the snapshot does not exist yet,
 * Vitest creates it on first run; subsequent runs fail on any deviation.
 *
 * Golden tests protect against silent regressions across refactoring phases.
 */

import { describe, it, expect } from 'vitest';
import { createFacade, createAppFacade, emptyParams, denseParams, DIR_UP, DIR_DOWN, DIR_UP_RIGHT } from '../facade/testHelpers';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Serialise only stable, deterministic parts of the facade state. */
function snapshot(g: ReturnType<typeof createFacade>) {
  return {
    tick: g.getTick(),
    remainingSeconds: g.getRemainingSeconds(),
    protagonist: g.getProtagonistPosition(),
    focus: g.getFocusPosition(),
    facingDirection: g.getFacingDirection(),
    hotbarSlots: g.getHotbarSlots(),
    selectedHotbarIndex: g.getSelectedHotbarIndex(),
    isAutoMoving: g.isAutoMoving(),
    totalColorCount: g.getTotalColorCount(),
  };
}

// ── Scenario 1: Empty grid, 20 ticks ──────────────────────────────────────

describe('Golden: empty grid progression', () => {
  it('matches snapshot after 20 ticks (seed=42, emptyParams)', () => {
    const g = createFacade(emptyParams, 42);
    g.tick(20);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 2: Dense grid, 12 ticks ──────────────────────────────────────

describe('Golden: dense grid progression', () => {
  it('matches snapshot after 12 ticks (seed=42, denseParams)', () => {
    const g = createFacade(denseParams, 42);
    g.tick(12);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 3: Eat then move ──────────────────────────────────────────────

describe('Golden: eat + move sequence', () => {
  it('matches snapshot after eat then direction change (seed=42)', () => {
    const g = createFacade(emptyParams, 42);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 2);
    g.pressAction(); // eat color 2 into hotbar
    g.moveFocusDirection(DIR_DOWN);
    g.tick(5);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 4: Exchange sequence ─────────────────────────────────────────

describe('Golden: exchange with hotbar slot', () => {
  it('matches snapshot after exchange (seed=42)', () => {
    const g = createFacade(emptyParams, 42);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 3);
    g.setHotbarSlot(1, 5);
    g.exchangeWithSlot(1);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 5: Auto-move then tick ───────────────────────────────────────

describe('Golden: auto-move to target', () => {
  it('matches snapshot after moveToTarget + 20 ticks (seed=42)', () => {
    const g = createFacade(emptyParams, 42);
    g.moveToTarget({ q: 3, r: 0 });
    g.tick(20);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 6: Multiple eat sequence ────────────────────────────────────

describe('Golden: multi-eat sequence', () => {
  it('matches snapshot after eating 3 hexes (seed=42)', () => {
    const g = createFacade(emptyParams, 42);
    const positions: Array<{ q: number; r: number; color: number }> = [
      { q: 0, r: -1, color: 1 },
      { q: 1, r: -1, color: 2 },
      { q: -1, r: 0, color: 3 },
    ];
    for (const p of positions) g.setCell({ q: p.q, r: p.r }, p.color);

    g.moveFocusDirection(DIR_UP);
    g.pressAction();
    g.moveFocusDirection(DIR_UP_RIGHT);
    g.pressAction();
    g.moveFocusDirection(1); // same direction (UP_RIGHT)
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 7: App-level guest start + keyboard ─────────────────────────

describe('Golden: app-level keyboard + guest start', () => {
  it('matches snapshot after keyboard moves in desktop mode (seed=42)', () => {
    const g = createAppFacade(emptyParams, 42);
    g.guestStart();
    g.setInteractionMode('desktop');
    g.pressKey('ArrowDown');
    g.pressKey('ArrowRight');
    g.pressKey('ArrowUp');
    g.tick(3);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 8: Settings pause/unpause cycle ─────────────────────────────

describe('Golden: settings lifecycle', () => {
  it('matches snapshot after settings open/close cycle (seed=42)', () => {
    const g = createAppFacade(emptyParams, 42);
    g.guestStart();
    g.openSettings();
    g.closeSettings();
    g.tick(5);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 9: Hotbar slot selection sequence ────────────────────────────

describe('Golden: hotbar selection sequence', () => {
  it('matches snapshot after selecting slots 0-5 (seed=42)', () => {
    const g = createFacade(emptyParams, 42);
    for (let i = 0; i < 6; i++) g.selectHotbarSlot(i);
    g.selectHotbarSlot(2);
    expect(snapshot(g)).toMatchSnapshot();
  });
});

// ── Scenario 10: Color conservation over 60 ticks ────────────────────────

describe('Golden: color conservation over 60 ticks', () => {
  it('total color count equals snapshot after 60 ticks (seed=42, denseParams)', () => {
    const g = createFacade(denseParams, 42);
    const initial = g.getTotalColorCount();
    g.tick(60);
    expect({ initial, final: g.getTotalColorCount() }).toMatchSnapshot();
  });
});
