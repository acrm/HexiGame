/**
 * sessionReducer — command-based reducer for the HexiGame session.
 *
 * Accepts a GameCommand, applies the corresponding game-logic function,
 * and returns the updated GameState.  Keeps application-level dispatch
 * decoupled from individual logic modules.
 *
 * Phase 8 deliverable (architecture plan section 7.2).
 */

import type { GameState } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import type { Axial } from '../gameLogic/core/types';
import { tick } from '../gameLogic/core/tick';
import {
  attemptMoveByDelta,
  attemptMoveByDeltaOnActive,
  attemptMoveTo,
  attemptMoveByDirectionIndex,
} from '../gameLogic/systems/movement';
import {
  performContextAction,
  eatToHotbar,
} from '../gameLogic/systems/inventory';

// ─── Command Types ────────────────────────────────────────────────────────────

export type GameCommand =
  | { type: 'TICK'; rng?: () => number }
  | { type: 'MOVE_CURSOR_DELTA'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DELTA_ON_ACTIVE'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DIRECTION'; dirIndex: number }
  | { type: 'MOVE_CURSOR_TO'; target: Axial }
  | { type: 'ACTION_PRESSED' }
  | { type: 'EAT_REQUESTED' }
  | { type: 'TOGGLE_INVENTORY' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Pure reducer: (state, params, command) → nextState.
 *
 * All application-level event dispatching should go through this function.
 * UI components call `dispatch(command)` and receive the new state via a hook.
 */
export function sessionReducer(
  state: GameState,
  params: Params,
  command: GameCommand,
): GameState {
  switch (command.type) {
    case 'TICK':
      return tick(state, params, command.rng);

    case 'MOVE_CURSOR_DELTA':
      return attemptMoveByDelta(state, params, command.dq, command.dr);

    case 'MOVE_CURSOR_DELTA_ON_ACTIVE':
      return attemptMoveByDeltaOnActive(state, params, command.dq, command.dr);

    case 'MOVE_CURSOR_DIRECTION':
      return attemptMoveByDirectionIndex(state, params, command.dirIndex);

    case 'MOVE_CURSOR_TO':
      return attemptMoveTo(state, params, command.target);

    case 'ACTION_PRESSED':
      return performContextAction(state, params);

    case 'EAT_REQUESTED':
      return eatToHotbar(state, params);

    case 'TOGGLE_INVENTORY': {
      const next = state.activeField === 'inventory' ? 'world' : 'inventory';
      return { ...state, activeField: next };
    }

    default:
      return state;
  }
}
