# Domain Layer - Core Game Logic Module

## Module Overview

**Package**: `src/domain/game-logic`  
**Responsibility**: Implements core game rules and state transitions  
**Dependencies**: Grid System Module only  
**Dependents**: Application Layer (State Machine, Command System)

## Design Principles

1. **Pure Functions**: All functions are pure (no side effects)
2. **Immutability**: State is never modified in place
3. **Determinism**: Given same inputs, always produce same outputs
4. **Testability**: Every function independently testable
5. **Framework-Free**: No dependencies on React, rendering, or I/O

## Data Structures

### GameState
Complete snapshot of game state at a point in time.

```typescript
interface GameState {
  // Time
  readonly tick: number;                          // Current game tick (0-based)
  readonly remainingSeconds: number;              // Countdown timer value
  
  // Spatial
  readonly cursor: Axial;                         // Where player is looking/targeting
  readonly protagonist: Axial;                    // Player character position
  readonly facingDirIndex: number;                // Direction facing (0-5)
  
  // Grids
  readonly grid: HexGrid;                         // Main world grid
  readonly inventoryGrid: HexGrid;                // Inventory storage grid
  readonly activeField: 'world' | 'inventory';    // Which grid is active
  
  // Capture State
  readonly capturedCell: Axial | null;            // Position of carried hex (if any)
  readonly captureChargeStartTick: number | null; // When charging began (null if not charging)
  readonly captureCooldownTicksRemaining: number; // Cooldown counter
  
  // Visual Feedback
  readonly flash: FlashState | null;              // Success/failure flash effect
  
  // Action Mode
  readonly isActionMode: boolean;                 // Is Space/ACT held?
  readonly isReleasing: boolean;                  // Is protagonist moving to drop?
  
  // Statistics (optional)
  readonly paletteCounts?: Record<string, number>; // Hexes eaten per color
}
```

### FlashState
Temporary visual feedback state.

```typescript
interface FlashState {
  readonly type: 'success' | 'failure';
  readonly startedTick: number;
}
```

### CaptureEligibility
Result of capture validation.

```typescript
interface CaptureEligibility {
  readonly canCapture: boolean;
  readonly reason?: CaptureIneligibilityReason;
  readonly chancePercent?: number;
}

enum CaptureIneligibilityReason {
  NO_TARGET = 'no_target',
  TARGET_EMPTY = 'target_empty',
  ALREADY_CARRYING = 'already_carrying',
  ON_COOLDOWN = 'on_cooldown',
  NOT_ADJACENT = 'not_adjacent',
  WRONG_FIELD = 'wrong_field',
}
```

### MoveEligibility
Result of movement validation.

```typescript
interface MoveEligibility {
  readonly canMove: boolean;
  readonly reason?: MoveIneligibilityReason;
}

enum MoveIneligibilityReason {
  OUT_OF_BOUNDS = 'out_of_bounds',
  BLOCKED_BY_COLOR = 'blocked_by_color',
  INVALID_DIRECTION = 'invalid_direction',
}
```

## Public Interface

### GameEngine

Main game logic orchestrator.

```typescript
class GameEngine {
  /**
   * Advance game state by one tick.
   * Updates timers, cooldowns, flashes, and continuous actions.
   */
  tick(state: GameState, params: GameParams): GameState;
  
  /**
   * Check if capture is possible at current cursor position.
   */
  canCapture(state: GameState, params: GameParams): CaptureEligibility;
  
  /**
   * Check if protagonist can move to target position.
   */
  canMove(state: GameState, target: Axial): MoveEligibility;
  
  /**
   * Check if protagonist can drop carried hex.
   */
  canDrop(state: GameState): boolean;
  
  /**
   * Attempt capture at cursor position with given RNG result.
   * Returns new state with capture outcome applied.
   */
  applyCapture(
    state: GameState, 
    params: GameParams, 
    rollValue: number // 0-100
  ): GameState;
  
  /**
   * Move protagonist to target position.
   * If carrying, transports captured hex.
   */
  applyMove(state: GameState, target: Axial): GameState;
  
  /**
   * Drop carried hex at current position.
   */
  applyDrop(state: GameState): GameState;
  
  /**
   * Start action mode (Space/ACT pressed).
   */
  startActionMode(state: GameState): GameState;
  
  /**
   * End action mode (Space/ACT released).
   */
  endActionMode(state: GameState): GameState;
  
  /**
   * Start capture charge sequence.
   */
  startCharge(state: GameState): GameState;
  
  /**
   * Cancel capture charge (released too early).
   */
  cancelCharge(state: GameState): GameState;
  
  /**
   * Start release sequence (moving to drop location).
   */
  startRelease(state: GameState): GameState;
  
  /**
   * Complete release sequence (drop at cursor).
   */
  completeRelease(state: GameState): GameState;
}
```

