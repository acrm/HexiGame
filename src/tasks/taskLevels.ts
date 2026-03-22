import type { GameState } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { getCell } from '../gameLogic/core/grid';
import { getTemplateById } from '../templates/templateLibrary';
import {
  TASK_COLOR_HUNT_TARGETS,
  TASK_EXCAVATION_CENTER,
  TASK_EXPLORATION_TARGETS,
  getExcavationLayout,
} from './taskSandbox';
import { TaskDefinition, TaskProgressMetrics, axialToKey } from './taskState';

function computeTemplateProgress(state: GameState, templateId: string): TaskProgressMetrics {
  const template = getTemplateById(templateId);
  const total = template?.structure.cells.length ?? 0;
  const current = state.activeTemplate?.templateId === templateId
    ? state.activeTemplate.filledCells.size
    : 0;

  return {
    current,
    total,
    labelKey: 'task.cellsPlaced',
  };
}

function computeExcavationProgress(state: GameState, center: { q: number; r: number }): TaskProgressMetrics {
  // Only count the center cell for progress
  const excavationLayout = getExcavationLayout(center);
  const centerCleared = getCell(state.grid, excavationLayout.center)?.colorIndex === null ? 1 : 0;
  return {
    current: centerCleared,
    total: 1,
    labelKey: 'task.cellsCleared',
  };
}

function countCollectedTargetHexes(state: GameState, targetKeys: Set<string>): number {
  const progress = state.taskProgress;
  if (!progress) return 0;
  return Array.from(progress.collectedTargetKeys).filter(key => targetKeys.has(key)).length;
}

function computeOppositePairProgress(state: GameState, paletteSize: number): number {
  if (paletteSize < 2 || paletteSize % 2 !== 0) return 0;

  const oppositeOffset = paletteSize / 2;
  const colorCounts = new Array<number>(paletteSize).fill(0);

  for (const slot of state.hotbarSlots) {
    if (slot === null) continue;
    if (slot < 0 || slot >= paletteSize) continue;
    colorCounts[slot] += 1;
  }

  let bestProgress = 0;

  for (let colorIndex = 0; colorIndex < oppositeOffset; colorIndex += 1) {
    const oppositeColorIndex = colorIndex + oppositeOffset;
    const current = Math.min(3, colorCounts[colorIndex]) + Math.min(3, colorCounts[oppositeColorIndex]);
    if (current > bestProgress) bestProgress = current;
  }

  return bestProgress;
}

function getTaskTargetHexes(state: GameState): Array<{ position: { q: number; r: number }; colorIndex: number }> {
  return state.taskProgress?.targetHexes ?? TASK_COLOR_HUNT_TARGETS;
}

export const task1Explore: TaskDefinition = {
  id: 'task_1_explore',
  name: { en: 'Explore', ru: 'Исследование' },
  setup: {
    en: 'The turtle wakes up in a living world and wants to understand what lies around the horizon.',
    ru: 'Черепашка просыпается в живом мире и хочет понять, что находится за горизонтом.',
  },
  objective: {
    en: 'Reach all 3 distant sectors and inspect them.',
    ru: 'Доберитесь до 3 дальних секторов и осмотрите их.',
  },
  hints: {
    desktop: {
      en: 'Open HexiMap and click a marked sector. The turtle will move to the nearest free cell.',
      ru: 'Откройте HexiMap и кликните по отмеченному сектору. Черепашка подойдёт к ближайшей свободной клетке.',
    },
    mobile: {
      en: 'Open HexiMap and tap a marked sector. The turtle will move to the nearest free cell.',
      ru: 'Откройте HexiMap и тапните по отмеченному сектору. Черепашка подойдёт к ближайшей свободной клетке.',
    },
  },
  targetCells: TASK_EXPLORATION_TARGETS,
  disableInventory: true,
  hideHotbar: true,
  getProgress: (_state, _params, progressData) => ({
    current: (progressData.targetCells ?? TASK_EXPLORATION_TARGETS)
      .filter(cell => progressData.visitedTargetKeys.has(axialToKey(cell))).length,
    total: (progressData.targetCells ?? TASK_EXPLORATION_TARGETS).length,
    labelKey: 'task.cellsVisited',
  }),
  winCondition: (_state, _params, progressData) => {
    const targetKeys = (progressData.targetCells ?? TASK_EXPLORATION_TARGETS).map(axialToKey);
    return targetKeys.every(key => progressData.visitedTargetKeys.has(key));
  },
};

