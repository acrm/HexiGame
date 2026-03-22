import type { Axial, Cell, GameState, Grid } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { activateTemplate } from '../gameLogic/systems/template';
import { addAxial, axialDirections, axialDistance, updateCells } from '../gameLogic/core/grid';
import type { TaskTargetHex } from './taskState';

export const TASK_START: Axial = { q: 0, r: 0 };
export const TASK_FACING_DIR_INDEX = 1;

export const TASK_EXPLORATION_TARGETS: Axial[] = [
  { q: 1, r: -4 },
  { q: 5, r: -1 },
  { q: -4, r: 3 },
];

export const TASK_COLOR_HUNT_TARGETS: TaskTargetHex[] = [
  { position: { q: 7, r: -3 }, colorIndex: 0 },
  { position: { q: 6, r: 1 }, colorIndex: 1 },
  { position: { q: -2, r: 7 }, colorIndex: 2 },
  { position: { q: -7, r: 4 }, colorIndex: 3 },
];

export const TASK_EXCAVATION_CENTER: Axial = { q: 4, r: -4 };
export const TASK_EXCAVATION_TARGET_COLOR_INDEX = 3;

function createRing(center: Axial, radius: number): Axial[] {
  const ring: Axial[] = [];

  for (let q = center.q - radius; q <= center.q + radius; q += 1) {
    for (let r = center.r - radius; r <= center.r + radius; r += 1) {
      const cell = { q, r };
      if (axialDistance(center, cell) === radius) {
        ring.push(cell);
      }
    }
  }

  return ring;
}

export const TASK_EXCAVATION_RING_1: Axial[] = createRing(TASK_EXCAVATION_CENTER, 1);
export const TASK_EXCAVATION_RING_2: Axial[] = createRing(TASK_EXCAVATION_CENTER, 2);

const TASK_OPPOSITE_BASE_SUPPLY: Axial[] = [
  { q: 3, r: 1 },
  { q: 3, r: -1 },
  { q: 3, r: -3 },
  { q: 4, r: 0 },
  { q: 4, r: -2 },
  { q: 4, r: -4 },
];

const TASK_OPPOSITE_SUPPLY: Axial[] = [
  { q: -3, r: 2 },
  { q: -3, r: 0 },
  { q: -3, r: -2 },
  { q: -4, r: 1 },
  { q: -4, r: -1 },
  { q: -4, r: -3 },
];

const TASK_YIN_YANG_BASE_SUPPLY: Axial[] = [
  { q: 3, r: 1 },
  { q: 3, r: -1 },
  { q: 3, r: -3 },
  { q: 4, r: 0 },
  { q: 4, r: -2 },
  { q: 4, r: -4 },
  { q: 5, r: 1 },
  { q: 5, r: -1 },
  { q: 5, r: -3 },
  { q: 6, r: -2 },
];

const TASK_YIN_YANG_OPPOSITE_SUPPLY: Axial[] = [
  { q: -3, r: 2 },
  { q: -3, r: 0 },
  { q: -3, r: -2 },
  { q: -4, r: 1 },
  { q: -4, r: -1 },
  { q: -4, r: -3 },
  { q: -5, r: 2 },
  { q: -5, r: 0 },
  { q: -5, r: -2 },
  { q: -6, r: -1 },
];

function createEmptyDisk(center: Axial, radius: number): Cell[] {
  const cells: Cell[] = [];

  for (let q = center.q - radius; q <= center.q + radius; q += 1) {
    for (let r = center.r - radius; r <= center.r + radius; r += 1) {
      if (axialDistance(center, { q, r }) > radius) continue;
      cells.push({ q, r, colorIndex: null });
    }
  }

  return cells;
}

function clearInventoryGrid(grid: Grid): Grid {
  return updateCells(
    grid,
    Array.from(grid.values()).map(cell => ({ ...cell, colorIndex: null })),
  );
}

function createTaskBaseState(state: GameState, params: Params): GameState {
  const startFocus = addAxial(TASK_START, axialDirections[TASK_FACING_DIR_INDEX]);
  const cameraOffset = Math.max(0, params.GridRadius - 3);
  const forwardDir = axialDirections[TASK_FACING_DIR_INDEX];

  return {
    ...state,
    protagonist: { ...TASK_START },
    focus: startFocus,
    facingDirIndex: TASK_FACING_DIR_INDEX,
    flash: null,
    invalidMoveTarget: null,
    activeField: 'world',
    hotbarSlots: [null, null, null, null, null, null],
    selectedHotbarIndex: 0,
    isDragging: false,
    autoMoveTarget: null,
    autoMoveTicksRemaining: 0,
    autoFocusTarget: null,
    autoMovePath: undefined,
    autoMoveTargetDir: null,
    grid: updateCells(state.grid, createEmptyDisk(TASK_START, 8)),
    inventoryGrid: clearInventoryGrid(state.inventoryGrid),
    activeTemplate: null,
    worldViewCenter: {
      q: TASK_START.q + forwardDir.q * cameraOffset,
      r: TASK_START.r + forwardDir.r * cameraOffset,
    },
    cameraLastMoveTick: state.tick,
    structureInstances: [],
  };
}

