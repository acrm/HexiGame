import type { ActiveTemplateState } from '../../templates/templateTypes';

export type Axial = { q: number; r: number };

export type Cell = {
  q: number;
  r: number;
  colorIndex: number | null;
};

export type Grid = Map<string, Cell>;

export interface FlashState {
  type: "success" | "failure";
  startedTick: number;
}

export type RNG = () => number;

export interface GameState {
  tick: number;
  remainingSeconds: number;
  focus: Axial;
  protagonist: Axial;
  flash: FlashState | null;
  grid: Grid;
  inventoryGrid: Grid;
  activeField?: 'world' | 'inventory';
  hotbarSlots: Array<number | null>;
  selectedHotbarIndex: number;
  facingDirIndex: number;
  isDragging?: boolean;
  autoMoveTarget?: Axial | null;
  autoMoveTicksRemaining?: number;
  autoFocusTarget?: Axial | null;
  worldViewCenter?: Axial;

  tutorialLevelId?: string | null;
  tutorialProgress?: {
    visitedTargetKeys: Set<string>;
    startTick: number;
    completedAtTick?: number;
  };
  tutorialInteractionMode?: 'desktop' | 'mobile';
  tutorialCompletedLevelIds?: Set<string>;

  activeTemplate?: ActiveTemplateState | null;
  completedTemplates?: Set<string>;
}
