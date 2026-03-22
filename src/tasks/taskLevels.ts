import type { GameState } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { getCell } from '../gameLogic/core/grid';
import { getTemplateById } from '../templates/templateLibrary';
import {
  TASK_COLOR_HUNT_TARGETS,
  TASK_EXCAVATION_CENTER,
  TASK_EXCAVATION_RING_1,
  TASK_EXCAVATION_RING_2,
  TASK_EXCAVATION_TARGET_COLOR_INDEX,
  TASK_EXPLORATION_TARGETS,
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

function computeExcavationProgress(state: GameState): TaskProgressMetrics {
  const excavationCells = [...TASK_EXCAVATION_RING_1, ...TASK_EXCAVATION_RING_2, TASK_EXCAVATION_CENTER];
  const clearedCount = excavationCells.filter(cell => getCell(state.grid, cell)?.colorIndex === null).length;

  return {
    current: clearedCount,
    total: excavationCells.length,
    labelKey: 'task.cellsCleared',
  };
}

function countCollectedTargetHexes(state: GameState, targetKeys: Set<string>): number {
  const progress = state.taskProgress;
  if (!progress) return 0;
  return Array.from(progress.collectedTargetKeys).filter(key => targetKeys.has(key)).length;
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
    current: TASK_EXPLORATION_TARGETS.filter(cell => progressData.visitedTargetKeys.has(axialToKey(cell))).length,
    total: TASK_EXPLORATION_TARGETS.length,
    labelKey: 'task.cellsVisited',
  }),
  winCondition: (_state, _params, progressData) => {
    const targetKeys = TASK_EXPLORATION_TARGETS.map(axialToKey);
    return targetKeys.every(key => progressData.visitedTargetKeys.has(key));
  },
};

const task2TargetKeys = new Set(TASK_COLOR_HUNT_TARGETS.map(({ position }) => axialToKey(position)));

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
  getProgress: (state) => ({
    current: countCollectedTargetHexes(state, task2TargetKeys),
    total: TASK_COLOR_HUNT_TARGETS.length,
    labelKey: 'task.targetHexesCollected',
  }),
  winCondition: (state) => countCollectedTargetHexes(state, task2TargetKeys) >= TASK_COLOR_HUNT_TARGETS.length,
};

export const task3ExcavateRings: TaskDefinition = {
  id: 'task_3_excavate_rings',
  name: { en: 'Excavate', ru: 'Раскопки' },
  setup: {
    en: 'A bright core is trapped inside two concentric rings of debris.',
    ru: 'Яркое ядро зажато внутри двух концентрических колец из завалов.',
  },
  objective: {
    en: 'Break through both rings and extract the hidden core into the hotbar.',
    ru: 'Прорвитесь через оба кольца и вынесите скрытое ядро в хотбар.',
  },
  hints: {
    desktop: {
      en: 'Clear the outer and inner ring first, then extract the center hex into the hotbar.',
      ru: 'Сначала расчистите внешнее и внутреннее кольцо, а затем заберите центральный гекс в хотбар.',
    },
    mobile: {
      en: 'Clear the outer and inner ring first, then extract the center hex into the hotbar.',
      ru: 'Сначала расчистите внешнее и внутреннее кольцо, а затем заберите центральный гекс в хотбар.',
    },
  },
  getProgress: (state) => computeExcavationProgress(state),
  winCondition: (state) => {
    const targetCellCleared = getCell(state.grid, TASK_EXCAVATION_CENTER)?.colorIndex === null;
    const targetInHotbar = state.hotbarSlots.includes(TASK_EXCAVATION_TARGET_COLOR_INDEX);
    return targetCellCleared && targetInHotbar;
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
    en: 'Collect 3 base-color hexes and 3 opposite-color hexes in the hotbar.',
    ru: 'Соберите в хотбар 3 гекса базового цвета и 3 гекса противоположного цвета.',
  },
  hints: {
    desktop: {
      en: 'Use the palette widget to identify the opposite color, then build a full 3+3 set in the hotbar.',
      ru: 'Используйте виджет палитры, чтобы найти противоположный цвет, затем соберите полный набор 3+3 в хотбаре.',
    },
    mobile: {
      en: 'Use the palette widget to identify the opposite color, then build a full 3+3 set in the hotbar.',
      ru: 'Используйте виджет палитры, чтобы найти противоположный цвет, затем соберите полный набор 3+3 в хотбаре.',
    },
  },
  getProgress: (state, params) => {
    const baseColorIndex = params.PlayerBaseColorIndex;
    const oppositeColorIndex = (baseColorIndex + Math.floor(params.ColorPalette.length / 2)) % params.ColorPalette.length;
    const baseColorCount = state.hotbarSlots.filter(slot => slot === baseColorIndex).length;
    const oppositeColorCount = state.hotbarSlots.filter(slot => slot === oppositeColorIndex).length;
    const current = Math.min(3, baseColorCount) + Math.min(3, oppositeColorCount);

    return {
      current,
      total: 6,
      labelKey: 'task.oppositeColorsCollected',
    };
  },
  winCondition: (state, params) => {
    const baseColorIndex = params.PlayerBaseColorIndex;
    const oppositeColorIndex = (baseColorIndex + Math.floor(params.ColorPalette.length / 2)) % params.ColorPalette.length;
    const baseColorCount = state.hotbarSlots.filter(slot => slot === baseColorIndex).length;
    const oppositeColorCount = state.hotbarSlots.filter(slot => slot === oppositeColorIndex).length;

    return baseColorCount >= 3 && oppositeColorCount >= 3;
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