function setColoredCells(
  state: GameState,
  coloredCells: Array<{ position: Axial; colorIndex: number }>,
): GameState {
  return {
    ...state,
    grid: updateCells(
      state.grid,
      coloredCells.map(({ position, colorIndex }) => ({
        q: position.q,
        r: position.r,
        colorIndex,
      })),
    ),
  };
}

function buildExplorationClusters(): Array<{ position: Axial; colorIndex: number }> {
  return TASK_EXPLORATION_TARGETS.flatMap((target, index) => [
    { position: target, colorIndex: index % 3 },
    { position: addAxial(target, axialDirections[index]), colorIndex: (index + 1) % 4 },
    { position: addAxial(target, axialDirections[(index + 2) % axialDirections.length]), colorIndex: (index + 2) % 5 },
  ]);
}

export function applyTaskSetup(state: GameState, params: Params, taskId: string): GameState {
  let next = createTaskBaseState(state, params);
  const oppositeColorIndex = Math.floor(params.ColorPalette.length / 2);

  switch (taskId) {
    case 'task_1_explore':
      return setColoredCells(next, buildExplorationClusters());

    case 'task_2_collect_beyond_visibility':
      return setColoredCells(
        next,
        TASK_COLOR_HUNT_TARGETS.map(({ position, colorIndex }) => ({
          position,
          colorIndex: colorIndex % Math.max(1, params.ColorPalette.length),
        })),
      );

    case 'task_3_excavate_rings': {
      const ringOneCells = TASK_EXCAVATION_RING_1.map((position, index) => ({
        position,
        colorIndex: index % 2,
      }));
      const ringTwoCells = TASK_EXCAVATION_RING_2.map((position, index) => ({
        position,
        colorIndex: (index + 1) % 2,
      }));

      return setColoredCells(next, [
        ...ringOneCells,
        ...ringTwoCells,
        {
          position: TASK_EXCAVATION_CENTER,
          colorIndex: TASK_EXCAVATION_TARGET_COLOR_INDEX,
        },
      ]);
    }

    case 'task_4_collect_opposites':
      return setColoredCells(next, [
        ...TASK_OPPOSITE_BASE_SUPPLY.map(position => ({ position, colorIndex: 0 })),
        ...TASK_OPPOSITE_SUPPLY.map(position => ({
          position,
          colorIndex: oppositeColorIndex,
        })),
      ]);

    case 'task_5_yin_yang': {
      next = setColoredCells(next, [
        ...TASK_YIN_YANG_BASE_SUPPLY.map(position => ({ position, colorIndex: 0 })),
        ...TASK_YIN_YANG_OPPOSITE_SUPPLY.map(position => ({
          position,
          colorIndex: oppositeColorIndex,
        })),
      ]);
      return activateTemplate(next, 'yin_yang_v2');
    }

    default:
      return next;
  }
}

export const TUTORIAL_START = TASK_START;
export const TUTORIAL_FACING_DIR_INDEX = TASK_FACING_DIR_INDEX;
export const TUTORIAL_NAVIGATION_TARGETS = TASK_EXPLORATION_TARGETS;
export const TUTORIAL_EXCAVATION_LAYERS = [...TASK_EXCAVATION_RING_1, ...TASK_EXCAVATION_RING_2];
export const TUTORIAL_EXCAVATION_TARGET = TASK_EXCAVATION_CENTER;
export const TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX = TASK_EXCAVATION_TARGET_COLOR_INDEX;

export function applyTutorialLevelSetup(state: GameState, params: Params, levelId: string): GameState {
  const legacyToTaskId: Record<string, string> = {
    tutorial_1_movement: 'task_1_explore',
    tutorial_2_collect_colors: 'task_2_collect_beyond_visibility',
    tutorial_3_excavation: 'task_3_excavate_rings',
    tutorial_4_shelter: 'task_4_collect_opposites',
    tutorial_5_yin_yang: 'task_5_yin_yang',
  };

  return applyTaskSetup(state, params, legacyToTaskId[levelId] ?? levelId);
}