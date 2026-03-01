/**
 * sessionReducer — command-based reducer for the HexiGame session.
 *
 * Accepts a GameCommand, applies the corresponding game-logic function,
 * and returns the updated GameState.  Keeps application-level dispatch
 * decoupled from individual logic modules.
 *
 * Phase 8 deliverable (architecture plan section 7.2).
 * Phase 9 addition: full command set covering drag, hotbar, template, tutorial.
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
  startDrag,
  endDrag,
  dragMoveProtagonist,
} from '../gameLogic/systems/movement';
import {
  performContextAction,
  eatToHotbar,
  exchangeWithHotbarSlot,
} from '../gameLogic/systems/inventory';
import {
  activateTemplate,
  deactivateTemplate,
} from '../gameLogic/systems/template';

// ─── Command Types ────────────────────────────────────────────────────────────

export type GameCommand =
  // Game loop
  | { type: 'TICK'; rng?: () => number }
  // Movement
  | { type: 'MOVE_CURSOR_DELTA'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DELTA_ON_ACTIVE'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DIRECTION'; dirIndex: number }
  | { type: 'MOVE_CURSOR_TO'; target: Axial }
  // Actions
  | { type: 'ACTION_PRESSED' }
  | { type: 'EAT_REQUESTED' }
  // Inventory
  | { type: 'TOGGLE_INVENTORY' }
  | { type: 'SET_ACTIVE_FIELD'; field: 'world' | 'inventory' }
  | { type: 'SET_HOTBAR_INDEX'; index: number }
  | { type: 'EXCHANGE_HOTBAR_SLOT'; slotIndex: number }
  // Drag
  | { type: 'START_DRAG' }
  | { type: 'END_DRAG' }
  | { type: 'DRAG_MOVE'; dq: number; dr: number }
  // Templates
  | { type: 'ACTIVATE_TEMPLATE'; templateId: string }
  | { type: 'DEACTIVATE_TEMPLATE' }
  // Tutorial
  | { type: 'SET_TUTORIAL_LEVEL'; levelId: string | null }
  | { type: 'MARK_TUTORIAL_TARGET_VISITED'; key: string }
  | { type: 'COMPLETE_TUTORIAL_LEVEL'; levelId: string; nextLevelId: string | null }
  | { type: 'SET_TUTORIAL_INTERACTION_MODE'; mode: 'desktop' | 'mobile' }
  // State reset
  | { type: 'RESET_STATE'; newState: GameState };

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

    case 'SET_ACTIVE_FIELD':
      return { ...state, activeField: command.field };

    case 'SET_HOTBAR_INDEX':
      return { ...state, selectedHotbarIndex: command.index };

    case 'EXCHANGE_HOTBAR_SLOT':
      return exchangeWithHotbarSlot(state, params, command.slotIndex);

    case 'START_DRAG':
      return startDrag(state);

    case 'END_DRAG':
      return endDrag(state);

    case 'DRAG_MOVE':
      return dragMoveProtagonist(state, params, command.dq, command.dr);

    case 'ACTIVATE_TEMPLATE':
      return activateTemplate(state, command.templateId);

    case 'DEACTIVATE_TEMPLATE':
      return deactivateTemplate(state);

    case 'SET_TUTORIAL_LEVEL': {
      if (!command.levelId) {
        if (!state.tutorialLevelId && !state.tutorialProgress) return state;
        return { ...state, tutorialLevelId: null, tutorialProgress: undefined };
      }
      if (state.tutorialLevelId === command.levelId) return state;
      return {
        ...state,
        tutorialLevelId: command.levelId,
        tutorialProgress: {
          visitedTargetKeys: new Set(),
          startTick: state.tick,
        },
      };
    }

    case 'MARK_TUTORIAL_TARGET_VISITED': {
      if (!state.tutorialProgress) return state;
      if (state.tutorialProgress.visitedTargetKeys.has(command.key)) return state;
      const nextVisited = new Set(state.tutorialProgress.visitedTargetKeys);
      nextVisited.add(command.key);
      return {
        ...state,
        tutorialProgress: { ...state.tutorialProgress, visitedTargetKeys: nextVisited },
      };
    }

    case 'COMPLETE_TUTORIAL_LEVEL': {
      const completedSet = new Set(state.tutorialCompletedLevelIds ?? []);
      completedSet.add(command.levelId);
      const progress = state.tutorialProgress;
      const nextProgress = progress && !progress.completedAtTick
        ? { ...progress, completedAtTick: state.tick }
        : progress;
      const nextTutorialLevelId = command.nextLevelId ?? null;
      const nextState: GameState = {
        ...state,
        tutorialCompletedLevelIds: completedSet,
        tutorialProgress: nextProgress,
        tutorialLevelId: nextTutorialLevelId,
      };
      if (nextTutorialLevelId && nextTutorialLevelId !== state.tutorialLevelId) {
        return {
          ...nextState,
          tutorialProgress: {
            visitedTargetKeys: new Set(),
            startTick: state.tick,
          },
        };
      }
      return nextState;
    }

    case 'SET_TUTORIAL_INTERACTION_MODE':
      return { ...state, tutorialInteractionMode: command.mode };

    case 'RESET_STATE':
      return command.newState;

    default:
      return state;
  }
}
