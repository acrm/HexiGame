import { describe, expect, it } from 'vitest';
import { createInitialState, DefaultParams, getCell, mulberry32, updateCells } from '../src/gameLogic';
import { getTutorialLevel } from '../src/tutorial/tutorialLevels';
import {
  applyTutorialLevelSetup,
  TUTORIAL_EXCAVATION_LAYERS,
  TUTORIAL_EXCAVATION_TARGET,
  TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX,
} from '../src/tutorial/tutorialSandbox';

function createTutorialProgressData() {
  return {
    visitedTargetKeys: new Set<string>(),
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

describe('Scripted tutorial setup', () => {
  it('sets up collection level with empty hotbar and six collectible colors', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTutorialLevelSetup(state, params, 'tutorial_2_collect_colors');
    const level = getTutorialLevel('tutorial_2_collect_colors');
    const progress = level?.getProgress?.(preparedState, params, createTutorialProgressData());

    expect(preparedState.hotbarSlots.every(slot => slot === null)).toBe(true);
    expect(progress).toEqual({
      current: 0,
      total: params.ColorPalette.length,
      labelKey: 'tutorial.colorsCollected',
    });
  });

  it('activates the shelter template in the shelter tutorial', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTutorialLevelSetup(state, params, 'tutorial_4_shelter');

    expect(preparedState.activeTemplate?.templateId).toBe('horseshoe_shelter');
  });

  it('activates the yin-yang template in the yin-yang tutorial', () => {
    const { params, state } = createEmptyState();
    const preparedState = applyTutorialLevelSetup(state, params, 'tutorial_5_yin_yang');

    expect(preparedState.activeTemplate?.templateId).toBe('yin_yang_v2');
  });
});

describe('Tutorial win conditions', () => {
  it('counts all collected colors currently in the hotbar', () => {
    const { params, state } = createEmptyState();
    const level = getTutorialLevel('tutorial_2_collect_colors');
    const preparedState = {
      ...applyTutorialLevelSetup(state, params, 'tutorial_2_collect_colors'),
      hotbarSlots: [0, 1, 2, 3, 4, 5],
    };

    expect(level?.winCondition(preparedState, params, createTutorialProgressData())).toBe(true);
  });

  it('requires the hidden excavation hex to be extracted into the hotbar', () => {
    const { params, state } = createEmptyState();
    const level = getTutorialLevel('tutorial_3_excavation');
    const emptiedCells = [...TUTORIAL_EXCAVATION_LAYERS, TUTORIAL_EXCAVATION_TARGET].map(cell => ({
      q: cell.q,
      r: cell.r,
      colorIndex: null,
    }));
    const preparedState = {
      ...applyTutorialLevelSetup(state, params, 'tutorial_3_excavation'),
      grid: updateCells(state.grid, emptiedCells),
      hotbarSlots: [TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX, null, null, null, null, null],
    };

    expect(level?.getProgress?.(preparedState, params, createTutorialProgressData())).toEqual({
      current: 4,
      total: 4,
      labelKey: 'tutorial.cellsCleared',
    });
    expect(level?.winCondition(preparedState, params, createTutorialProgressData())).toBe(true);
  });

  it('keeps excavation incomplete until the hidden target is removed', () => {
    const { params, state } = createEmptyState();
    const level = getTutorialLevel('tutorial_3_excavation');
    const preparedState = applyTutorialLevelSetup(state, params, 'tutorial_3_excavation');

    expect(getCell(preparedState.grid, TUTORIAL_EXCAVATION_TARGET)?.colorIndex).toBe(TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX);
    expect(level?.winCondition(preparedState, params, createTutorialProgressData())).toBe(false);
  });
});