/**
 * smoke.test.ts — basic scenarios verifying that the facade works
 * and key invariants are satisfied at start.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFacade, emptyParams, denseParams, DIR_DOWN, DIR_UP } from './facade/testHelpers';
import type { GameTestFacade } from './facade/GameTestFacade';
import { axialDirections, createInitialState, DefaultParams, getCell, mulberry32 } from '../src/gameLogic';

describe('Smoke — initialization', () => {
  let g: GameTestFacade;

  beforeEach(() => {
    g = createFacade(emptyParams);
  });

  it('tick equals 0 after initialization', () => {
    expect(g.getTick()).toBe(0);
  });

  it('protagonist starts at center (0,0)', () => {
    expect(g.getProtagonistPosition()).toEqual({ q: 0, r: 0 });
  });

  it('focus starts in adjacent cell', () => {
    const focus = g.getFocusPosition();
    // Focus must start adjacent to protagonist; axial hex distance must be 1
    const pos = g.getProtagonistPosition();
    const dq = focus.q - pos.q;
    const dr = focus.r - pos.r;
    const hexDist = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    expect(hexDist).toBe(1);
  });

  it('hotbar is initially empty', () => {
    expect(g.getHotbarSlots()).toEqual([null, null, null, null, null, null]);
  });

  it('timer equals 300 seconds by default', () => {
    expect(g.getRemainingSeconds()).toBe(300);
  });

  it('no colored cells with emptyParams (probability=0)', () => {
    expect(g.getColoredCells()).toHaveLength(0);
  });

  it('all cells colored with denseParams (probability=1)', () => {
    const dense = createFacade(denseParams);
    const colored = dense.getColoredCells();
    // initial generation uses double radius: r=10 -> 331 cells, minus 12 guaranteed clear start cells
    expect(colored.length).toBe(319);
  });

  it('default world density is reduced to one third of the old baseline', () => {
    expect(DefaultParams.InitialColorProbability).toBeCloseTo(0.05, 5);
  });

  it('initial visibility center is shifted one cell forward along facing', () => {
    const params = { ...DefaultParams, InitialColorProbability: 0 };
    const state = createInitialState(params, mulberry32(42));
    const forwardDir = axialDirections[state.facingDirIndex];

    expect(state.worldViewCenter).toEqual({
      q: state.protagonist.q + forwardDir.q,
      r: state.protagonist.r + forwardDir.r,
    });
  });

  it('initial state guarantees a clear forward corridor to the furthest visible cell', () => {
    const params = { ...DefaultParams, InitialColorProbability: 1 };
    const state = createInitialState(params, mulberry32(42));
    const forwardDir = axialDirections[state.facingDirIndex];

    for (let step = 0; step <= params.GridRadius + 1; step++) {
      const cell = getCell(state.grid, {
        q: state.protagonist.q + forwardDir.q * step,
        r: state.protagonist.r + forwardDir.r * step,
      });
      expect(cell?.colorIndex).toBeNull();
    }
  });
});

describe('Smoke — ticks', () => {
  it('tick increases after each logical step', () => {
    const g = createFacade(emptyParams);
    g.tick(5);
    expect(g.getTick()).toBe(5);
  });

  it('timer decreases by 1 second every tickRate ticks', () => {
    const g = createFacade({ ...emptyParams, tickRate: 12, timerInitialSeconds: 300 });
    g.tick(12);
    expect(g.getRemainingSeconds()).toBe(299);
  });

  it('auto-move is not active after initialization', () => {
    const g = createFacade(emptyParams);
    expect(g.isAutoMoving()).toBe(false);
  });
});

describe('Smoke — color conservation invariant', () => {
  it('total hex color count does not change after tick (emptyParams)', () => {
    const g = createFacade(emptyParams);
    const before = g.getTotalColorCount();
    g.tick(10);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('total hex color count does not change after tick (denseParams)', () => {
    const g = createFacade(denseParams);
    const before = g.getTotalColorCount();
    g.tick(12);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('setCell does not change counter if colorIndex is the same', () => {
    const g = createFacade(emptyParams);
    // Cell (1, 0) is initially empty
    g.setCell({ q: 1, r: 0 }, 2);
    const after = g.getTotalColorCount();
    g.setCell({ q: 1, r: 0 }, 2);
    expect(g.getTotalColorCount()).toBe(after);
  });
});
