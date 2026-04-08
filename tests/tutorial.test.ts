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
import { getTaskUiGate, shouldTrackFocusVisit } from '../src/appLogic/taskFlow';

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
  it('does not inject color-hunt targets and keeps protagonist position and hotbar intact', () => {
    const { params, state } = createEmptyState();
    const baseState = {
      ...state,
      protagonist: { q: 5, r: -2 },
      focus: { q: 6, r: -2 },
      hotbarSlots: [1, 2, 3, null, null, null],
      selectedHotbarIndex: 2,
    };
    const preparedState = applyTaskSetup(baseState, params, 'task_2_collect_beyond_visibility');
    const task = getTaskDefinition('task_2_collect_beyond_visibility');
    const progress = task?.getProgress?.(preparedState, params, createTaskProgressData());

    expect(preparedState.protagonist).toEqual(baseState.protagonist);
    expect(preparedState.focus).toEqual(baseState.focus);
    expect(preparedState.hotbarSlots).toEqual(baseState.hotbarSlots);
    expect(preparedState.selectedHotbarIndex).toBe(baseState.selectedHotbarIndex);
    expect(
      TASK_COLOR_HUNT_TARGETS.every(({ position }) => getCell(preparedState.grid, position)?.colorIndex === null),
    ).toBe(true);
    expect(progress).toEqual({
      current: 0,
      total: TASK_COLOR_HUNT_TARGETS.length,
      labelKey: 'task.targetHexesCollected',
    });
  });

  it('does not force template deactivation for the opposite-color task', () => {
    const { params, state } = createEmptyState();
    const withActiveTemplate = applyTaskSetup(state, params, 'task_5_yin_yang');
    const preparedState = applyTaskSetup(withActiveTemplate, params, 'task_4_collect_opposites');

    expect(preparedState.activeTemplate?.templateId).toBe(withActiveTemplate.activeTemplate?.templateId);
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

  it('requires 3 and 3 opposite colors in the hotbar for task four', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_4_collect_opposites');
    const paletteSize = params.ColorPalette.length;
    const colorIndex = (params.PlayerBaseColorIndex + 2) % paletteSize;
    const oppositeColorIndex = (colorIndex + paletteSize / 2) % paletteSize;
    const preparedState = {
      ...applyTaskSetup(state, params, 'task_4_collect_opposites'),
      hotbarSlots: [colorIndex, colorIndex, colorIndex, oppositeColorIndex, oppositeColorIndex, oppositeColorIndex],
    };

    expect(task?.getProgress?.(preparedState, params, createTaskProgressData())).toEqual({
      current: 6,
      total: 6,
      labelKey: 'task.oppositeColorsCollected',
    });
    expect(task?.winCondition(preparedState, params, createTaskProgressData())).toBe(true);
  });

  it('does not complete task four when one side has fewer than 3 hexes', () => {
    const { params, state } = createEmptyState();
    const task = getTaskDefinition('task_4_collect_opposites');
    const paletteSize = params.ColorPalette.length;
    const colorIndex = (params.PlayerBaseColorIndex + 1) % paletteSize;
    const oppositeColorIndex = (colorIndex + paletteSize / 2) % paletteSize;
    const preparedState = {
      ...applyTaskSetup(state, params, 'task_4_collect_opposites'),
      hotbarSlots: [colorIndex, colorIndex, oppositeColorIndex, oppositeColorIndex, oppositeColorIndex, null],
    };

    expect(task?.getProgress?.(preparedState, params, createTaskProgressData())).toEqual({
      current: 5,
      total: 6,
      labelKey: 'task.oppositeColorsCollected',
    });
    expect(task?.winCondition(preparedState, params, createTaskProgressData())).toBe(false);
  });

  it('completes excavation when the hidden core cell is removed from the map', () => {
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
    };

    expect(task?.getProgress?.(completedState, params, createTaskProgressData())).toEqual({
      current: 1,
      total: 1,
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

describe('Task flow gates', () => {
  it('keeps hotbar and Lab locked until task two is actually started', () => {
    const completedBeforeTask2 = new Set<string>(['task_1_explore']);

    const pendingTask2Gate = getTaskUiGate(
      'task_2_collect_beyond_visibility',
      undefined,
      completedBeforeTask2,
    );

    expect(pendingTask2Gate.hideHotbar).toBe(true);
    expect(pendingTask2Gate.isLabLocked).toBe(true);

    const activeTask2Gate = getTaskUiGate(
      'task_2_collect_beyond_visibility',
      createTaskProgressData(),
      completedBeforeTask2,
    );

    expect(activeTask2Gate.hideHotbar).toBe(false);
    expect(activeTask2Gate.isLabLocked).toBe(false);
  });

  it('does not treat target-hex collection task as visit-tracked focus task', () => {
    const { state } = createEmptyState();

    const colorHuntState = {
      ...state,
      taskProgress: createTaskProgressData(),
      activeField: 'world' as const,
    };

    expect(shouldTrackFocusVisit('task_2_collect_beyond_visibility', colorHuntState, true, 'map')).toBe(false);
    expect(shouldTrackFocusVisit('task_1_explore', colorHuntState, true, 'map')).toBe(true);
  });
});