export const task2CollectBeyondVisibility: TaskDefinition = {
  id: 'task_2_collect_beyond_visibility',
  name: { en: 'Hunt', ru: 'Поиск' },
  setup: {
    en: 'Four rare color hexes glimmer outside the current line of sight.',
    ru: 'Четыре редких цветных гекса мерцают за пределами текущей видимости.',
  },
  objective: {
    en: 'Collect all 4 marked color hexes hidden beyond visibility.',
    ru: 'Соберите все 4 отмеченных цветных гекса, скрытых за пределами видимости.',
  },
  hints: {
    desktop: {
      en: 'Walk beyond the visible edge, capture each marked hex, and keep moving until all four are secured.',
      ru: 'Идите за границу видимости, забирайте отмеченные гексы и продолжайте путь, пока не соберёте все четыре.',
    },
    mobile: {
      en: 'Walk beyond the visible edge, capture each marked hex, and keep moving until all four are secured.',
      ru: 'Идите за границу видимости, забирайте отмеченные гексы и продолжайте путь, пока не соберёте все четыре.',
    },
  },
  targetCells: TASK_COLOR_HUNT_TARGETS.map(({ position }) => position),
  targetHexes: TASK_COLOR_HUNT_TARGETS,
  getProgress: (state) => {
    const targetHexes = getTaskTargetHexes(state);
    const targetKeys = new Set(targetHexes.map(({ position }) => axialToKey(position)));

    return {
      current: countCollectedTargetHexes(state, targetKeys),
      total: targetHexes.length,
      labelKey: 'task.targetHexesCollected',
    };
  },
  winCondition: (state) => {
    const targetHexes = getTaskTargetHexes(state);
    const targetKeys = new Set(targetHexes.map(({ position }) => axialToKey(position)));
    return countCollectedTargetHexes(state, targetKeys) >= targetHexes.length;
  },
};

export const task3ExcavateRings: TaskDefinition = {
  id: 'task_3_excavate_rings',
  name: { en: 'Excavate', ru: 'Раскопки' },
  setup: {
    en: 'A bright core is trapped inside two concentric rings of debris somewhere beyond your current view.',
    ru: 'Яркое ядро зажато внутри двух концентрических колец завалов где-то за пределами текущего обзора.',
  },
  objective: {
    en: 'Find the layered site and clear the hidden core hex from the map.',
    ru: 'Найдите область со слоями и уберите скрытый центральный гекс с карты.',
  },
  hints: {
    desktop: {
      en: 'Follow the highlighted target cell, break both rings, then clear the center hex.',
      ru: 'Следуйте по подсвеченной целевой клетке, разберите оба кольца и очистите центральный гекс.',
    },
    mobile: {
      en: 'Follow the highlighted target cell, break both rings, then clear the center hex.',
      ru: 'Следуйте по подсвеченной целевой клетке, разберите оба кольца и очистите центральный гекс.',
    },
  },
  getProgress: (state, _params, progressData) => {
    const targetCenter = progressData.targetCells?.[0] ?? TASK_EXCAVATION_CENTER;
    return computeExcavationProgress(state, targetCenter);
  },
  winCondition: (state, _params, progressData) => {
    const targetCenter = progressData.targetCells?.[0] ?? TASK_EXCAVATION_CENTER;
    return getCell(state.grid, targetCenter)?.colorIndex === null;
  },
};

export const task4CollectOpposites: TaskDefinition = {
  id: 'task_4_collect_opposites',
  name: { en: 'Balance', ru: 'Баланс' },
  setup: {
    en: 'The turtle notices that each color has a counterweight on the other side of the palette.',
    ru: 'Черепашка замечает, что у каждого цвета есть противовес на другой стороне палитры.',
  },
  objective: {
    en: 'Collect 3 hexes of one color and 3 hexes of its opposite color in the hotbar.',
    ru: 'Соберите в хотбар 3 гекса одного цвета и 3 гекса противоположного ему цвета.',
  },
  hints: {
    desktop: {
      en: 'Choose any color, find the color exactly 50% away on the palette in either direction, then build a 3+3 pair in the hotbar.',
      ru: 'Выберите любой цвет, найдите цвет ровно в 50% палитры от него в любую сторону и соберите в хотбаре пару 3+3.',
    },
    mobile: {
      en: 'Choose any color, find the color exactly 50% away on the palette in either direction, then build a 3+3 pair in the hotbar.',
      ru: 'Выберите любой цвет, найдите цвет ровно в 50% палитры от него в любую сторону и соберите в хотбаре пару 3+3.',
    },
  },
  getProgress: (state, params) => {
    const current = computeOppositePairProgress(state, params.ColorPalette.length);

    return {
      current,
      total: 6,
      labelKey: 'task.oppositeColorsCollected',
    };
  },
  winCondition: (state, params) => {
    return computeOppositePairProgress(state, params.ColorPalette.length) >= 6;
  },
};

