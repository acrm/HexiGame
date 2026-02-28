/**
 * inventory.test.ts — tests for inventory (hotbar) and eat/exchange operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFacade, emptyParams, DIR_UP } from './facade/testHelpers.js';
import type { GameTestFacade } from './facade/GameTestFacade.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Sets up facade with colored hex under focus (q=0, r=-1) and empty hotbar. */
function setupColoredFocus(colorIndex = 2): GameTestFacade {
  const g = createFacade(emptyParams);
  // Protagonist (0,0), focus initially (0,-1) — direction UP
  g.moveFocusDirection(DIR_UP); // ensure we're looking up
  const focus = g.getFocusPosition();
  g.setCell(focus, colorIndex);
  return g;
}

// ── Eat to hotbar ──────────────────────────────────────────────────────────

describe('Eating hex to hotbar (eat)', () => {
  it('after pressAction hex from focus goes to first free slot', () => {
    const g = setupColoredFocus(2);
    const totalBefore = g.getTotalColorCount();
    g.pressAction();
    const slots = g.getHotbarSlots();
    // One of the slots should contain colorIndex=2
    expect(slots).toContain(2);
    // Invariant: total color count did not change
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('focus cell becomes empty after eating', () => {
    const g = setupColoredFocus(3);
    g.pressAction();
    expect(g.getFocusCell()?.colorIndex).toBeNull();
  });

  it('pressAction on empty cell does not change hotbar', () => {
    const g = createFacade(emptyParams);
    const slotsBefore = g.getHotbarSlots();
    g.pressAction();
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('with full hotbar selected slot is replaced (exchange)', () => {
    const g = createFacade(emptyParams);
    // Fill all slots
    for (let i = 0; i < 6; i++) g.setHotbarSlot(i, i);
    // Place new color in focus
    g.moveFocusDirection(DIR_UP);
    const focus = g.getFocusPosition();
    g.setCell(focus, 7);
    g.selectHotbarSlot(0);
    const totalBefore = g.getTotalColorCount();
    g.pressAction();
    // Invariant: colors neither appeared nor disappeared
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('color conservation invariant when eating multiple hexes', () => {
    const g = createFacade(emptyParams);
    // Place 3 colored hexes
    g.setCell({ q: 0, r: -1 }, 1);
    g.setCell({ q: 1, r: -1 }, 2);
    g.setCell({ q: -1, r: 0 }, 3);
    const totalBefore = g.getTotalColorCount();

    // Eat the first one
    g.moveFocusDirection(DIR_UP); // focus -> (0,-1)
    g.pressAction();

    expect(g.getTotalColorCount()).toBe(totalBefore);
  });
});

// ── Exchange with slot ─────────────────────────────────────────────────────

describe('Exchange hex with hotbar slot (exchangeWithSlot)', () => {
  it('absorb: empty slot + hex in focus — hex goes to slot', () => {
    const g = setupColoredFocus(5);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(2);
    expect(g.getHotbarSlots()[2]).toBe(5);
    expect(g.getFocusCell()?.colorIndex).toBeNull();
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('take: hex in slot + empty focus — hex comes to focus', () => {
    const g = createFacade(emptyParams);
    g.setHotbarSlot(1, 4);
    // Focus is empty
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(1);
    expect(g.getHotbarSlots()[1]).toBeNull();
    expect(g.getFocusCell()?.colorIndex).toBe(4);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('exchange: hex both in slot and focus — swap places', () => {
    const g = setupColoredFocus(1); // focus colorIndex=1
    g.setHotbarSlot(3, 6);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(3);
    expect(g.getHotbarSlots()[3]).toBe(1);
    expect(g.getFocusCell()?.colorIndex).toBe(6);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('nothing happens if both (slot and focus) are empty', () => {
    const g = createFacade(emptyParams);
    const slotsBefore = [...g.getHotbarSlots()];
    g.exchangeWithSlot(0);
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('index outside 0–5 is ignored', () => {
    const g = setupColoredFocus(2);
    const totalBefore = g.getTotalColorCount();
    g.exchangeWithSlot(10);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });
});

// ── Select hotbar slot ─────────────────────────────────────────────────────

describe('Hotbar slot selection', () => {
  it('selectHotbarSlot changes selectedHotbarIndex', () => {
    const g = createFacade(emptyParams);
    g.selectHotbarSlot(3);
    expect(g.getSelectedHotbarIndex()).toBe(3);
  });

  it('selectedHotbarIndex = 0 by default', () => {
    const g = createFacade(emptyParams);
    expect(g.getSelectedHotbarIndex()).toBe(0);
  });
});
