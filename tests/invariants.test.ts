/**
 * invariants.test.ts — глобальные инварианты игровой логики.
 *
 * Эти тесты покрывают фундаментальные правила, которые ДОЛЖНЫ выполняться
 * независимо от рефакторинга.
 */

import { describe, it, expect } from 'vitest';
import { createFacade, emptyParams, denseParams, DIR_UP, DIR_DOWN } from './facade/testHelpers.js';

// ── Инвариант 1: сохранение числа цветов ──────────────────────────────────

describe('Инвариант: сохранение цветов', () => {
  it('общее число цветов не меняется за 60 тиков (пустая сетка)', () => {
    const g = createFacade(emptyParams);
    const before = g.getTotalColorCount();
    g.tick(60);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('общее число цветов не меняется за 60 тиков (плотная сетка)', () => {
    const g = createFacade(denseParams);
    const before = g.getTotalColorCount();
    g.tick(60);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('поедание hex сохраняет общее число цветов', () => {
    const g = createFacade(emptyParams);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 1);
    const before = g.getTotalColorCount();
    g.pressAction();
    g.assertColorConservation(before);
  });

  it('обмен со слотом сохраняет общее число цветов', () => {
    const g = createFacade(emptyParams);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 2);
    g.setHotbarSlot(0, 5);
    const before = g.getTotalColorCount();
    g.exchangeWithSlot(0);
    g.assertColorConservation(before);
  });

  it('последовательность eat + move + eat сохраняет цвета', () => {
    const g = createFacade(emptyParams);
    // Расставить цвета
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

describe('Инвариант: таймер', () => {
  it('таймер убывает строго на 1 с каждые tickRate тиков', () => {
    const tickRate = 12;
    const initial = 300;
    const g = createFacade({ ...emptyParams, tickRate, timerInitialSeconds: initial });

    g.tick(tickRate * 5); // 5 секунд
    expect(g.getRemainingSeconds()).toBe(initial - 5);
  });

  it('таймер не уходит ниже 0', () => {
    const g = createFacade({ ...emptyParams, tickRate: 12, timerInitialSeconds: 1 });
    g.tick(100); // намного больше чем нужно
    expect(g.getRemainingSeconds()).toBeGreaterThanOrEqual(0);
  });

  it('начальные секунды из параметров сохраняются', () => {
    const g = createFacade({ ...emptyParams, timerInitialSeconds: 120 });
    expect(g.getRemainingSeconds()).toBe(120);
  });
});

// ── Инвариант 3: фокус всегда смежен с протагонистом ─────────────────────

describe('Инвариант: фокус смежен с протагонистом', () => {
  function hexDistance(aq: number, ar: number, bq: number, br: number): number {
    return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs((-aq - ar) - (-bq - br))) / 2;
  }

  it('фокус и протагонист находятся на расстоянии 1 при инициализации', () => {
    const g = createFacade(emptyParams);
    const p = g.getProtagonistPosition();
    const f = g.getFocusPosition();
    expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
  });

  it('фокус остаётся смежным после смены направления', () => {
    const g = createFacade(emptyParams);
    for (let d = 0; d < 6; d++) {
      g.moveFocusDirection(d);
      const p = g.getProtagonistPosition();
      const f = g.getFocusPosition();
      expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
    }
  });

  it('фокус остаётся смежным после тиков симуляции', () => {
    const g = createFacade(emptyParams);
    g.tick(24);
    const p = g.getProtagonistPosition();
    const f = g.getFocusPosition();
    expect(hexDistance(p.q, p.r, f.q, f.r)).toBe(1);
  });
});

// ── Инвариант 4: тик увеличивается монотонно ──────────────────────────────

describe('Инвариант: монотонный рост тика', () => {
  it('тик увеличивается на 1 при каждом вызове tick()', () => {
    const g = createFacade(emptyParams);
    for (let i = 1; i <= 10; i++) {
      g.tick();
      expect(g.getTick()).toBe(i);
    }
  });

  it('tick(n) увеличивает тик ровно на n', () => {
    const g = createFacade(emptyParams);
    g.tick(37);
    expect(g.getTick()).toBe(37);
  });
});

// ── Инвариант 5: протагонист остаётся внутри сетки ───────────────────────

describe('Инвариант: границы сетки', () => {
  it('protagonist не выходит за radius при авто-движении к центру', () => {
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
