import type { Axial, Cell, GameState, Grid } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { activateTemplate } from '../gameLogic/systems/template';
import { addAxial, axialDirections, axialDistance, updateCells } from '../gameLogic/core/grid';

export const TUTORIAL_START: Axial = { q: 0, r: 0 };
export const TUTORIAL_FACING_DIR_INDEX = 1;

export const TUTORIAL_NAVIGATION_TARGETS: Axial[] = [
  { q: 1, r: -4 },
  { q: 5, r: -1 },
  { q: -4, r: 3 },
];

export const TUTORIAL_EXCAVATION_LAYERS: Axial[] = [
  { q: 1, r: -1 },
  { q: 2, r: -2 },
  { q: 3, r: -3 },
];

export const TUTORIAL_EXCAVATION_TARGET: Axial = { q: 4, r: -4 };
export const TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX = 3;

const TUTORIAL_SHELTER_SUPPLY: Axial[] = [
  { q: 3, r: 0 },
  { q: 4, r: -1 },
  { q: 5, r: -2 },
  { q: 4, r: 0 },
  { q: 5, r: -1 },
  { q: 3, r: 1 },
  { q: 4, r: 1 },
];

const TUTORIAL_YIN_YANG_BASE_SUPPLY: Axial[] = [
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

const TUTORIAL_YIN_YANG_OPPOSITE_SUPPLY: Axial[] = [
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

const TUTORIAL_RAINBOW_SUPPLY: Array<{ position: Axial; colorIndex: number }> = [
  { position: { q: -5, r: 2 }, colorIndex: 0 },
  { position: { q: -4, r: 1 }, colorIndex: 0 },
  { position: { q: -5, r: 0 }, colorIndex: 1 },
  { position: { q: -4, r: -1 }, colorIndex: 1 },
  { position: { q: -5, r: -2 }, colorIndex: 2 },
  { position: { q: -4, r: -3 }, colorIndex: 2 },
  { position: { q: 4, r: 1 }, colorIndex: 3 },
  { position: { q: 5, r: 0 }, colorIndex: 3 },
  { position: { q: 4, r: -1 }, colorIndex: 4 },
  { position: { q: 5, r: -2 }, colorIndex: 4 },
  { position: { q: 4, r: -3 }, colorIndex: 5 },
  { position: { q: 5, r: -4 }, colorIndex: 5 },
];

function createEmptyDisk(center: Axial, radius: number): Cell[] {
  const cells: Cell[] = [];
  for (let q = center.q - radius; q <= center.q + radius; q++) {
    for (let r = center.r - radius; r <= center.r + radius; r++) {
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

function createTutorialBaseState(state: GameState, params: Params): GameState {
  const startFocus = addAxial(TUTORIAL_START, axialDirections[TUTORIAL_FACING_DIR_INDEX]);
  const cameraOffset = Math.max(0, params.GridRadius - 3);
  const forwardDir = axialDirections[TUTORIAL_FACING_DIR_INDEX];

  return {
    ...state,
    protagonist: { ...TUTORIAL_START },
    focus: startFocus,
    facingDirIndex: TUTORIAL_FACING_DIR_INDEX,
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
    grid: updateCells(state.grid, createEmptyDisk(TUTORIAL_START, 8)),
    inventoryGrid: clearInventoryGrid(state.inventoryGrid),
    activeTemplate: null,
    worldViewCenter: {
      q: TUTORIAL_START.q + forwardDir.q * cameraOffset,
      r: TUTORIAL_START.r + forwardDir.r * cameraOffset,
    },
    cameraLastMoveTick: state.tick,
  };
}

function setColoredCells(state: GameState, coloredCells: Array<{ position: Axial; colorIndex: number }>): GameState {
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

export function applyTutorialLevelSetup(state: GameState, params: Params, levelId: string): GameState {
  let next = createTutorialBaseState(state, params);

  switch (levelId) {
    case 'tutorial_1_movement':
      return next;

    case 'tutorial_2_collect_colors': {
      const coloredCells = axialDirections.map((dir, index) => ({
        position: addAxial(TUTORIAL_START, dir),
        colorIndex: index % Math.max(1, params.ColorPalette.length),
      }));
      return setColoredCells(next, coloredCells);
    }

    case 'tutorial_3_excavation': {
      const layerCells = TUTORIAL_EXCAVATION_LAYERS.map((position, index) => ({
        position,
        colorIndex: index % 2,
      }));
      return setColoredCells(next, [
        ...layerCells,
        {
          position: TUTORIAL_EXCAVATION_TARGET,
          colorIndex: TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX,
        },
      ]);
    }

    case 'tutorial_4_shelter': {
      next = setColoredCells(
        next,
        TUTORIAL_SHELTER_SUPPLY.map(position => ({ position, colorIndex: 1 })),
      );
      return activateTemplate(next, 'horseshoe_shelter');
    }

    case 'tutorial_5_yin_yang': {
      next = setColoredCells(next, [
        ...TUTORIAL_YIN_YANG_BASE_SUPPLY.map(position => ({ position, colorIndex: 0 })),
        ...TUTORIAL_YIN_YANG_OPPOSITE_SUPPLY.map(position => ({
          position,
          colorIndex: Math.floor(params.ColorPalette.length / 2),
        })),
      ]);
      return activateTemplate(next, 'yin_yang_v2');
    }

    case 'tutorial_6_rainbow': {
      next = setColoredCells(
        next,
        TUTORIAL_RAINBOW_SUPPLY.map(({ position, colorIndex }) => ({
          position,
          colorIndex: colorIndex % Math.max(1, params.ColorPalette.length),
        })),
      );
      return activateTemplate(next, 'rainbow_spiral');
    }

    default:
      return next;
  }
}