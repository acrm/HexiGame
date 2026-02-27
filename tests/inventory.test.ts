/**
 * inventory.test.ts — тесты инвентаря (хотбара) и операций eat/exchange.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFacade, emptyParams, DIR_UP } from './facade/testHelpers.js';
import type { GameTestFacade } from './facade/GameTestFacade.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Настраивает фасад с цветным hex под фокусом (q=0, r=-1) и пустым хотбаром. */
function setupColoredFocus(colorIndex = 2): GameTestFacade {
  const g = createFacade(emptyParams);
  // Протагонист (0,0), фокус изначально (0,-1) — direction UP
  g.moveFocusDirection(DIR_UP); // убедиться что смотрим вверх
  const focus = g.getFocusPosition();
  g.setCell(focus, colorIndex);
  return g;
}

// ── Eat to hotbar ──────────────────────────────────────────────────────────

describe('Поедание hex в хотбар (eat)', () => {
  it('после pressAction hex из фокуса попадает в первый свободный слот', () => {
    const g = setupColoredFocus(2);
    const totalBefore = g.getTotalColorCount();
    g.pressAction();
    const slots = g.getHotbarSlots();
    // Один из слотов должен содержать colorIndex=2
    expect(slots).toContain(2);
    // Инвариант: общее число цветов не изменилось
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('ячейка фокуса становится пустой после поедания', () => {
    const g = setupColoredFocus(3);
    g.pressAction();
    expect(g.getFocusCell()?.colorIndex).toBeNull();
  });

  it('pressAction на пустой ячейке не меняет хотбар', () => {
    const g = createFacade(emptyParams);
    const slotsBefore = g.getHotbarSlots();
    g.pressAction();
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('при полном хотбаре выбранный слот заменяется (обмен)', () => {
    const g = createFacade(emptyParams);
    // Заполнить все слоты
    for (let i = 0; i < 6; i++) g.setHotbarSlot(i, i);
    // Поместить новый цвет в фокус
    g.moveFocusDirection(DIR_UP);
    const focus = g.getFocusPosition();
    g.setCell(focus, 7);
    g.selectHotbarSlot(0);
    const totalBefore = g.getTotalColorCount();
    g.pressAction();
    // Инвариант: цветов не появилось и не исчезло
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('инвариант сохранения цветов при поедании нескольких hex', () => {
    const g = createFacade(emptyParams);
    // Расставить 3 цветных hex
    g.setCell({ q: 0, r: -1 }, 1);
    g.setCell({ q: 1, r: -1 }, 2);
    g.setCell({ q: -1, r: 0 }, 3);
    const totalBefore = g.getTotalColorCount();

    // Съедаем первый
    g.moveFocusDirection(DIR_UP); // фокус -> (0,-1)
    g.pressAction();

    expect(g.getTotalColorCount()).toBe(totalBefore);
  });
});

// ── Exchange with slot ─────────────────────────────────────────────────────

describe('Обмен hex со слотом хотбара (exchangeWithSlot)', () => {
  it('absorb: пустой слот + hex в фокусе — hex уходит в слот', () => {
    const g = setupColoredFocus(5);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(2);
    expect(g.getHotbarSlots()[2]).toBe(5);
    expect(g.getFocusCell()?.colorIndex).toBeNull();
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('take: hex в слоте + пустой фокус — hex приходит в фокус', () => {
    const g = createFacade(emptyParams);
    g.setHotbarSlot(1, 4);
    // Фокус пустой
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(1);
    expect(g.getHotbarSlots()[1]).toBeNull();
    expect(g.getFocusCell()?.colorIndex).toBe(4);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('exchange: hex и в слоте и в фокусе — меняются местами', () => {
    const g = setupColoredFocus(1); // focus colorIndex=1
    g.setHotbarSlot(3, 6);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(3);
    expect(g.getHotbarSlots()[3]).toBe(1);
    expect(g.getFocusCell()?.colorIndex).toBe(6);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('ничего не происходит если оба (слот и фокус) пустые', () => {
    const g = createFacade(emptyParams);
    const slotsBefore = [...g.getHotbarSlots()];
    g.exchangeWithSlot(0);
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('индекс за пределами 0–5 игнорируется', () => {
    const g = setupColoredFocus(2);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(10);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });
});

// ── Select hotbar slot ─────────────────────────────────────────────────────

describe('Выбор слота хотбара', () => {
  it('selectHotbarSlot меняет selectedHotbarIndex', () => {
    const g = createFacade(emptyParams);
    g.selectHotbarSlot(3);
    expect(g.getSelectedHotbarIndex()).toBe(3);
  });

  it('selectedHotbarIndex = 0 по умолчанию', () => {
    const g = createFacade(emptyParams);
    expect(g.getSelectedHotbarIndex()).toBe(0);
  });
});
