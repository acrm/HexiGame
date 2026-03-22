import { describe, expect, it } from 'vitest';
import { createInitialState, DefaultParams, getCell, mulberry32, updateCells } from '../src/gameLogic';
import { getTaskDefinition } from '../src/tasks/taskLevels';
import { axialToKey } from '../src/tasks/taskState';
import {
  applyTaskSetup,
  TASK_COLOR_HUNT_TARGETS,
  TASK_EXCAVATION_CENTER,
  TASK_EXCAVATION_RING_1,
  TASK_EXCAVATION_RING_2,
  TASK_EXCAVATION_TARGET_COLOR_INDEX,
} from '../src/tasks/taskSandbox';

function createTaskProgressData({
  visitedTargetKeys = new Set<string>(),
  collectedTargetKeys = new Set<string>(),
}: {
  visitedTargetKeys?: Set<string>;
  collectedTargetKeys?: Set<string>;
} = {}) {
  return {
    visitedTargetKeys,
    collectedTargetKeys,
    startTick: 0,
  };
}

function createEmptyState() {
  const params = {
    ...DefaultParams,
    InitialColorProbability: 0,
  };

  return {
    params,
    state: createInitialState(params, mulberry32(123)),
  };
}

describe('Scripted task setup', () => {
  it('sets up the color-hunt task with empty hotbar and four marked hexes', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTaskSetup(state, params, 'task_2_collect_beyond_visibility');
    const task = getTaskDefinition('task_2_collect_beyond_visibility');
    const progress = task?.getProgress?.(preparedState, params, createTaskProgressData());

    expect(preparedState.hotbarSlots.every(slot => slot === null)).toBe(true);
    expect(
      TASK_COLOR_HUNT_TARGETS.every(({ position, colorIndex }) => getCell(preparedState.grid, position)?.colorIndex === colorIndex),
    ).toBe(true);
    expect(progress).toEqual({
      current: 0,
      total: TASK_COLOR_HUNT_TARGETS.length,
      labelKey: 'task.targetHexesCollected',
    });
  });

  it('keeps structure activation disabled for the opposite-color task', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTaskSetup(state, params, 'task_4_collect_opposites');

    expect(preparedState.activeTemplate).toBeNull();
  });

  it('activates the yin-yang template in the final task', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTaskSetup(state, params, 'task_5_yin_yang');

    expect(preparedState.activeTemplate?.templateId).toBe('yin_yang_v2');
  });
});

describe('Task win conditions', () => {
  it('counts all marked target hexes collected for the color-hunt task', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_2_collect_beyond_visibility');
    const collectedTargetKeys = new Set(
      TASK_COLOR_HUNT_TARGETS.map(({ position }) => axialToKey(position)),
    );
    const preparedState = {
      ...applyTaskSetup(state, params, 'task_2_collect_beyond_visibility'),
      taskProgress: createTaskProgressData({ collectedTargetKeys }),
    };

    expect(task?.getProgress?.(preparedState, params, preparedState.taskProgress)).toEqual({
      current: TASK_COLOR_HUNT_TARGETS.length,
      total: TASK_COLOR_HUNT_TARGETS.length,
      labelKey: 'task.targetHexesCollected',
    });
    expect(task?.winCondition(preparedState, params, preparedState.taskProgress)).toBe(true);
  });

  it('requires both opposite colors in the hotbar for task four', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_4_collect_opposites');
    const oppositeColorIndex = Math.floor(params.ColorPalette.length / 2);
    const preparedState = {
      ...applyTaskSetup(state, params, 'task_4_collect_opposites'),
      hotbarSlots: [0, oppositeColorIndex, null, null, null, null],
    };

    expect(task?.getProgress?.(preparedState, params, createTaskProgressData())).toEqual({
      current: 2,
      total: 2,
      labelKey: 'task.oppositeColorsCollected',
    });
    expect(task?.winCondition(preparedState, params, createTaskProgressData())).toBe(true);
  });

  it('requires the hidden excavation core to be extracted into the hotbar', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_3_excavate_rings');
    const excavationCells = [...TASK_EXCAVATION_RING_1, ...TASK_EXCAVATION_RING_2, TASK_EXCAVATION_CENTER];
    const preparedState = applyTaskSetup(state, params, 'task_3_excavate_rings');
    const completedState = {
      ...preparedState,
      grid: updateCells(
        preparedState.grid,
        excavationCells.map(cell => ({
          q: cell.q,
          r: cell.r,
          colorIndex: null,
        })),
      ),
      hotbarSlots: [TASK_EXCAVATION_TARGET_COLOR_INDEX, null, null, null, null, null],
    };

    expect(task?.getProgress?.(completedState, params, createTaskProgressData())).toEqual({
      current: excavationCells.length,
      total: excavationCells.length,
      labelKey: 'task.cellsCleared',
    });
    expect(task?.winCondition(completedState, params, createTaskProgressData())).toBe(true);
  });

  it('keeps excavation incomplete until the hidden core is removed', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_3_excavate_rings');
    const preparedState = applyTaskSetup(state, params, 'task_3_excavate_rings');

    expect(getCell(preparedState.grid, TASK_EXCAVATION_CENTER)?.colorIndex).toBe(TASK_EXCAVATION_TARGET_COLOR_INDEX);
    expect(task?.winCondition(preparedState, params, createTaskProgressData())).toBe(false);
  });
});