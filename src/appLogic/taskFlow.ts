import type { GameState, Axial } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { getFirstTaskDefinition, getNextTaskDefinition, getTaskDefinition, TASK_ORDER } from '../tasks/taskLevels';
import { axialToKey, type TaskDefinition } from '../tasks/taskState';

const TASK_SEQUENCE_COMPLETED_KEY = 'hexigame.task.started';
const LEGACY_TASK_SEQUENCE_COMPLETED_KEY = 'hexigame.tutorial.started';

export interface TaskFlowStorageReader {
  getItem: (key: string) => string | null;
}

export interface TaskFlowStorageWriter {
  setItem: (key: string, value: string) => void;
}

export interface TaskFlowUiGate {
  isLabLocked: boolean;
  hideHotbar: boolean;
  canShowPaletteWidget: boolean;
  canShowStructureWidget: boolean;
}

export interface TaskViewModel {
  task: TaskDefinition | null;
  targetKeys: string[];
  visitedTargetCount: number;
  progressCurrent: number;
  progressTotal: number;
  progressLabelKey: string;
  isTaskComplete: boolean;
  isLabLocked: boolean;
  completedTaskIds: Set<string>;
}

function getTaskIndex(taskId: string | null): number {
  if (!taskId) return -1;
  return TASK_ORDER.indexOf(taskId);
}

export function hasTaskSequenceBeenCompleted(storage: TaskFlowStorageReader): boolean {
  return !!(storage.getItem(TASK_SEQUENCE_COMPLETED_KEY) ?? storage.getItem(LEGACY_TASK_SEQUENCE_COMPLETED_KEY));
}

export function markTaskSequenceCompleted(storage: TaskFlowStorageWriter): void {
  storage.setItem(TASK_SEQUENCE_COMPLETED_KEY, '1');
}

export function getInitialPendingTaskId(
  completedTaskIds: Set<string>,
  storage: TaskFlowStorageReader,
): string | null {
  if (completedTaskIds.size > 0) {
    const remaining = TASK_ORDER.find(taskId => !completedTaskIds.has(taskId));
    return remaining ?? null;
  }

  if (hasTaskSequenceBeenCompleted(storage)) {
    return null;
  }

  return getFirstTaskDefinition().id;
}

export function computeTaskViewModel(
  currentTaskId: string | null,
  gameState: GameState,
  params: Params,
): TaskViewModel {
  const task = currentTaskId ? getTaskDefinition(currentTaskId) : null;
  const targetCells = gameState.taskProgress?.targetCells ?? task?.targetCells ?? [];
  const targetKeys = targetCells.map(axialToKey);
  const visitedTargetCount = gameState.taskProgress
    ? targetKeys.filter(key => gameState.taskProgress?.visitedTargetKeys.has(key)).length
    : 0;
  const progress = task && gameState.taskProgress
    ? (task.getProgress
      ? task.getProgress(gameState, params, gameState.taskProgress)
      : {
          current: visitedTargetCount,
          total: targetKeys.length,
          labelKey: 'task.cellsVisited',
        })
    : {
        current: 0,
        total: 0,
        labelKey: 'task.cellsVisited',
      };
  const isTaskComplete = !!task && !!gameState.taskProgress
    ? task.winCondition(gameState, params, gameState.taskProgress)
    : false;
  const completedTaskIds = gameState.taskCompletedIds ?? new Set<string>();

  return {
    task,
    targetKeys,
    visitedTargetCount,
    progressCurrent: progress.current,
    progressTotal: progress.total,
    progressLabelKey: progress.labelKey,
    isTaskComplete,
    isLabLocked: task?.disableInventory ?? false,
    completedTaskIds,
  };
}

export function getTaskWidgetPhase(
  currentTaskId: string | null,
  taskProgress: GameState['taskProgress'],
  isTaskComplete: boolean,
): 'hidden' | 'pending' | 'active' | 'complete' {
  if (!currentTaskId) return 'hidden';
  if (!taskProgress) return 'pending';
  return isTaskComplete ? 'complete' : 'active';
}

export function canOpenTaskIntroModal(phase: 'hidden' | 'pending' | 'active' | 'complete'): boolean {
  return phase === 'pending';
}

export function getNextPendingTaskId(completedTaskId: string): string | null {
  return getNextTaskDefinition(completedTaskId)?.id ?? null;
}

function getProgressIndex(currentTaskId: string | null, completedTaskIds: Set<string>): number {
  const currentIndex = getTaskIndex(currentTaskId);
  if (currentIndex !== -1) return currentIndex;

  for (let index = TASK_ORDER.length - 1; index >= 0; index -= 1) {
    if (completedTaskIds.has(TASK_ORDER[index])) {
      return index;
    }
  }

  return -1;
}

export function getTaskUiGate(
  currentTaskId: string | null,
  taskProgress: GameState['taskProgress'],
  completedTaskIds: Set<string> = new Set<string>(),
): TaskFlowUiGate {
  const progressIndex = getProgressIndex(currentTaskId, completedTaskIds);
  const taskIndex = getTaskIndex(currentTaskId);
  const hasCompletedColorHunt = completedTaskIds.has('task_2_collect_beyond_visibility');
  const isColorHuntActive = currentTaskId === 'task_2_collect_beyond_visibility' && !!taskProgress;
  const hasMovedPastColorHunt = taskIndex >= 2;
  const hotbarUnlocked = hasCompletedColorHunt || isColorHuntActive || hasMovedPastColorHunt;

  return {
    isLabLocked: !hotbarUnlocked,
    hideHotbar: !hotbarUnlocked,
    canShowPaletteWidget: progressIndex >= 3,
    canShowStructureWidget: progressIndex >= 4,
  };
}

export function shouldTrackFocusVisit(
  taskId: string | null,
  gameState: GameState,
  isMobileLayout: boolean,
  mobileTab: string,
): boolean {
  if (!taskId || !gameState.taskProgress) return false;
  if (gameState.activeField === 'inventory') return false;
  if (isMobileLayout && mobileTab !== 'map') return false;

  const task = getTaskDefinition(taskId);
  const targetCells = gameState.taskProgress?.targetCells ?? task?.targetCells;
  const targetHexes = gameState.taskProgress?.targetHexes ?? task?.targetHexes;

  if (!targetCells || targetCells.length === 0) return false;
  if (targetHexes && targetHexes.length > 0) return false;

  return true;
}

export function checkFocusTargetVisit(
  taskId: string,
  focus: Axial,
  visitedKeys: Set<string>,
  targetCellsOverride?: Axial[],
): string | null {
  const task = getTaskDefinition(taskId);
  const targetCells = targetCellsOverride ?? task?.targetCells;
  if (!targetCells) return null;

  const focusKey = axialToKey(focus);
  const targetKeys = targetCells.map(axialToKey);

  if (!targetKeys.includes(focusKey)) return null;
  if (visitedKeys.has(focusKey)) return null;

  return focusKey;
}