import type { Axial, GameState } from '../gameLogic/core/types';
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

export interface ResolvedTaskTargets {
  targetCells?: Axial[];
  targetHexes?: TaskTargetHex[];
}

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

export function getExcavationLayout(center: Axial): {
  center: Axial;
  ring1: Axial[];
  ring2: Axial[];
} {
  return {
    center,
    ring1: createRing(center, 1),
    ring2: createRing(center, 2),
  };
}

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

function getVisibilityContext(state: GameState, params: Params): {
  center: Axial;
  visibleRadius: number;
} {
  return {
    center: state.worldViewCenter ?? state.protagonist,
    visibleRadius: Math.max(1, params.GridRadius),
  };
}

function pickExplorationTargets(state: GameState, params: Params): Axial[] {
  const { center, visibleRadius } = getVisibilityContext(state, params);
  const protagonistKey = `${state.protagonist.q},${state.protagonist.r}`;
  const focusKey = `${state.focus.q},${state.focus.r}`;

  const candidates = Array.from(state.grid.values())
    .filter(cell => cell.colorIndex === null)
    .filter(cell => axialDistance(cell, center) <= visibleRadius)
    .map(cell => ({ q: cell.q, r: cell.r }))
    .filter(cell => {
      const key = `${cell.q},${cell.r}`;
      return key !== protagonistKey && key !== focusKey;
    })
    .sort((left, right) => {
      const distanceDelta = axialDistance(center, right) - axialDistance(center, left);
      if (distanceDelta !== 0) return distanceDelta;
      if (left.q !== right.q) return left.q - right.q;
      return left.r - right.r;
    });

  if (candidates.length === 0) {
    return TASK_EXPLORATION_TARGETS;
  }

  const selected: Axial[] = [];
  const remaining = [...candidates];

  while (selected.length < 3 && remaining.length > 0) {
    const next = remaining.shift()!;
    selected.push(next);
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (axialDistance(next, remaining[index]) < 2) {
        remaining.splice(index, 1);
      }
    }
  }

  for (const candidate of candidates) {
    if (selected.length >= 3) break;
    if (selected.some(cell => cell.q === candidate.q && cell.r === candidate.r)) continue;
    selected.push(candidate);
  }

  return selected.length > 0 ? selected.slice(0, 3) : TASK_EXPLORATION_TARGETS;
}

function pickColorHuntTargets(state: GameState, params: Params): TaskTargetHex[] {
  const { center, visibleRadius } = getVisibilityContext(state, params);
  const candidates = Array.from(state.grid.values())
    .filter(cell => cell.colorIndex !== null)
    .filter(cell => axialDistance(cell, center) > visibleRadius)
    .map(cell => ({
      position: { q: cell.q, r: cell.r },
      colorIndex: cell.colorIndex as number,
      distance: axialDistance(cell, center),
    }))
    .sort((left, right) => {
      if (left.distance !== right.distance) return left.distance - right.distance;
      if (left.position.q !== right.position.q) return left.position.q - right.position.q;
      return left.position.r - right.position.r;
    });

  const byColor = new Map<number, TaskTargetHex>();
  for (const candidate of candidates) {
    if (byColor.has(candidate.colorIndex)) continue;
    byColor.set(candidate.colorIndex, {
      position: candidate.position,
      colorIndex: candidate.colorIndex,
    });
  }

  const selected = Array.from(byColor.values()).slice(0, 4);
  if (selected.length >= 4) {
    return selected;
  }

  for (const candidate of candidates) {
    if (selected.length >= 4) break;
    const alreadySelected = selected.some(target => (
      target.position.q === candidate.position.q &&
      target.position.r === candidate.position.r
    ));
    if (alreadySelected) continue;
    selected.push({
      position: candidate.position,
      colorIndex: candidate.colorIndex,
    });
  }

  return selected.length > 0 ? selected : TASK_COLOR_HUNT_TARGETS;
}

function pickOffscreenExcavationCenter(state: GameState, params: Params): Axial {
  const { center, visibleRadius } = getVisibilityContext(state, params);
  const facing = axialDirections[((state.facingDirIndex % 6) + 6) % 6];
  const side = axialDirections[(state.facingDirIndex + 2) % 6];

  return {
    q: center.q + facing.q * (visibleRadius + 3) + side.q * 2,
    r: center.r + facing.r * (visibleRadius + 3) + side.r * 2,
  };
}

export function resolveTaskTargets(state: GameState, params: Params, taskId: string): ResolvedTaskTargets {
  switch (taskId) {
    case 'task_1_explore': {
      const targetCells = pickExplorationTargets(state, params);
      return { targetCells };
    }

    case 'task_2_collect_beyond_visibility': {
      const targetHexes = pickColorHuntTargets(state, params);
      return {
        targetHexes,
        targetCells: targetHexes.map(targetHex => targetHex.position),
      };
    }

    case 'task_3_excavate_rings':
      return { targetCells: [pickOffscreenExcavationCenter(state, params)] };

    default:
      return {};
  }
}

export function applyTaskSetup(
  state: GameState,
  params: Params,
  taskId: string,
  resolvedTargets: ResolvedTaskTargets = {},
): GameState {
  let next = state;
  const oppositeColorIndex = Math.floor(params.ColorPalette.length / 2);

  switch (taskId) {
    case 'task_1_explore':
      return next;

    case 'task_2_collect_beyond_visibility':
      return next;

    case 'task_3_excavate_rings': {
      const excavationCenter = resolvedTargets.targetCells?.[0] ?? TASK_EXCAVATION_CENTER;
      const excavationLayout = getExcavationLayout(excavationCenter);
      const ringOneCells = excavationLayout.ring1.map((position, index) => ({
        position,
        colorIndex: index % 2,
      }));
      const ringTwoCells = excavationLayout.ring2.map((position, index) => ({
        position,
        colorIndex: (index + 1) % 2,
      }));

      return setColoredCells(next, [
        ...ringOneCells,
        ...ringTwoCells,
        {
          position: excavationLayout.center,
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

  const taskId = legacyToTaskId[levelId] ?? levelId;
  return applyTaskSetup(state, params, taskId, resolveTaskTargets(state, params, taskId));
}