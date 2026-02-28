/**
 * invariants.test.ts — global game logic invariants.
 *
 * These tests cover fundamental rules that MUST hold
 * regardless of refactoring.
 */

import { describe, it, expect } from 'vitest';
import { createFacade, emptyParams, denseParams, DIR_UP, DIR_DOWN } from './facade/testHelpers';

// ── Инвариант 1: сохранение числа цветов ──────────────────────────────────

describe('Invariant: color conservation', () => {
  it('total color count does not change over 60 ticks (empty grid)', () => {
    const g = createFacade(emptyParams);
    const before = g.getTotalColorCount();
    g.tick(60);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('total color count does not change over 60 ticks (dense grid)', () => {
    const g = createFacade(denseParams);
    const before = g.getTotalColorCount();
    g.tick(60);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('eating hex preserves total color count', () => {
    const g = createFacade(emptyParams);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 1);
    const before = g.getTotalColorCount();
    g.pressAction();
    g.assertColorConservation(before);
  });

  it('exchange with slot preserves total color count', () => {
    const g = createFacade(emptyParams);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 2);
    g.setHotbarSlot(0, 5);
    const before = g.getTotalColorCount();
    g.exchangeWithSlot(0);
    g.assertColorConservation(before);
  });

  it('sequence eat + move + eat preserves colors', () => {
    const g = createFacade(emptyParams);
    // Place colors
    g.setCell({ q: 0, r: -1 }, 1);
    g.setCell({ q: 0, r: 1 }, 3);
    const before = g.getTotalColorCount();

    g.moveFocusDirection(DIR_UP);    // фокус -> (0,-1)
    g.pressAction();                  // eat color 1
    g.moveFocusDirection(DIR_DOWN);  // фокус -> (0,+1)
    g.pressAction();                  // eat color 3

    g.assertColorConservation(before);
  });
});

// ── Инвариант 2: таймер ───────────────────────────────────────────────────

describe('Invariant: timer', () => {
  it('timer decreases strictly by 1 every tickRate ticks', () => {
    const tickRate = 12;
    const initial = 300;
    const g = createFacade({ ...emptyParams, tickRate, timerInitialSeconds: initial });

    g.tick(tickRate * 5); // 5 seconds
    expect(g.getRemainingSeconds()).toBe(initial - 5);
  });

  it('timer does not go below 0', () => {
    const g = createFacade({ ...emptyParams, tickRate: 12, timerInitialSeconds: 1 });
    g.tick(100); // much more than needed
    expect(g.getRemainingSeconds()).toBeGreaterThanOrEqual(0);
  });

  it('initial seconds from params are preserved', () => {
    const g = createFacade({ ...emptyParams, timerInitialSeconds: 120 });
    expect(g.getRemainingSeconds()).toBe(120);
  });
});

// ── Инвариант 3: фокус всегда смежен с протагонистом ─────────────────────

describe('Invariant: focus is adjacent to protagonist', () => {
  function hexDistance(aq: number, ar: number, bq: number, br: number): number {
    return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs((-aq - ar) - (-bq - br))) / 2;
  }

  it('focus and protagonist are at distance 1 at initialization', () => {
    const g = createFacade(emptyParams);
    const p = g.getProtagonistPosition();
    const f = g.getFocusPosition();
    expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
  });

  it('focus remains adjacent after direction change', () => {
    const g = createFacade(emptyParams);
    for (let d = 0; d < 6; d++) {
      g.moveFocusDirection(d);
      const p = g.getProtagonistPosition();
      const f = g.getFocusPosition();
      expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
    }
  });

  it('focus remains adjacent after simulation ticks', () => {
    const g = createFacade(emptyParams);
    g.tick(24);
    const p = g.getProtagonistPosition();
    const f = g.getFocusPosition();
    expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
  });
});

// ── Инвариант 4: тик увеличивается монотонно ──────────────────────────────

describe('Invariant: monotonic tick growth', () => {
  it('tick increases by 1 on each tick() call', () => {
    const g = createFacade(emptyParams);
    for (let i = 1; i <= 10; i++) {
      g.tick();
      expect(g.getTick()).toBe(i);
    }
  });

  it('tick(n) increases tick by exactly n', () => {
    const g = createFacade(emptyParams);
    g.tick(37);
    expect(g.getTick()).toBe(37);
  });
});

// ── Инвариант 5: протагонист остаётся внутри сетки ───────────────────────

describe('Invariant: grid boundaries', () => {
  it('protagonist does not go beyond radius during auto-move to center', () => {
    const radius = 3;
    const g = createFacade({ ...emptyParams, gridRadius: radius });
    g.moveToTarget({ q: 0, r: 0 });
    g.tick(30);
    const p = g.getProtagonistPosition();
    const s = -p.q - p.r;
    expect(Math.abs(p.q)).toBeLessThanOrEqual(radius);
    expect(Math.abs(p.r)).toBeLessThanOrEqual(radius);
    expect(Math.abs(s)).toBeLessThanOrEqual(radius);
  });
});
