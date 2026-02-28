/**
 * AppTestFacade — facade interface for testing application-level logic.
 *
 * Extends GameTestFacade with app-level interactions: keyboard shortcuts,
 * settings panel, mobile tab management, guest start flow, and interaction mode.
 *
 * All tests that verify UI-driven behavior should use this interface rather
 * than calling game logic functions directly.
 */

import type { GameTestFacade } from './GameTestFacade';

export type MobileTab = 'heximap' | 'hexilab' | 'hexipedia';
export type InteractionMode = 'desktop' | 'mobile';

export interface AppTestFacade extends GameTestFacade {
  // ── App Commands ───────────────────────────────────────────────────────────

  /**
   * Simulate the user clicking "Start" on the GuestStart screen.
   * Marks the game as started; unpauses if settings are not open.
   */
  guestStart(): void;

  /**
   * Open the settings panel — pauses the game.
   */
  openSettings(): void;

  /**
   * Close the settings panel — unpauses if guest has already started.
   */
  closeSettings(): void;

  /**
   * Switch the mobile tab (heximap / hexilab / hexipedia).
   * hexilab → activeField = 'inventory'; others → activeField = 'world'.
   */
  switchMobileTab(tab: MobileTab): void;

  /**
   * Set the interaction mode (desktop receives keyboard events; mobile does not).
   */
  setInteractionMode(mode: InteractionMode): void;

  // ── Keyboard Simulation ────────────────────────────────────────────────────

  /**
   * Simulate pressing a key.
   * Only takes effect when interactionMode === 'desktop'.
   *
   * Supported values:
   *  - 'ArrowUp' / 'w'    → moveFocusDeltaOnActive(0, -1)
   *  - 'ArrowDown' / 's'  → moveFocusDeltaOnActive(0, +1)
   *  - 'ArrowLeft' / 'a'  → moveFocusDeltaOnActive(-1, 0)
   *  - 'ArrowRight' / 'd' → moveFocusDeltaOnActive(+1, 0)
   *  - ' ' or 'Space'     → pressAction() (context action)
   *  - 'e' or 'E'         → eatToHotbar()
   *  - '1'–'6'            → selectHotbarSlot(n-1)
   *  - 'Tab'              → toggle activeField (world ↔ inventory)
   */
  pressKey(key: string): void;

  // ── Additional Game Actions ────────────────────────────────────────────────

  /**
   * Eat the hex at the current focus cell directly to hotbar
   * (equivalent to pressing 'E' in desktop mode, or the eat button on mobile).
   */
  eatToHotbar(): void;

  /**
   * Move focus in the currently active field (world or inventory).
   * Mirrors Game.tsx's keyboard arrow handling via attemptMoveByDeltaOnActive.
   */
  moveFocusDeltaOnActive(dq: number, dr: number): void;

  // ── App State Queries ──────────────────────────────────────────────────────

  /** Whether the guest has pressed "Start". */
  getGuestStarted(): boolean;

  /** Whether the game loop is currently paused. */
  getIsPaused(): boolean;

  /** Whether the settings panel is open. */
  getIsSettingsOpen(): boolean;

  /** Current mobile tab. */
  getMobileTab(): MobileTab;

  /**
   * Whether the inventory field is active
   * (true when activeField === 'inventory').
   */
  getIsInventory(): boolean;

  /** Current interaction mode ('desktop' | 'mobile'). */
  getInteractionMode(): InteractionMode;

  /** The currently active game field ('world' | 'inventory'). */
  getActiveField(): 'world' | 'inventory';
}
