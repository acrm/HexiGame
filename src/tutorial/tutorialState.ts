// Tutorial system types and helpers

import { GameState, Params, Axial } from '../logic/pureLogic';

/**
 * Multilingual hint adapted for interaction mode
 */
export interface AdaptiveHint {
  desktop: string;  // Hint for desktop keyboard controls
  mobile: string;   // Hint for mobile touch controls
}

/**
 * Definition of a single tutorial level
 */
export interface TutorialLevel {
  id: string;
  objective: string;           // Goal to display to the player
  hints: AdaptiveHint;         // Hints adapted for control mode
  targetCells?: Axial[];       // Cells required to visit for this task
  winCondition: (
    state: GameState,
    params: Params,
    progressData: TutorialProgressData
  ) => boolean;               // Function to check if level is completed
  
  // Optional fields for visualization
  highlightCells?: Axial[];    // Cells to highlight (if needed)
  highlightUIElements?: string[]; // CSS selectors of UI elements to highlight
  disableInventory?: boolean;  // If true, inventory/HexiLab is disabled during this level
  hideHotbar?: boolean;        // If true, hotbar is hidden during this level
}

/**
 * Progress tracking data for current tutorial level
 */
export interface TutorialProgressData {
  visitedTargetKeys: Set<string>;   // String representation of Axial: "q,r"
  startTick: number;           // Tick when level started
  completedAtTick?: number;    // Tick when level was completed
}

/**
 * GameState extension for tutorial (to be added in pureLogic.ts)
 * tutorialLevelId?: string | null;
 * tutorialProgress?: TutorialProgressData;
 * tutorialInteractionMode?: 'desktop' | 'mobile';
 */

// Helper functions

/**
 * Convert Axial to string key for Set/Map
 */
export function axialToKey(pos: Axial): string {
  return `${pos.q},${pos.r}`;
}

/**
 * Convert string key back to Axial
 */
export function keyToAxial(key: string): Axial {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * Calculate distance between two cells in cubic axial coordinates
 * Used to verify cells are sufficiently spread out
 */
export function axialDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Verify that visited cells are sufficiently spread out
 * @param visitedKeys - set of visited cell keys
 * @param minDistance - minimum distance between any two cells
 */
export function areVisitedCellsSpread(
  visitedKeys: Set<string>,
  minDistance: number = 3
): boolean {
  if (visitedKeys.size < 2) return false;
  
  const cells = Array.from(visitedKeys).map(keyToAxial);
  
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (axialDistance(cells[i], cells[j]) < minDistance) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Get the appropriate hint based on interaction mode
 */
export function getHintForMode(hint: AdaptiveHint, mode: 'desktop' | 'mobile'): string {
  return mode === 'desktop' ? hint.desktop : hint.mobile;
}
