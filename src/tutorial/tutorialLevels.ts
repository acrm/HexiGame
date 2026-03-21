// Tutorial levels library

import type { GameState } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { getCell } from '../gameLogic/core/grid';
import { getTemplateById } from '../templates/templateLibrary';
import {
  TUTORIAL_EXCAVATION_LAYERS,
  TUTORIAL_EXCAVATION_TARGET,
  TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX,
  TUTORIAL_NAVIGATION_TARGETS,
} from './tutorialSandbox';
import { TutorialLevel, TutorialProgressMetrics, axialToKey } from './tutorialState';

function computeTemplateProgress(state: GameState, templateId: string): TutorialProgressMetrics {
  const template = getTemplateById(templateId);
  const total = template?.cells.length ?? 0;
  const current = state.activeTemplate?.templateId === templateId
    ? state.activeTemplate.filledCells.size
    : 0;

  return {
    current,
    total,
    labelKey: 'tutorial.cellsPlaced',
  };
}

function computeExcavationProgress(state: GameState): TutorialProgressMetrics {
  const excavationCells = [...TUTORIAL_EXCAVATION_LAYERS, TUTORIAL_EXCAVATION_TARGET];
  const clearedCount = excavationCells.filter(cell => getCell(state.grid, cell)?.colorIndex === null).length;

  return {
    current: clearedCount,
    total: excavationCells.length,
    labelKey: 'tutorial.cellsCleared',
  };
}

export const tutorialLevel1Movement: TutorialLevel = {
  id: 'tutorial_1_movement',
  setup: {
    en: 'The turtle wakes up in a strange, colorful world and wants to explore it.',
    ru: 'Черепаша проснулась в странном цветном мире и хочет его исследовать.',
  },
  objective: {
    en: 'Visit all 3 target areas to explore the world.',
    ru: 'Посетите все 3 территории, чтобы исследовать мир.',
  },
  hints: {
    desktop: {
      en: 'Open HexiMap and click a target cell. The turtle will walk to a free cell next to it.',
      ru: 'Откройте HexiMap и кликните по целевой клетке. Черепашка подойдёт к свободной клетке рядом с ней.',
    },
    mobile: {
      en: 'Open HexiMap and tap a target cell. The turtle will walk to a free cell next to it.',
      ru: 'Откройте HexiMap и тапните по целевой клетке. Черепашка подойдёт к свободной клетке рядом с ней.',
    },
  },
  targetCells: TUTORIAL_NAVIGATION_TARGETS,
  disableInventory: true,
  hideHotbar: true,
  getProgress: (_state: GameState, _params: Params, progressData) => ({
    current: TUTORIAL_NAVIGATION_TARGETS.filter(cell => progressData.visitedTargetKeys.has(axialToKey(cell))).length,
    total: TUTORIAL_NAVIGATION_TARGETS.length,
    labelKey: 'tutorial.cellsVisited',
  }),
  winCondition: (_state: GameState, _params: Params, progressData) => {
    const targetKeys = TUTORIAL_NAVIGATION_TARGETS.map(axialToKey);
    return targetKeys.every(key => progressData.visitedTargetKeys.has(key));
  },
};

export const tutorialLevel2CollectColors: TutorialLevel = {
  id: 'tutorial_2_collect_colors',
  setup: {
    en: 'The turtle sees all the beautiful colors around and wants to gather them all.',
    ru: 'Черепаша видит все прекрасные цвета вокруг и хочет их все собрать.',
  },
  objective: {
    en: 'Collect one hex of each color available here.',
    ru: 'Соберите по одному гексу каждого цвета.',
  },
  hints: {
    desktop: {
      en: 'Fill the hotbar with all colors from the circle around the turtle.',
      ru: 'Заполните хотбар всеми цветами из круга вокруг черепашки.',
    },
    mobile: {
      en: 'Fill the hotbar with all colors from the circle around the turtle.',
      ru: 'Заполните хотбар всеми цветами из круга вокруг черепашки.',
    },
  },
  getProgress: (state: GameState, params: Params) => ({
    current: new Set(state.hotbarSlots.filter((slot): slot is number => slot !== null)).size,
    total: params.ColorPalette.length,
    labelKey: 'tutorial.colorsCollected',
  }),
  winCondition: (state: GameState, params: Params) => {
    return new Set(state.hotbarSlots.filter((slot): slot is number => slot !== null)).size >= params.ColorPalette.length;
  },
};

export const tutorialLevel3Excavation: TutorialLevel = {
  id: 'tutorial_3_excavation',
  setup: {
    en: 'The turtle senses a mysterious power hidden deep within the earth.',
    ru: 'Черепаша чувствует таинственную силу, спрятанную в глубине земли.',
  },
  objective: {
    en: 'Dig through the layers and extract the hidden power.',
    ru: 'Откопайте слои и извлеките скрытую силу.',
  },
  hints: {
    desktop: {
      en: 'Peel away the blocking layers and extract the hidden hex into the hotbar.',
      ru: 'Снимите внешние слои и достаньте скрытый гекс в хотбар.',
    },
    mobile: {
      en: 'Peel away the blocking layers and extract the hidden hex into the hotbar.',
      ru: 'Снимите внешние слои и достаньте скрытый гекс в хотбар.',
    },
  },
  getProgress: (state: GameState) => computeExcavationProgress(state),
  winCondition: (state: GameState) => {
    const targetCellCleared = getCell(state.grid, TUTORIAL_EXCAVATION_TARGET)?.colorIndex === null;
    const targetInHotbar = state.hotbarSlots.includes(TUTORIAL_EXCAVATION_TARGET_COLOR_INDEX);
    return targetCellCleared && targetInHotbar;
  },
};