export const task5YinYang: TaskDefinition = {
  id: 'task_5_yin_yang',
  name: { en: 'Yin-Yang', ru: 'Инь-Янь' },
  setup: {
    en: 'With the opposite pair secured, the turtle can finally assemble the full Yin-Yang structure.',
    ru: 'Когда противоположная пара собрана, черепашка может наконец собрать полноценную структуру Инь-Янь.',
  },
  objective: {
    en: 'Complete the Yin-Yang structure using the two opposite colors.',
    ru: 'Завершите структуру Инь-Янь, используя два противоположных цвета.',
  },
  hints: {
    desktop: {
      en: 'Anchor the structure, keep the two colors separated correctly, and finish every cell.',
      ru: 'Зафиксируйте структуру, правильно разделите два цвета и заполните каждую клетку.',
    },
    mobile: {
      en: 'Anchor the structure, keep the two colors separated correctly, and finish every cell.',
      ru: 'Зафиксируйте структуру, правильно разделите два цвета и заполните каждую клетку.',
    },
  },
  activeTemplateId: 'yin_yang_v2',
  getProgress: (state) => computeTemplateProgress(state, 'yin_yang_v2'),
  winCondition: (state) => state.activeTemplate?.templateId === 'yin_yang_v2' && !!state.activeTemplate.completedAtTick,
};

export const TASK_ORDER: string[] = [
  task1Explore.id,
  task2CollectBeyondVisibility.id,
  task3ExcavateRings.id,
  task4CollectOpposites.id,
  task5YinYang.id,
];

export const TASKS: Record<string, TaskDefinition> = {
  [task1Explore.id]: task1Explore,
  [task2CollectBeyondVisibility.id]: task2CollectBeyondVisibility,
  [task3ExcavateRings.id]: task3ExcavateRings,
  [task4CollectOpposites.id]: task4CollectOpposites,
  [task5YinYang.id]: task5YinYang,
};

export function getTaskDefinition(id: string): TaskDefinition | null {
  return TASKS[id] ?? null;
}

export function getAllTaskDefinitions(): TaskDefinition[] {
  return TASK_ORDER
    .map(id => getTaskDefinition(id))
    .filter((task): task is TaskDefinition => task !== null);
}

export function getNextTaskDefinition(completedTaskId: string): TaskDefinition | null {
  const currentIndex = TASK_ORDER.indexOf(completedTaskId);
  if (currentIndex === -1 || currentIndex === TASK_ORDER.length - 1) {
    return null;
  }

  return getTaskDefinition(TASK_ORDER[currentIndex + 1]);
}

export function getFirstTaskDefinition(): TaskDefinition {
  return TASKS[TASK_ORDER[0]];
}

export const tutorialLevel1Movement = task1Explore;
export const tutorialLevel2CollectColors = task2CollectBeyondVisibility;
export const tutorialLevel3Excavation = task3ExcavateRings;
export const tutorialLevel4Shelter = task4CollectOpposites;
export const tutorialLevel5YinYang = task5YinYang;
export const TUTORIAL_LEVEL_ORDER = TASK_ORDER;
export const TUTORIAL_LEVELS = TASKS;

export function getTutorialLevel(id: string): TaskDefinition | null {
  const legacyToTaskId: Record<string, string> = {
    tutorial_1_movement: 'task_1_explore',
    tutorial_2_collect_colors: 'task_2_collect_beyond_visibility',
    tutorial_3_excavation: 'task_3_excavate_rings',
    tutorial_4_shelter: 'task_4_collect_opposites',
    tutorial_5_yin_yang: 'task_5_yin_yang',
  };

  return getTaskDefinition(legacyToTaskId[id] ?? id);
}

export const getAllTutorialLevels = getAllTaskDefinitions;

export function getNextTutorialLevel(completedLevelId: string): TaskDefinition | null {
  const task = getTutorialLevel(completedLevelId);
  if (!task) {
    return null;
  }

  return getNextTaskDefinition(task.id);
}