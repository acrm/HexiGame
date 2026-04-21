/**
 * sessionReducer — command-based reducer for the HexiGame session.
 *
 * Accepts a GameCommand, applies the corresponding game-logic function,
 * and returns the updated GameState.  Keeps application-level dispatch
 * decoupled from individual logic modules.
 *
 * Phase 8 deliverable (architecture plan section 7.2).
 * Phase 9 addition: full command set covering drag, hotbar, template, tasks.
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
  updateFocusPosition,
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
import { getCell, projectAxialBetweenLayers } from '../gameLogic/core/grid';
import { applyTaskSetup, resolveTaskTargets } from '../tasks/taskSandbox';
import { getNextTaskDefinition, getTaskDefinition } from '../tasks/taskLevels';
import { axialToKey } from '../tasks/taskState';

function normalizeTaskId(taskId: string | null): string | null {
  if (!taskId) return null;
  return getTaskDefinition(taskId)?.id ?? taskId;
}

function syncCollectedTaskTargets(state: GameState): GameState {
  if (!state.taskId || !state.taskProgress) return state;

  const task = getTaskDefinition(state.taskId);
  const targetHexes = state.taskProgress.targetHexes ?? task?.targetHexes;
  if (!targetHexes?.length) return state;

  const nextCollectedKeys = new Set(state.taskProgress.collectedTargetKeys);

  for (const targetHex of targetHexes) {
    const targetKey = axialToKey(targetHex.position);
    if (nextCollectedKeys.has(targetKey)) continue;

    const cell = getCell(state.grid, targetHex.position);
    if (!cell || cell.colorIndex === null) {
      nextCollectedKeys.add(targetKey);
    }
  }

  if (nextCollectedKeys.size === state.taskProgress.collectedTargetKeys.size) {
    return state;
  }

  return {
    ...state,
    taskProgress: {
      ...state.taskProgress,
      collectedTargetKeys: nextCollectedKeys,
    },
  };
}

// ─── Command Types ────────────────────────────────────────────────────────────

export type GameCommand =
  // Game loop
  | { type: 'TICK'; rng?: () => number }
  // Movement
  | { type: 'MOVE_CURSOR_DELTA'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DELTA_ON_ACTIVE'; dq: number; dr: number }
  | { type: 'MOVE_CURSOR_DIRECTION'; dirIndex: number }
  | { type: 'PREVIEW_FOCUS_AT'; target: Axial }
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
  // Tasks
  | { type: 'SELECT_TASK'; taskId: string | null }
  | { type: 'START_TASK'; taskId: string; forceReset?: boolean }
  | { type: 'MARK_TASK_TARGET_VISITED'; key: string }
  | { type: 'COMPLETE_TASK'; taskId: string }
  | { type: 'SET_TASK_INTERACTION_MODE'; mode: 'desktop' | 'mobile' }
  // Legacy tutorial aliases
  | { type: 'SET_TUTORIAL_LEVEL'; levelId: string | null; forceReset?: boolean }
  | { type: 'MARK_TUTORIAL_TARGET_VISITED'; key: string }
  | { type: 'COMPLETE_TUTORIAL_LEVEL'; levelId: string; nextLevelId: string | null }
  | { type: 'SET_TUTORIAL_INTERACTION_MODE'; mode: 'desktop' | 'mobile' }
  // Layer navigation
  | { type: 'SWITCH_LAYER'; delta: 1 | -1 }
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
  let nextState: GameState;

  switch (command.type) {
    case 'TICK':
      nextState = tick(state, params, command.rng);
      break;

    case 'MOVE_CURSOR_DELTA':
      nextState = attemptMoveByDelta(state, params, command.dq, command.dr);
      break;

    case 'MOVE_CURSOR_DELTA_ON_ACTIVE':
      nextState = attemptMoveByDeltaOnActive(state, params, command.dq, command.dr);
      break;

    case 'MOVE_CURSOR_DIRECTION':
      nextState = attemptMoveByDirectionIndex(state, params, command.dirIndex);
      break;

    case 'PREVIEW_FOCUS_AT':
      nextState = (state.focus.q === command.target.q && state.focus.r === command.target.r)
        ? state
        : { ...state, focus: { ...command.target } };
      break;

    case 'MOVE_CURSOR_TO':
      nextState = attemptMoveTo(state, params, command.target);
      break;

    case 'ACTION_PRESSED':
      nextState = performContextAction(state, params);
      break;

    case 'EAT_REQUESTED':
      nextState = eatToHotbar(state, params);
      break;

    case 'TOGGLE_INVENTORY': {
      const next = state.activeField === 'inventory' ? 'world' : 'inventory';
      nextState = { ...state, activeField: next };
      break;
    }

    case 'SET_ACTIVE_FIELD':
      nextState = { ...state, activeField: command.field };
      break;

    case 'SET_HOTBAR_INDEX':
      nextState = { ...state, selectedHotbarIndex: command.index };
      break;

    case 'EXCHANGE_HOTBAR_SLOT':
      nextState = exchangeWithHotbarSlot(state, params, command.slotIndex);
      break;

    case 'START_DRAG':
      nextState = startDrag(state);
      break;

    case 'END_DRAG':
      nextState = endDrag(state);
      break;

    case 'DRAG_MOVE':
      nextState = dragMoveProtagonist(state, params, command.dq, command.dr);
      break;

    case 'ACTIVATE_TEMPLATE':
      nextState = activateTemplate(state, command.templateId);
      break;

    case 'DEACTIVATE_TEMPLATE':
      nextState = deactivateTemplate(state);
      break;

    case 'SELECT_TASK': {
      const taskId = normalizeTaskId(command.taskId);
      if (!taskId) {
        nextState = !state.taskId && !state.taskProgress
          ? state
          : { ...state, taskId: null, taskProgress: undefined };
        break;
      }

      if (state.taskId === taskId && !state.taskProgress) {
        nextState = state;
        break;
      }

      nextState = {
        ...state,
        taskId,
        taskProgress: undefined,
      };
      break;
    }

    case 'START_TASK': {
      const taskId = normalizeTaskId(command.taskId);
      if (!taskId) {
        nextState = state;
        break;
      }

      if (state.taskId === taskId && state.taskProgress && !command.forceReset) {
        nextState = state;
        break;
      }

      const resolvedTargets = resolveTaskTargets(state, params, taskId);
      const preparedState = applyTaskSetup(state, params, taskId, resolvedTargets);
      const updatedCompletedIds = new Set(preparedState.taskCompletedIds ?? []);
      if (command.forceReset) {
        updatedCompletedIds.delete(taskId);
      }

      nextState = {
        ...preparedState,
        taskId,
        taskCompletedIds: updatedCompletedIds,
        taskProgress: {
          visitedTargetKeys: new Set(),
          collectedTargetKeys: new Set(),
          targetCells: resolvedTargets.targetCells,
          targetHexes: resolvedTargets.targetHexes,
          startTick: state.tick,
        },
      };
      break;
    }

    case 'MARK_TASK_TARGET_VISITED': {
      if (!state.taskProgress) {
        nextState = state;
        break;
      }
      if (state.taskProgress.visitedTargetKeys.has(command.key)) {
        nextState = state;
        break;
      }

      const nextVisited = new Set(state.taskProgress.visitedTargetKeys);
      nextVisited.add(command.key);

      nextState = {
        ...state,
        taskProgress: { ...state.taskProgress, visitedTargetKeys: nextVisited },
      };
      break;
    }

    case 'COMPLETE_TASK': {
      const taskId = normalizeTaskId(command.taskId);
      if (!taskId) {
        nextState = state;
        break;
      }

      const completedSet = new Set(state.taskCompletedIds ?? []);
      completedSet.add(taskId);
      const progress = state.taskProgress;
      const nextProgress = progress && !progress.completedAtTick
        ? { ...progress, completedAtTick: state.tick }
        : progress;
      nextState = {
        ...state,
        taskCompletedIds: completedSet,
        taskProgress: nextProgress,
        taskId: getNextTaskDefinition(taskId)?.id ?? null,
      };
      nextState = {
        ...nextState,
        taskProgress: undefined,
      };
      break;
    }

    case 'SET_TASK_INTERACTION_MODE':
      nextState = { ...state, taskInteractionMode: command.mode };
      break;

    case 'SET_TUTORIAL_LEVEL': {
      const legacyTaskId = normalizeTaskId(command.levelId);
      if (!legacyTaskId) {
        nextState = !state.taskId && !state.taskProgress
          ? state
          : { ...state, taskId: null, taskProgress: undefined };
        break;
      }

      const resolvedTargets = resolveTaskTargets(state, params, legacyTaskId);
      const preparedState = applyTaskSetup(state, params, legacyTaskId, resolvedTargets);
      const updatedCompletedIds = new Set(preparedState.taskCompletedIds ?? []);
      if (command.forceReset) {
        updatedCompletedIds.delete(legacyTaskId);
      }

      nextState = {
        ...preparedState,
        taskId: legacyTaskId,
        taskCompletedIds: updatedCompletedIds,
        taskProgress: {
          visitedTargetKeys: new Set(),
          collectedTargetKeys: new Set(),
          targetCells: resolvedTargets.targetCells,
          targetHexes: resolvedTargets.targetHexes,
          startTick: state.tick,
        },
      };
      break;
    }

    case 'MARK_TUTORIAL_TARGET_VISITED': {
      if (!state.taskProgress) {
        nextState = state;
        break;
      }

      if (state.taskProgress.visitedTargetKeys.has(command.key)) {
        nextState = state;
        break;
      }

      const nextVisited = new Set(state.taskProgress.visitedTargetKeys);
      nextVisited.add(command.key);
      nextState = {
        ...state,
        taskProgress: { ...state.taskProgress, visitedTargetKeys: nextVisited },
      };
      break;
    }

    case 'COMPLETE_TUTORIAL_LEVEL': {
      const taskId = normalizeTaskId(command.levelId);
      if (!taskId) {
        nextState = state;
        break;
      }

      const completedSet = new Set(state.taskCompletedIds ?? []);
      completedSet.add(taskId);
      const progress = state.taskProgress;
      const nextProgress = progress && !progress.completedAtTick
        ? { ...progress, completedAtTick: state.tick }
        : progress;
      nextState = {
        ...state,
        taskCompletedIds: completedSet,
        taskProgress: undefined,
        taskId: normalizeTaskId(command.nextLevelId) ?? null,
      };
      if (nextProgress) {
        nextState = {
          ...nextState,
          taskProgress: undefined,
        };
      }
      break;
    }

    case 'SET_TUTORIAL_INTERACTION_MODE':
      nextState = { ...state, taskInteractionMode: command.mode };
      break;

    case 'SWITCH_LAYER': {
      const MIN_LAYER = -2;
      const MAX_LAYER = 2;
      const currentLayerIndex = state.activeLayerIndex ?? 0;
      const newLayerIndex = Math.max(MIN_LAYER, Math.min(MAX_LAYER, currentLayerIndex + command.delta));
      if (newLayerIndex === currentLayerIndex) {
        nextState = state;
        break;
      }
      // Save current grid into layerGrids, load new layer's grid
      const savedLayerGrids = { ...(state.layerGrids ?? {}), [currentLayerIndex]: state.grid };
      const newGrid = savedLayerGrids[newLayerIndex] ?? new Map();
      const transformedProtagonist = projectAxialBetweenLayers(state.protagonist, currentLayerIndex, newLayerIndex);
      const transformedWorldViewCenter = projectAxialBetweenLayers(
        state.worldViewCenter ?? state.protagonist,
        currentLayerIndex,
        newLayerIndex,
      );
      const switchedState: GameState = {
        ...state,
        activeLayerIndex: newLayerIndex,
        layerGrids: savedLayerGrids,
        grid: newGrid,
        protagonist: transformedProtagonist,
        worldViewCenter: transformedWorldViewCenter,
        autoFocusTarget: null,
        autoMoveTarget: null,
        autoMoveTicksRemaining: 0,
        autoMoveTargetDir: null,
        autoMovePath: undefined,
      };
      nextState = updateFocusPosition(switchedState);
      break;
    }

    case 'RESET_STATE':
      nextState = command.newState;
      break;

    default:
      nextState = state;
      break;
  }

  return syncCollectedTaskTargets(nextState);
}