### GameRules

Pure game rule validation functions.

```typescript
class GameRules {
  /**
   * Calculate capture success chance for target hex.
   */
  static calculateCaptureChance(
    targetColorIndex: number,
    params: GameParams
  ): number;
  
  /**
   * Calculate palette distance between colors.
   */
  static paletteDistance(
    colorA: number,
    colorB: number,
    paletteSize: number
  ): number;
  
  /**
   * Check if protagonist is adjacent to target.
   */
  static isAdjacent(
    protagonist: Axial,
    target: Axial
  ): boolean;
  
  /**
   * Check if movement is blocked while carrying.
   */
  static isMovementBlocked(
    state: GameState,
    target: Axial
  ): boolean;
  
  /**
   * Check if capture charge duration has been met.
   */
  static hasChargedLongEnough(
    state: GameState,
    params: GameParams
  ): boolean;
  
  /**
   * Check if cooldown has expired.
   */
  static isCooldownActive(state: GameState): boolean;
  
  /**
   * Check if protagonist can enter action mode.
   */
  static canEnterActionMode(state: GameState): boolean;
  
  /**
   * Determine if flicker should be visible (for carried hex).
   */
  static isFlickerVisible(
    tick: number,
    params: GameParams
  ): boolean;
}
```

### GameClock

Tick-based timing utilities.

```typescript
class GameClock {
  /**
   * Advance tick counter.
   */
  static incrementTick(state: GameState): GameState;
  
  /**
   * Update countdown timer (every 12 ticks = 1 second).
   */
  static updateTimer(
    state: GameState,
    params: GameParams
  ): GameState;
  
  /**
   * Decrement cooldown counter.
   */
  static decrementCooldown(state: GameState): GameState;
  
  /**
   * Clear flash if duration exceeded.
   */
  static updateFlash(
    state: GameState,
    params: GameParams
  ): GameState;
  
  /**
   * Calculate ticks elapsed since event.
   */
  static ticksElapsed(
    currentTick: number,
    startTick: number
  ): number;
}
```

### StateTransitions

Low-level state update functions.

```typescript
class StateTransitions {
  /**
   * Set cursor position.
   */
  static setCursor(state: GameState, cursor: Axial): GameState;
  
  /**
   * Set protagonist position.
   */
  static setProtagonist(state: GameState, position: Axial): GameState;
  
  /**
   * Set facing direction.
   */
  static setFacing(state: GameState, dirIndex: number): GameState;
  
  /**
   * Set captured cell.
   */
  static setCaptured(state: GameState, cell: Axial | null): GameState;
  
  /**
   * Set active field.
   */
  static setActiveField(
    state: GameState,
    field: 'world' | 'inventory'
  ): GameState;
  
  /**
   * Update grid cell.
   */
  static updateCell(
    state: GameState,
    field: 'world' | 'inventory',
    cell: Cell
  ): GameState;
  
  /**
   * Set flash state.
   */
  static setFlash(state: GameState, flash: FlashState | null): GameState;
  
  /**
   * Set cooldown.
   */
  static setCooldown(state: GameState, ticks: number): GameState;
  
  /**
   * Set charge start.
   */
  static setChargeStart(state: GameState, tick: number | null): GameState;
  
  /**
   * Set action mode.
   */
  static setActionMode(state: GameState, active: boolean): GameState;
  
  /**
   * Set releasing state.
   */
  static setReleasing(state: GameState, releasing: boolean): GameState;
}
```

## Implementation Details

### Capture Logic Flow

