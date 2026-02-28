/**
 * appLogic.test.ts — tests for application-level logic and UI interactions.
 *
 * Covers behavior that lives in Game.tsx:
 *  - Keyboard shortcuts (desktop mode only)
 *  - Guest start flow
 *  - Settings open/close and pause behavior
 *  - Mobile tab management and active field sync
 *  - Interaction mode switching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createAppFacade, emptyParams, DIR_UP } from './facade/testHelpers';
import type { AppTestFacade } from './facade/AppTestFacade';

// ── Guest Start ────────────────────────────────────────────────────────────

describe('Guest start flow', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
  });

  it('guest is not started after initialization', () => {
    expect(g.getGuestStarted()).toBe(false);
  });

  it('guestStart() marks the game as started', () => {
    g.guestStart();
    expect(g.getGuestStarted()).toBe(true);
  });

  it('game is not paused after guestStart when settings are closed', () => {
    g.guestStart();
    expect(g.getIsPaused()).toBe(false);
  });

  it('game remains paused after guestStart when settings are open', () => {
    g.openSettings();
    g.guestStart();
    expect(g.getIsPaused()).toBe(true);
  });
});

// ── Settings & Pause ───────────────────────────────────────────────────────

describe('Settings panel lifecycle', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
  });

  it('openSettings() pauses the game', () => {
    g.openSettings();
    expect(g.getIsPaused()).toBe(true);
    expect(g.getIsSettingsOpen()).toBe(true);
  });

  it('closeSettings() after guestStart unpauses the game', () => {
    g.guestStart();
    g.openSettings();
    g.closeSettings();
    expect(g.getIsPaused()).toBe(false);
    expect(g.getIsSettingsOpen()).toBe(false);
  });

  it('closeSettings() before guestStart does not unpause', () => {
    // Initially not paused
    expect(g.getIsPaused()).toBe(false);
    // Opening settings pauses the game
    g.openSettings();
    expect(g.getIsPaused()).toBe(true);
    // Closing without guest start keeps the game paused (no game loop to resume)
    g.closeSettings();
    expect(g.getIsSettingsOpen()).toBe(false);
    expect(g.getIsPaused()).toBe(true);
  });

  it('settings can be opened and closed multiple times', () => {
    g.guestStart();
    g.openSettings();
    expect(g.getIsPaused()).toBe(true);
    g.closeSettings();
    expect(g.getIsPaused()).toBe(false);
    g.openSettings();
    expect(g.getIsPaused()).toBe(true);
    g.closeSettings();
    expect(g.getIsPaused()).toBe(false);
  });
});

// ── Mobile Tab Management ──────────────────────────────────────────────────

describe('Mobile tab management', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
  });

  it('default mobile tab is hexipedia', () => {
    expect(g.getMobileTab()).toBe('hexipedia');
  });

  it('default activeField is world', () => {
    expect(g.getActiveField()).toBe('world');
    expect(g.getIsInventory()).toBe(false);
  });

  it('switchMobileTab to hexilab sets activeField to inventory', () => {
    g.switchMobileTab('hexilab');
    expect(g.getMobileTab()).toBe('hexilab');
    expect(g.getActiveField()).toBe('inventory');
    expect(g.getIsInventory()).toBe(true);
  });

  it('switchMobileTab to heximap sets activeField to world', () => {
    g.switchMobileTab('hexilab');
    g.switchMobileTab('heximap');
    expect(g.getMobileTab()).toBe('heximap');
    expect(g.getActiveField()).toBe('world');
    expect(g.getIsInventory()).toBe(false);
  });

  it('switchMobileTab to hexipedia sets activeField to world', () => {
    g.switchMobileTab('hexilab');
    g.switchMobileTab('hexipedia');
    expect(g.getMobileTab()).toBe('hexipedia');
    expect(g.getActiveField()).toBe('world');
    expect(g.getIsInventory()).toBe(false);
  });
});

// ── Interaction Mode ───────────────────────────────────────────────────────

describe('Interaction mode', () => {
  it('default interaction mode is mobile', () => {
    const g = createAppFacade(emptyParams);
    expect(g.getInteractionMode()).toBe('mobile');
  });

  it('setInteractionMode changes mode', () => {
    const g = createAppFacade(emptyParams);
    g.setInteractionMode('desktop');
    expect(g.getInteractionMode()).toBe('desktop');
    g.setInteractionMode('mobile');
    expect(g.getInteractionMode()).toBe('mobile');
  });
});

// ── Keyboard: Ignored in Mobile Mode ──────────────────────────────────────

describe('Keyboard shortcuts ignored in mobile mode', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
    // default interactionMode is 'mobile'
  });

  it('arrow keys do not change focus in mobile mode', () => {
    const before = g.getFocusPosition();
    g.pressKey('ArrowUp');
    g.pressKey('ArrowDown');
    g.pressKey('ArrowLeft');
    g.pressKey('ArrowRight');
    expect(g.getFocusPosition()).toEqual(before);
  });

  it('WASD keys do not change focus in mobile mode', () => {
    const before = g.getFocusPosition();
    g.pressKey('w');
    g.pressKey('a');
    g.pressKey('s');
    g.pressKey('d');
    expect(g.getFocusPosition()).toEqual(before);
  });

  it('Space key does not trigger action in mobile mode', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 3);
    const slotsBefore = [...g.getHotbarSlots()];
    g.pressKey(' ');
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('E key does not eat in mobile mode', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 2);
    const slotsBefore = [...g.getHotbarSlots()];
    g.pressKey('e');
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('number keys do not change hotbar selection in mobile mode', () => {
    const before = g.getSelectedHotbarIndex();
    g.pressKey('3');
    expect(g.getSelectedHotbarIndex()).toBe(before);
  });

  it('Tab key does not toggle inventory in mobile mode', () => {
    const before = g.getActiveField();
    g.pressKey('Tab');
    expect(g.getActiveField()).toBe(before);
  });
});

// ── Keyboard: Movement (Desktop Mode) ─────────────────────────────────────

describe('Keyboard movement in desktop mode', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
    g.setInteractionMode('desktop');
  });

  it('ArrowUp moves focus upward (dr=-1)', () => {
    // Start facing down so ArrowUp actually changes position
    g.pressKey('ArrowDown');
    const before = g.getFocusPosition();
    g.pressKey('ArrowUp');
    const after = g.getFocusPosition();
    expect(after).not.toEqual(before);
  });

  it('w key moves focus upward (same as ArrowUp)', () => {
    g.pressKey('ArrowUp');
    const afterArrow = g.getFocusPosition();

    const g2 = createAppFacade(emptyParams);
    g2.setInteractionMode('desktop');
    g2.pressKey('w');
    expect(g2.getFocusPosition()).toEqual(afterArrow);
  });

  it('ArrowDown moves focus downward (dr=+1)', () => {
    const before = g.getFocusPosition();
    g.pressKey('ArrowDown');
    expect(g.getFocusPosition()).not.toEqual(before);
  });

  it('s key equals ArrowDown', () => {
    g.pressKey('ArrowDown');
    const afterArrow = g.getFocusPosition();

    const g2 = createAppFacade(emptyParams);
    g2.setInteractionMode('desktop');
    g2.pressKey('s');
    expect(g2.getFocusPosition()).toEqual(afterArrow);
  });

  it('ArrowLeft moves focus left (dq=-1)', () => {
    const before = g.getFocusPosition();
    g.pressKey('ArrowLeft');
    expect(g.getFocusPosition()).not.toEqual(before);
  });

  it('a key equals ArrowLeft', () => {
    g.pressKey('ArrowLeft');
    const afterArrow = g.getFocusPosition();

    const g2 = createAppFacade(emptyParams);
    g2.setInteractionMode('desktop');
    g2.pressKey('a');
    expect(g2.getFocusPosition()).toEqual(afterArrow);
  });

  it('ArrowRight moves focus right (dq=+1)', () => {
    const before = g.getFocusPosition();
    g.pressKey('ArrowRight');
    expect(g.getFocusPosition()).not.toEqual(before);
  });

  it('d key equals ArrowRight', () => {
    g.pressKey('ArrowRight');
    const afterArrow = g.getFocusPosition();

    const g2 = createAppFacade(emptyParams);
    g2.setInteractionMode('desktop');
    g2.pressKey('d');
    expect(g2.getFocusPosition()).toEqual(afterArrow);
  });

  it('focus remains adjacent to protagonist after keyboard movement', () => {
    function hexDist(aq: number, ar: number, bq: number, br: number): number {
      return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs((-aq - ar) - (-bq - br))) / 2;
    }
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']) {
      g.pressKey(key);
      const p = g.getProtagonistPosition();
      const f = g.getFocusPosition();
      expect(hexDist(p.q, p.r, f.q, f.r)).toBe(1);
    }
  });
});

// ── Keyboard: Action Keys (Desktop Mode) ──────────────────────────────────

describe('Keyboard action keys in desktop mode', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
    g.setInteractionMode('desktop');
  });

  it('Space triggers context action (eat colored hex to hotbar)', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 2);
    const totalBefore = g.getTotalColorCount();
    g.pressKey(' ');
    expect(g.getHotbarSlots()).toContain(2);
    expect(g.getFocusCell()?.colorIndex).toBeNull();
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('"Space" code also triggers context action', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 5);
    g.pressKey('Space');
    expect(g.getHotbarSlots()).toContain(5);
  });

  it('E key eats hex to hotbar', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 3);
    const totalBefore = g.getTotalColorCount();
    g.pressKey('e');
    expect(g.getHotbarSlots()).toContain(3);
    expect(g.getTotalColorCount()).toBe(totalBefore);
  });

  it('uppercase E key also eats hex', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 4);
    g.pressKey('E');
    expect(g.getHotbarSlots()).toContain(4);
  });

  it('Space on empty cell does not change hotbar', () => {
    const slotsBefore = [...g.getHotbarSlots()];
    g.pressKey(' ');
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('E on empty cell does not change hotbar', () => {
    const slotsBefore = [...g.getHotbarSlots()];
    g.pressKey('e');
    expect(g.getHotbarSlots()).toEqual(slotsBefore);
  });

  it('color conservation during keyboard eat (Space)', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 1);
    const total = g.getTotalColorCount();
    g.pressKey(' ');
    g.assertColorConservation(total);
  });

  it('color conservation during keyboard eat (E)', () => {
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 7);
    const total = g.getTotalColorCount();
    g.pressKey('e');
    g.assertColorConservation(total);
  });
});

// ── Keyboard: Hotbar Slot Selection ───────────────────────────────────────

describe('Keyboard hotbar slot selection in desktop mode', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
    g.setInteractionMode('desktop');
  });

  it('pressing "1" selects slot 0', () => {
    g.pressKey('1');
    expect(g.getSelectedHotbarIndex()).toBe(0);
  });

  it('pressing "3" selects slot 2', () => {
    g.pressKey('3');
    expect(g.getSelectedHotbarIndex()).toBe(2);
  });

  it('pressing "6" selects slot 5 (last slot)', () => {
    g.pressKey('6');
    expect(g.getSelectedHotbarIndex()).toBe(5);
  });

  it('all slots 1–6 select correctly', () => {
    for (let k = 1; k <= 6; k++) {
      g.pressKey(String(k));
      expect(g.getSelectedHotbarIndex()).toBe(k - 1);
    }
  });
});

// ── Keyboard: Tab Inventory Toggle (Desktop Mode) ─────────────────────────

describe('Tab key toggles inventory in desktop mode', () => {
  let g: AppTestFacade;

  beforeEach(() => {
    g = createAppFacade(emptyParams);
    g.setInteractionMode('desktop');
  });

  it('Tab toggles activeField from world to inventory', () => {
    expect(g.getActiveField()).toBe('world');
    g.pressKey('Tab');
    expect(g.getActiveField()).toBe('inventory');
    expect(g.getIsInventory()).toBe(true);
  });

  it('Tab toggles activeField back to world on second press', () => {
    g.pressKey('Tab');
    g.pressKey('Tab');
    expect(g.getActiveField()).toBe('world');
    expect(g.getIsInventory()).toBe(false);
  });
});

// ── Direct eatToHotbar and moveFocusDeltaOnActive ─────────────────────────

describe('Direct app action methods', () => {
  it('eatToHotbar() moves hex from focus to hotbar', () => {
    const g = createAppFacade(emptyParams);
    g.moveFocusDirection(DIR_UP);
    g.setCell(g.getFocusPosition(), 6);
    const total = g.getTotalColorCount();
    g.eatToHotbar();
    expect(g.getHotbarSlots()).toContain(6);
    g.assertColorConservation(total);
  });

  it('moveFocusDeltaOnActive() moves focus correctly', () => {
    const g = createAppFacade(emptyParams);
    const before = g.getFocusPosition();
    g.moveFocusDeltaOnActive(0, 1);
    expect(g.getFocusPosition()).not.toEqual(before);
  });
});
