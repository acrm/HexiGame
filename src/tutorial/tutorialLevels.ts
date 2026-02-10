// Tutorial levels library

import { TutorialLevel, axialToKey } from './tutorialState';
import { GameState, Params } from '../logic/pureLogic';

/**
 * LEVEL 1: MOVEMENT
 * Goal: visit 3 specific target cells using the focus
 * Mechanic: move focus on HexiMap
 */
export const tutorialLevel1Movement: TutorialLevel = {
  id: 'tutorial_1_movement',
  objective: 'Visit all 3 target cells with the focus',
  hints: {
    desktop: 'Open HexiMap and move the focus with arrow keys or WASD',
    mobile: 'Open HexiMap and swipe on the field to move the focus',
  },
  targetCells: [
    { q: 1, r: -4 },
    { q: 5, r: -1 },
    { q: -4, r: 3 },
  ],
  disableInventory: true,
  hideHotbar: true,
  winCondition: (state: GameState, params: Params, progressData) => {
    if (!tutorialLevel1Movement.targetCells) return false;
    const targetKeys = tutorialLevel1Movement.targetCells.map(axialToKey);
    return targetKeys.every(key => progressData.visitedTargetKeys.has(key));
  },
};

export const tutorialLevel2Placeholder: TutorialLevel = {
  id: 'tutorial_2_placeholder',
  objective: 'Capture a colored cell (placeholder)',
  hints: {
    desktop: 'Placeholder task: capture any colored cell.',
    mobile: 'Placeholder task: capture any colored cell.',
  },
  winCondition: () => false,
};

export const tutorialLevel3Placeholder: TutorialLevel = {
  id: 'tutorial_3_placeholder',
  objective: 'Carry a cell to an empty spot (placeholder)',
  hints: {
    desktop: 'Placeholder task: carry a cell to an empty spot.',
    mobile: 'Placeholder task: carry a cell to an empty spot.',
  },
  winCondition: () => false,
};

export const tutorialLevel4Placeholder: TutorialLevel = {
  id: 'tutorial_4_placeholder',
  objective: 'Build a chain of 3 cells (placeholder)',
  hints: {
    desktop: 'Placeholder task: build a chain of 3 cells.',
    mobile: 'Placeholder task: build a chain of 3 cells.',
  },
  winCondition: () => false,
};

/**
 * All available tutorial levels
 */
export const TUTORIAL_LEVELS: Record<string, TutorialLevel> = {
  [tutorialLevel1Movement.id]: tutorialLevel1Movement,
  [tutorialLevel2Placeholder.id]: tutorialLevel2Placeholder,
  [tutorialLevel3Placeholder.id]: tutorialLevel3Placeholder,
  [tutorialLevel4Placeholder.id]: tutorialLevel4Placeholder,
};

/**
 * Get a level by ID
 */
export function getTutorialLevel(id: string): TutorialLevel | null {
  return TUTORIAL_LEVELS[id] ?? null;
}

/**
 * Get all available tutorial levels in order
 */
export function getAllTutorialLevels(): TutorialLevel[] {
  return TUTORIAL_LEVEL_ORDER
    .map(id => getTutorialLevel(id))
    .filter((level): level is TutorialLevel => level !== null);
}

/**
 * Ordered list of all tutorial levels
 */
export const TUTORIAL_LEVEL_ORDER: string[] = [
  'tutorial_1_movement',
  'tutorial_2_placeholder',
  'tutorial_3_placeholder',
  'tutorial_4_placeholder',
];

/**
 * Get the next level after a completed one
 */
export function getNextTutorialLevel(completedLevelId: string): TutorialLevel | null {
  const currentIndex = TUTORIAL_LEVEL_ORDER.indexOf(completedLevelId);
  if (currentIndex === -1 || currentIndex === TUTORIAL_LEVEL_ORDER.length - 1) {
    return null; // No next level
  }
  
  const nextLevelId = TUTORIAL_LEVEL_ORDER[currentIndex + 1];
  return getTutorialLevel(nextLevelId);
}
