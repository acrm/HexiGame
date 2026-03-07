/**
 * tutorialFlow — Tutorial level orchestration and progression state.
 *
 * Responsibilities:
 *  - Track current tutorial level ID
 *  - Compute tutorial completion status
 *  - Handle level progression (next/select/restart)
 *  - Manage tutorial persistence (localStorage)
 *  - Provide derived tutorial data for UI
 *
 * Extracted from ui/components/Game.tsx (2026-03-07).
 */

import type { GameState, Axial } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { getTutorialLevel, getNextTutorialLevel } from '../tutorial/tutorialLevels';
import { axialToKey, type TutorialLevel } from '../tutorial/tutorialState';

// ─── Storage key ───────────────────────────────────────────────────────────────

const TUTORIAL_STARTED_KEY = 'hexigame.tutorial.started';

// ─── Tutorial state ────────────────────────────────────────────────────────────

export interface TutorialFlowState {
  currentLevelId: string | null;
}

export function createInitialTutorialFlowState(): TutorialFlowState {
  const hasTutorialStarted = localStorage.getItem(TUTORIAL_STARTED_KEY);
  return {
    currentLevelId: hasTutorialStarted ? null : 'tutorial_1_movement',
  };
}

export function markTutorialAsStarted(): void {
  localStorage.setItem(TUTORIAL_STARTED_KEY, '1');
}

// ─── Derived tutorial data ─────────────────────────────────────────────────────

export interface TutorialViewModel {
  level: TutorialLevel | null;
  targetKeys: string[];
  visitedTargetCount: number;
  isTaskComplete: boolean;
  isHexiLabLocked: boolean;
  completedLevelIds: Set<string>;
}

export function computeTutorialViewModel(
  flowState: TutorialFlowState,
  gameState: GameState,
  params: Params,
): TutorialViewModel {
  const level = flowState.currentLevelId ? getTutorialLevel(flowState.currentLevelId) : null;
  const targetKeys = level?.targetCells?.map(axialToKey) ?? [];
  const visitedTargetCount = gameState.tutorialProgress
    ? targetKeys.filter(key => gameState.tutorialProgress?.visitedTargetKeys.has(key)).length
    : 0;
  const isTaskComplete = !!level && !!gameState.tutorialProgress
    ? level.winCondition(gameState, params, gameState.tutorialProgress)
    : false;
  const isHexiLabLocked = level?.disableInventory ?? false;
  const completedLevelIds = gameState.tutorialCompletedLevelIds ?? new Set<string>();

  return {
    level,
    targetKeys,
    visitedTargetCount,
    isTaskComplete,
    isHexiLabLocked,
    completedLevelIds,
  };
}

// ─── Tutorial actions ──────────────────────────────────────────────────────────

export interface TutorialFlowActions {
  completeLevel: (levelId: string) => void;
  selectLevel: (levelId: string) => void;
  restartLevel: (levelId: string, gameState: GameState) => GameState;
}

export function createTutorialFlowActions(
  setState: (state: TutorialFlowState) => void,
  dispatchGame: (command: any) => void,
  dispatchApp: (command: any) => void,
): TutorialFlowActions {
  return {
    completeLevel: (completedLevelId: string) => {
      const nextLevel = getNextTutorialLevel(completedLevelId);
      const nextLevelId = nextLevel ? nextLevel.id : null;
      
      dispatchGame({ type: 'COMPLETE_TUTORIAL_LEVEL', levelId: completedLevelId, nextLevelId });
      
      if (nextLevel) {
        setState({ currentLevelId: nextLevel.id });
      } else {
        markTutorialAsStarted();
        setState({ currentLevelId: null });
      }
    },

    selectLevel: (levelId: string) => {
      setState({ currentLevelId: levelId });
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
    },

    restartLevel: (levelId: string, gameState: GameState): GameState => {
      const updatedCompletedIds = new Set(gameState.tutorialCompletedLevelIds ?? []);
      updatedCompletedIds.delete(levelId);
      
      const newState = {
        ...gameState,
        tutorialCompletedLevelIds: updatedCompletedIds,
      };
      
      setState({ currentLevelId: levelId });
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
      
      return newState;
    },
  };
}

// ─── Tutorial level checkers ───────────────────────────────────────────────────

export function shouldTrackFocusVisit(
  levelId: string | null,
  gameState: GameState,
  isMobileLayout: boolean,
  mobileTab: string,
): boolean {
  if (!levelId || !gameState.tutorialProgress) return false;
  if (gameState.activeField === 'inventory') return false;
  if (isMobileLayout && mobileTab !== 'heximap') return false;
  
  const level = getTutorialLevel(levelId);
  if (!level?.targetCells || level.targetCells.length === 0) return false;
  
  return true;
}

export function checkFocusTargetVisit(
  levelId: string,
  focus: Axial,
  visitedKeys: Set<string>,
): string | null {
  const level = getTutorialLevel(levelId);
  if (!level?.targetCells) return null;
  
  const focusKey = axialToKey(focus);
  const targetKeys = level.targetCells.map(axialToKey);
  
  if (!targetKeys.includes(focusKey)) return null;
  if (visitedKeys.has(focusKey)) return null;
  
  return focusKey;
}
