import type { GameState, Axial } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';

export interface LocalizedText {
  en: string;
  ru: string;
}

export interface TaskTargetHex {
  position: Axial;
  colorIndex: number;
}

export interface TaskProgressMetrics {
  current: number;
  total: number;
  labelKey: string;
}

export interface AdaptiveHint {
  desktop: LocalizedText;
  mobile: LocalizedText;
}

export interface TaskProgressData {
  visitedTargetKeys: Set<string>;
  collectedTargetKeys: Set<string>;
  targetCells?: Axial[];
  targetHexes?: TaskTargetHex[];
  startTick: number;
  completedAtTick?: number;
}

export interface TaskDefinition {
  id: string;
  name: LocalizedText;
  setup: LocalizedText;
  objective: LocalizedText;
  hints: AdaptiveHint;
  targetCells?: Axial[];
  targetHexes?: TaskTargetHex[];
  activeTemplateId?: string;
  getProgress?: (
    state: GameState,
    params: Params,
    progressData: TaskProgressData,
  ) => TaskProgressMetrics;
  winCondition: (
    state: GameState,
    params: Params,
    progressData: TaskProgressData,
  ) => boolean;
  highlightCells?: Axial[];
  highlightUIElements?: string[];
  disableInventory?: boolean;
  hideHotbar?: boolean;
}

export function axialToKey(position: Axial): string {
  return `${position.q},${position.r}`;
}

export function keyToAxial(key: string): Axial {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function axialDistance(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function areVisitedCellsSpread(
  visitedKeys: Set<string>,
  minDistance: number = 3,
): boolean {
  if (visitedKeys.size < 2) return false;

  const cells = Array.from(visitedKeys).map(keyToAxial);

  for (let firstIndex = 0; firstIndex < cells.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < cells.length; secondIndex += 1) {
      if (axialDistance(cells[firstIndex], cells[secondIndex]) < minDistance) {
        return false;
      }
    }
  }

  return true;
}

export function getLocalizedText(text: LocalizedText, lang: 'en' | 'ru' = 'en'): string {
  return text[lang];
}

export function getHintForMode(
  hint: AdaptiveHint,
  mode: 'desktop' | 'mobile',
  lang: 'en' | 'ru' = 'en',
): string {
  return getLocalizedText(mode === 'desktop' ? hint.desktop : hint.mobile, lang);
}

export type TutorialLevel = TaskDefinition;
export type TutorialProgressData = TaskProgressData;
export type TutorialProgressMetrics = TaskProgressMetrics;