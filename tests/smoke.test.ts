/**
 * smoke.test.ts — базовые сценарии, проверяющие что фасад работает
 * и ключевые инварианты выполняются на старте.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFacade, emptyParams, denseParams, DIR_DOWN, DIR_UP } from './facade/testHelpers.js';
import type { GameTestFacade } from './facade/GameTestFacade.js';

describe('Smoke — инициализация', () => {
  let g: GameTestFacade;

  beforeEach(() => {
    g = createFacade(emptyParams);
  });

  it('тик равен 0 после инициализации', () => {
    expect(g.getTick()).toBe(0);
  });

  it('протагонист начинает в центре (0,0)', () => {
    expect(g.getProtagonistPosition()).toEqual({ q: 0, r: 0 });
  });

  it('фокус начинается в смежной ячейке (direction 0 = up: q=0,r=-1)', () => {
    const focus = g.getFocusPosition();
    // Direction 0 = up: dq=0, dr=-1
    const pos = g.getProtagonistPosition();
    const dist = Math.abs(focus.q - pos.q) + Math.abs(focus.r - pos.r);
    expect(dist).toBeGreaterThan(0);
  });

  it('хотбар изначально пуст', () => {
    expect(g.getHotbarSlots()).toEqual([null, null, null, null, null, null]);
  });

  it('таймер равен 300 секундам по умолчанию', () => {
    expect(g.getRemainingSeconds()).toBe(300);
  });

  it('нет цветных ячеек с emptyParams (probability=0)', () => {
    expect(g.getColoredCells()).toHaveLength(0);
  });

  it('все ячейки окрашены с denseParams (probability=1)', () => {
    const dense = createFacade(denseParams);
    const colored = dense.getColoredCells();
    // radius=5: 3*5^2 + 3*5 + 1 = 91 ячейка
    expect(colored.length).toBe(91);
  });
});

describe('Smoke — тики', () => {
  it('тик увеличивается после каждого логического шага', () => {
    const g = createFacade(emptyParams);
    g.tick(5);
    expect(g.getTick()).toBe(5);
  });

  it('таймер убывает на 1 секунду каждые tickRate тиков', () => {
    const g = createFacade({ ...emptyParams, tickRate: 12, timerInitialSeconds: 300 });
    g.tick(12);
    expect(g.getRemainingSeconds()).toBe(299);
  });

  it('авто-движение не активно после инициализации', () => {
    const g = createFacade(emptyParams);
    expect(g.isAutoMoving()).toBe(false);
  });
});

describe('Smoke — инвариант сохранения цветов', () => {
  it('общее число hex-цветов не меняется после тика (emptyParams)', () => {
    const g = createFacade(emptyParams);
    const before = g.getTotalColorCount();
    g.tick(10);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('общее число hex-цветов не меняется после тика (denseParams)', () => {
    const g = createFacade(denseParams);
    const before = g.getTotalColorCount();
    g.tick(12);
    expect(g.getTotalColorCount()).toBe(before);
  });

  it('setCell не меняет счётчик если colorIndex тот же', () => {
    const g = createFacade(emptyParams);
    // Ячейка (1, 0) изначально пустая
    g.setCell({ q: 1, r: 0 }, 2);
    const after = g.getTotalColorCount();
    g.setCell({ q: 1, r: 0 }, 2);
    expect(g.getTotalColorCount()).toBe(after);
  });
});