export const tutorialLevel4Shelter: TutorialLevel = {
  id: 'tutorial_4_shelter',
  setup: {
    en: 'The turtle is tired from exploring and needs a safe place to rest.',
    ru: 'Черепаша устала от исследований и нуждается в безопасном месте для отдыха.',
  },
  objective: {
    en: 'Build a horseshoe shelter from a single color.',
    ru: 'Постройте подковообразное убежище из одного цвета.',
  },
  hints: {
    desktop: {
      en: 'Use the same color for every slot of the shelter template.',
      ru: 'Используйте один и тот же цвет для всех ячеек шаблона убежища.',
    },
    mobile: {
      en: 'Use the same color for every slot of the shelter template.',
      ru: 'Используйте один и тот же цвет для всех ячеек шаблона убежища.',
    },
  },
  activeTemplateId: 'horseshoe_shelter',
  getProgress: (state: GameState) => computeTemplateProgress(state, 'horseshoe_shelter'),
  winCondition: (state: GameState) => {
    return state.activeTemplate?.templateId === 'horseshoe_shelter' && !!state.activeTemplate.completedAtTick;
  },
};

export const tutorialLevel5YinYang: TutorialLevel = {
  id: 'tutorial_5_yin_yang',
  setup: {
    en: 'The turtle learns that balance exists between light and darkness in all things.',
    ru: 'Черепаша узнает, что баланс существует между светом и тьмой во всём.',
  },
  objective: {
    en: 'Create the symbol of yin and yang using two opposite colors.',
    ru: 'Создайте символ инь-янь, используя два противоположных цвета.',
  },
  hints: {
    desktop: {
      en: 'Use only two opposite colors and keep the mirrored eyes in place.',
      ru: 'Используйте только два противоположных цвета и сохраните зеркальные глазки.',
    },
    mobile: {
      en: 'Use only two opposite colors and keep the mirrored eyes in place.',
      ru: 'Используйте только два противоположных цвета и сохраните зеркальные глазки.',
    },
  },
  activeTemplateId: 'yin_yang_v2',
  getProgress: (state: GameState) => computeTemplateProgress(state, 'yin_yang_v2'),
  winCondition: (state: GameState) => {
    return state.activeTemplate?.templateId === 'yin_yang_v2' && !!state.activeTemplate.completedAtTick;
  },
};

export const tutorialLevel6Rainbow: TutorialLevel = {
  id: 'tutorial_6_rainbow',
  setup: {
    en: 'The turtle has learned all the lessons of this world. Now comes the greatest creation.',
    ru: 'Черепаша научилась всему в этом мире. Теперь наступил момент для величайшего творения.',
  },
  objective: {
    en: 'Build the grand rainbow spiral using all colors available.',
    ru: 'Постройте грандиозную радужную спираль, используя все цвета.',
  },
  hints: {
    desktop: {
      en: 'The final figure needs the whole palette, not just one or two colors.',
      ru: 'Для финальной фигуры нужна вся палитра, а не один или два цвета.',
    },
    mobile: {
      en: 'The final figure needs the whole palette, not just one or two colors.',
      ru: 'Для финальной фигуры нужна вся палитра, а не один или два цвета.',
    },
  },
  activeTemplateId: 'rainbow_spiral',
  getProgress: (state: GameState) => computeTemplateProgress(state, 'rainbow_spiral'),
  winCondition: (state: GameState) => {
    return state.activeTemplate?.templateId === 'rainbow_spiral' && !!state.activeTemplate.completedAtTick;
  },
};

export const TUTORIAL_LEVEL_ORDER: string[] = [
  tutorialLevel1Movement.id,
  tutorialLevel2CollectColors.id,
  tutorialLevel3Excavation.id,
  tutorialLevel4Shelter.id,
  tutorialLevel5YinYang.id,
  tutorialLevel6Rainbow.id,
];

export const TUTORIAL_LEVELS: Record<string, TutorialLevel> = {
  [tutorialLevel1Movement.id]: tutorialLevel1Movement,
  [tutorialLevel2CollectColors.id]: tutorialLevel2CollectColors,
  [tutorialLevel3Excavation.id]: tutorialLevel3Excavation,
  [tutorialLevel4Shelter.id]: tutorialLevel4Shelter,
  [tutorialLevel5YinYang.id]: tutorialLevel5YinYang,
  [tutorialLevel6Rainbow.id]: tutorialLevel6Rainbow,
};

export function getTutorialLevel(id: string): TutorialLevel | null {
  return TUTORIAL_LEVELS[id] ?? null;
}

export function getAllTutorialLevels(): TutorialLevel[] {
  return TUTORIAL_LEVEL_ORDER
    .map(id => getTutorialLevel(id))
    .filter((level): level is TutorialLevel => level !== null);
}

export function getNextTutorialLevel(completedLevelId: string): TutorialLevel | null {
  const currentIndex = TUTORIAL_LEVEL_ORDER.indexOf(completedLevelId);
  if (currentIndex === -1 || currentIndex === TUTORIAL_LEVEL_ORDER.length - 1) {
    return null;
  }

  const nextLevelId = TUTORIAL_LEVEL_ORDER[currentIndex + 1];
  return getTutorialLevel(nextLevelId);
}
