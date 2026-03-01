/**
 * useKeyboardInput — React hook that attaches keyboard listeners and
 * dispatches GameCommands when in desktop interaction mode.
 *
 * Phase 9 deliverable (UI Integration).
 */

import { useEffect, useRef } from 'react';
import type { GameCommand } from '../../appLogic/sessionReducer';

export interface UseKeyboardInputOptions {
  dispatch: (command: GameCommand) => void;
  /** Only process keyboard events in 'desktop' mode. */
  interactionMode: 'desktop' | 'mobile';
  /** When true, Tab-key inventory toggle is disabled (tutorial lock). */
  isInventoryLocked?: boolean;
  /** Current number of hotbar slots (default 6). */
  hotbarSize?: number;
}

/**
 * Attaches global keydown/keyup listeners and maps keys to GameCommands.
 *
 * Supported keys:
 *  - ArrowUp / w  → MOVE_CURSOR_DELTA_ON_ACTIVE (0, -1)
 *  - ArrowDown / s → MOVE_CURSOR_DELTA_ON_ACTIVE (0, +1)
 *  - ArrowLeft / a → MOVE_CURSOR_DELTA_ON_ACTIVE (-1, 0)
 *  - ArrowRight / d → MOVE_CURSOR_DELTA_ON_ACTIVE (+1, 0)
 *  - Space         → ACTION_PRESSED (on keydown, de-duplicated)
 *  - e / E         → EAT_REQUESTED
 *  - 1–6           → SET_HOTBAR_INDEX
 *  - Tab           → TOGGLE_INVENTORY (unless locked)
 */
export function useKeyboardInput({
  dispatch,
  interactionMode,
  isInventoryLocked = false,
  hotbarSize = 6,
}: UseKeyboardInputOptions): void {
  const spaceDownRef = useRef(false);

  useEffect(() => {
    if (interactionMode !== 'desktop') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!isInventoryLocked) {
          dispatch({ type: 'TOGGLE_INVENTORY' });
        }
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (idx < hotbarSize) {
          dispatch({ type: 'SET_HOTBAR_INDEX', index: idx });
        }
        return;
      }

      if (e.code === 'Space') {
        if (spaceDownRef.current) return; // key-repeat guard
        spaceDownRef.current = true;
        dispatch({ type: 'ACTION_PRESSED' });
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        dispatch({ type: 'EAT_REQUESTED' });
        return;
      }

      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0],
      };
      const delta = moves[e.key];
      if (delta) {
        dispatch({ type: 'MOVE_CURSOR_DELTA_ON_ACTIVE', dq: delta[0], dr: delta[1] });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [dispatch, interactionMode, isInventoryLocked, hotbarSize]);
}