1. Player presses Space/ACT while over colored hex
2. `canCapture()` validates: not carrying, not on cooldown, adjacent, has color
3. `startCharge()` records start tick
4. Each tick checks if duration met (`hasChargedLongEnough()`)
5. When met, `applyCapture()` rolls RNG vs chance
6. Success: capture hex, set flash, clear charge
7. Failure: start cooldown, set flash, clear charge

### Movement Logic Flow

1. Player inputs direction
2. Calculate target position
3. `canMove()` validates: in bounds, not blocked (if carrying)
4. `applyMove()` updates protagonist position
5. If carrying: transport hex, update captured cell position
6. Update facing direction to movement direction

### Action Mode Logic

1. Player holds Space/ACT
2. `startActionMode()` sets flag
3. Each tick, protagonist moves toward cursor (if not adjacent)
4. When adjacent:
   - If cursor has colored hex → `startCharge()`
   - If carrying and cursor empty → `startRelease()`
5. Player releases Space/ACT
6. `endActionMode()` clears flag, may cancel charge

### Cooldown System

- Post-failure: `CaptureFailureCooldownTicks` (default 36 ticks = 3s)
- Post-drop: 6 ticks = 0.5s
- During cooldown: cannot start charge
- Decremented each tick
- Visual feedback: rotating red edge on cursor

### Flash System

- Duration: `CaptureFlashDurationTicks` (default 2 ticks)
- Types: success (green/bright), failure (red/dark)
- Auto-clears after duration
- Rendered as stroke color change on cursor

## Error Handling

All functions should validate inputs and return gracefully:
- Invalid positions: return unchanged state
- Out of bounds: return unchanged state
- Precondition failures: return unchanged state
- Never throw exceptions in core logic

## Performance Considerations

- Grid lookups: O(1) via Map
- State updates: shallow copy with structural sharing
- No unnecessary allocations
- Memoize derived values where appropriate

## Testing Requirements

### Unit Tests

1. **Capture Tests**:
   - Can capture when all conditions met
   - Cannot capture when carrying
   - Cannot capture during cooldown
   - Cannot capture non-adjacent
   - Cannot capture empty cell
   - Chance calculation matches formula
   - Success applies capture correctly
   - Failure applies cooldown correctly

2. **Movement Tests**:
   - Can move to empty adjacent
   - Cannot move out of bounds
   - Cannot move to colored hex while carrying
   - Carrying transports hex correctly
   - Facing direction updates correctly

3. **Action Mode Tests**:
   - Cannot start during cooldown
   - Protagonist moves toward cursor
   - Charge starts when adjacent to colored hex
   - Release starts when adjacent to empty while carrying
   - Ending mode cancels charge if too early

4. **Clock Tests**:
   - Tick increments correctly
   - Timer decrements every 12 ticks
   - Cooldown decrements each tick
   - Flash clears after duration

5. **Rule Tests**:
   - Palette distance calculation
   - Adjacency detection
   - Charge duration validation
   - Cooldown active detection

### Integration Tests

1. Complete capture flow (charge → roll → success → carry)
2. Failed capture flow (charge → roll → failure → cooldown)
3. Transport flow (capture → move → move → drop)
4. World/inventory switching with carried hex
5. Multi-step movement paths

### Property-Based Tests

1. State updates are pure (same input = same output)
2. All state transitions preserve grid invariants
3. Cooldown never negative
4. Flash duration bounded
5. Protagonist always in bounds

## Migration Notes

Current `pureLogic.ts` already implements many of these concepts but:
- Functions are scattered, not organized into classes
- Some validation mixed with transitions
- Missing explicit eligibility types
- No error handling strategy

Refactor should:
- Extract and organize into classes
- Separate validation from application
- Add eligibility result types
- Standardize error handling

## Dependencies

### Required Modules
- Grid System Module (for Axial, HexGrid operations)
- GameParams (from Configuration Module)

### Exports
- `GameEngine` class
- `GameRules` class
- `GameClock` class
- `StateTransitions` class
- All types and interfaces

## Future Extensions

1. **Undo/Redo**: State history stack
2. **Replay**: Store command sequence instead of state snapshots
3. **AI Players**: Expose rule-checking for decision making
4. **Custom Rules**: Plugin system for rule variations
5. **Multiplayer**: Conflict resolution for concurrent actions
