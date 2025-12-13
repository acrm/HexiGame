// Test data builders for creating test states and parameters
// NOTE: Import path assumes future module structure. Update when implementing:
// - Change to actual module paths when Domain layer is implemented
// - Currently imports from existing pureLogic.ts for type definitions
import type { GameState, GameParams, Axial, Cell, HexGrid, FlashState } from '../../src/logic/pureLogic';

/**
 * Create a minimal test game state with optional overrides.
 * All required fields have sensible defaults for testing.
 */
export function createTestState(overrides: Partial<GameState> = {}): GameState {
  const defaultState: GameState = {
    tick: 0,
    remainingSeconds: 300,
    cursor: { q: 0, r: 0 },
    protagonist: { q: 0, r: 0 },
    facingDirIndex: 0,
    grid: createEmptyTestGrid(5),
    inventoryGrid: createEmptyTestGrid(5),
    activeField: 'world',
    capturedCell: null,
    captureCooldownTicksRemaining: 0,
    captureChargeStartTick: null,
    flash: null,
    isActionMode: false,
    isReleasing: false,
    paletteCounts: {},
  };
  
  return { ...defaultState, ...overrides };
}

/**
 * Create test game parameters with optional overrides.
 */
export function createTestParams(overrides: Partial<GameParams> = {}): GameParams {
  const defaultParams: GameParams = {
    GridRadius: 5,
    InitialColorProbability: 0.2,
    ColorPalette: ['#FF8000', '#CC6600', '#996600', '#660099'],
    PlayerBaseColorIndex: 0,
    TimerInitialSeconds: 300,
    CaptureHoldDurationTicks: 6,
    CaptureFailureCooldownTicks: 36,
    CaptureFlashDurationTicks: 2,
    ChanceBasePercent: 100,
    ChancePenaltyPerPaletteDistance: 20,
    CarryFlickerCycleTicks: 6,
    CarryFlickerOnFraction: 0.5,
    CarryingMoveRequiresEmpty: true,
    GameTickRate: 12,
  };
  
  return { ...defaultParams, ...overrides } as GameParams;
}

/**
 * Create an empty hex grid with given radius.
 */
export function createEmptyTestGrid(radius: number): HexGrid {
  const grid = new Map<string, Cell>();
  
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius) {
        const key = `${q},${r}`;
        grid.set(key, { q, r, colorIndex: null });
      }
    }
  }
  
  return grid;
}

/**
 * Create a test grid with specific cells colored.
 */
export function createTestGrid(
  radius: number,
  coloredCells: Array<{ q: number; r: number; colorIndex: number }>
): HexGrid {
  const grid = createEmptyTestGrid(radius);
  
  for (const cell of coloredCells) {
    const key = `${cell.q},${cell.r}`;
    grid.set(key, cell);
  }
  
  return grid;
}

/**
 * Get a cell from grid (test helper).
 */
export function getTestCell(grid: HexGrid, q: number, r: number): Cell | undefined {
  return grid.get(`${q},${r}`);
}

/**
 * Set a cell in grid (test helper - creates new grid).
 */
export function setTestCell(grid: HexGrid, cell: Cell): HexGrid {
  const newGrid = new Map(grid);
  newGrid.set(`${cell.q},${cell.r}`, cell);
  return newGrid;
}

/**
 * Create a flash state for testing.
 */
export function createTestFlash(
  type: 'success' | 'failure',
  startedTick: number = 0
): FlashState {
  return { type, startedTick };
}

/**
 * Factory for creating states in specific modes.
 */
export class StateFactory {
  /**
   * Create state with active cooldown.
   */
  static withCooldown(ticks: number): GameState {
    return createTestState({
      captureCooldownTicksRemaining: ticks,
    });
  }
  
  /**
   * Create state with carried hex.
   */
  static withCarriedHex(position: Axial): GameState {
    return createTestState({
      capturedCell: position,
    });
  }
  
  /**
   * Create state during charging.
   */
  static charging(startTick: number): GameState {
    return createTestState({
      tick: startTick + 3,
      captureChargeStartTick: startTick,
    });
  }
  
  /**
   * Create state in action mode.
   */
  static inActionMode(): GameState {
    return createTestState({
      isActionMode: true,
    });
  }
  
  /**
   * Create state with protagonist and cursor at specific positions.
   */
  static withPositions(protagonist: Axial, cursor: Axial): GameState {
    return createTestState({
      protagonist,
      cursor,
    });
  }
  
  /**
   * Create state with protagonist adjacent to colored hex.
   */
  static adjacentToColoredHex(colorIndex: number = 1): GameState {
    const protagonist = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = createTestGrid(5, [
      { q: target.q, r: target.r, colorIndex },
    ]);
    
    return createTestState({
      protagonist,
      cursor: target,
      grid,
    });
  }
  
  /**
   * Create state ready to release (carrying, adjacent to empty cursor).
   */
  static readyToRelease(): GameState {
    const capturedCell = { q: 0, r: 0 };
    const protagonist = { q: 1, r: 0 };
    const cursor = { q: 2, r: 0 };
    
    return createTestState({
      protagonist,
      cursor,
      capturedCell,
      isActionMode: true,
    });
  }
}

/**
 * Mock RNG that returns predictable values.
 */
export function createMockRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

/**
 * Deterministic RNG for testing (always returns same value).
 */
export function createFixedRng(value: number = 0.5): () => number {
  return () => value;
}
