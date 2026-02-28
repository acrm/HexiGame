/**
 * AppLogicAdapter — implementation of AppTestFacade.
 *
 * Extends PureLogicAdapter with application-level state and interactions:
 * keyboard handling, settings/pause lifecycle, mobile tab management,
 * and guest start flow — mirroring the logic inside Game.tsx.
 */

import {
  eatToHotbar as logicEatToHotbar,
  attemptMoveByDeltaOnActive,
} from '../../src/logic/pureLogic';

import { PureLogicAdapter } from './PureLogicAdapter';
import type { AppTestFacade, MobileTab, InteractionMode } from './AppTestFacade';
import type { FacadeParams } from './GameTestFacade';

export class AppLogicAdapter extends PureLogicAdapter implements AppTestFacade {
  private _guestStarted = false;
  private _isPaused = false;
  private _isSettingsOpen = false;
  private _mobileTab: MobileTab = 'hexipedia';
  private _interactionMode: InteractionMode = 'mobile';

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override init(params: FacadeParams = {}, seed = 42): void {
    super.init(params, seed);
    this._guestStarted = false;
    this._isPaused = false;
    this._isSettingsOpen = false;
    this._mobileTab = 'hexipedia';
    this._interactionMode = 'mobile';
    this._syncActiveFieldToTab();
  }

  // ── App Commands ───────────────────────────────────────────────────────────

  guestStart(): void {
    this._guestStarted = true;
    if (!this._isSettingsOpen) {
      this._isPaused = false;
    }
  }

  openSettings(): void {
    this._isSettingsOpen = true;
    this._isPaused = true;
  }

  closeSettings(): void {
    this._isSettingsOpen = false;
    if (this._guestStarted) {
      this._isPaused = false;
    }
  }

  switchMobileTab(tab: MobileTab): void {
    this._mobileTab = tab;
    this._syncActiveFieldToTab();
  }

  setInteractionMode(mode: InteractionMode): void {
    this._interactionMode = mode;
  }

  // ── Keyboard Simulation ────────────────────────────────────────────────────

  pressKey(key: string): void {
    if (this._interactionMode !== 'desktop') return;

    if (key === 'Tab') {
      const nextField: 'world' | 'inventory' = this.state.activeField === 'inventory' ? 'world' : 'inventory';
      this._setActiveField(nextField);
      return;
    }

    if (key >= '1' && key <= '6') {
      const idx = Number(key) - 1;
      const maxIdx = (this.state.hotbarSlots?.length ?? 6) - 1;
      this.selectHotbarSlot(Math.max(0, Math.min(idx, maxIdx)));
      return;
    }

    if (key === ' ' || key === 'Space') {
      this.pressAction();
      return;
    }

    if (key === 'e' || key === 'E') {
      this.eatToHotbar();
      return;
    }

    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -1], w: [0, -1],
      ArrowDown: [0, 1], s: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0],
    };
    const delta = moves[key];
    if (delta) {
      this.moveFocusDeltaOnActive(delta[0], delta[1]);
    }
  }

  // ── Additional Game Actions ────────────────────────────────────────────────

  eatToHotbar(): void {
    this.state = logicEatToHotbar(this.state, this.params);
  }

  moveFocusDeltaOnActive(dq: number, dr: number): void {
    this.state = attemptMoveByDeltaOnActive(this.state, this.params, dq, dr);
  }

  // ── App State Queries ──────────────────────────────────────────────────────

  getGuestStarted(): boolean { return this._guestStarted; }
  getIsPaused(): boolean { return this._isPaused; }
  getIsSettingsOpen(): boolean { return this._isSettingsOpen; }
  getMobileTab(): MobileTab { return this._mobileTab; }
  getIsInventory(): boolean { return this.state.activeField === 'inventory'; }
  getInteractionMode(): InteractionMode { return this._interactionMode; }
  getActiveField(): 'world' | 'inventory' { return this.state.activeField ?? 'world'; }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private _syncActiveFieldToTab(): void {
    this._setActiveField(this._mobileTab === 'hexilab' ? 'inventory' : 'world');
  }

  private _setActiveField(field: 'world' | 'inventory'): void {
    this.state = { ...this.state, activeField: field };
  }
}
