import type { ActiveTemplateState, StructureInstanceState } from '../../templates/templateTypes';

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

export interface InvalidMoveTargetState {
  position: Axial;
  startedTick: number;
}

export type RNG = () => number;

export interface GameState {
  tick: number;
  remainingSeconds: number;
  focus: Axial;
  protagonist: Axial;
  flash: FlashState | null;
  invalidMoveTarget?: InvalidMoveTargetState | null;
  grid: Grid;
  inventoryGrid: Grid;
  activeField?: 'world' | 'inventory';
  /** Index of the currently active hex layer. 0 = base, positive = shallower/larger, negative = deeper/smaller. Range: -2..+2 */
  activeLayerIndex?: number;
  /** Grids for non-active layers, keyed by layer index. The active layer grid is always in `grid`. */
  layerGrids?: Record<number, Grid>;
  hotbarSlots: Array<number | null>;
  selectedHotbarIndex: number;
  facingDirIndex: number;
  isDragging?: boolean;
  autoMoveTarget?: Axial | null;
  autoMoveTicksRemaining?: number;
  autoFocusTarget?: Axial | null;
  autoMovePath?: Axial[];
  autoMoveTargetDir?: number | null;
  worldViewCenter?: Axial;
  cameraLastMoveTick?: number;

  taskId?: string | null;
  taskProgress?: {
    visitedTargetKeys: Set<string>;
    collectedTargetKeys: Set<string>;
    targetCells?: Axial[];
    targetHexes?: Array<{ position: Axial; colorIndex: number }>;
    startTick: number;
    completedAtTick?: number;
  };
  taskInteractionMode?: 'desktop' | 'mobile';
  taskCompletedIds?: Set<string>;

  // Legacy compatibility aliases for deprecated tutorial-only modules.
  tutorialLevelId?: string | null;
  tutorialProgress?: {
    visitedTargetKeys: Set<string>;
    collectedTargetKeys: Set<string>;
    targetCells?: Axial[];
    targetHexes?: Array<{ position: Axial; colorIndex: number }>;
    startTick: number;
    completedAtTick?: number;
  };
  tutorialInteractionMode?: 'desktop' | 'mobile';
  tutorialCompletedLevelIds?: Set<string>;

  activeTemplate?: ActiveTemplateState | null;
  completedTemplates?: Set<string>;
  structureInstances?: StructureInstanceState[];
}
