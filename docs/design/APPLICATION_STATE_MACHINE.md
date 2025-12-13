# Application Layer - State Machine Module

## Module Overview

**Package**: `src/application/state-machine`  
**Responsibility**: Manages game mode transitions and state  
**Dependencies**: Domain Layer (Game Logic, Grid System)  
**Dependents**: Game Container Component, Command System

## Design Principles

1. **Explicit States**: Every game mode is explicitly defined
2. **Guarded Transitions**: Transitions validated before execution
3. **Single Responsibility**: Mode logic isolated in handlers
4. **Observability**: State changes are traceable
5. **Determinism**: Same state + input = same next state

## Game Modes

### Mode Definitions

```typescript
enum GameMode {
  FREE = 'free',                 // Normal movement, no active action
  ACTION_MODE = 'action_mode',   // Space/ACT held, protagonist seeking cursor
  CHARGING = 'charging',         // Adjacent to colored hex, charging capture
  CARRYING = 'carrying',         // Transporting captured hex
  RELEASING = 'releasing',       // Moving to drop location
  COOLDOWN = 'cooldown',         // Post-failure cooldown (overlays other modes)
  FLASHING = 'flashing',         // Visual feedback flash (overlays other modes)
}
```

### Mode Descriptions

**FREE**
- Default state
- Can move cursor freely
- Can move protagonist to cursor
- Can start action mode (if not on cooldown)
- Can switch world/inventory

**ACTION_MODE**
- Space/ACT button held
- Protagonist automatically moves toward cursor
- When adjacent to cursor:
  - If cursor on colored hex → transition to CHARGING
  - If carrying and cursor on empty → transition to RELEASING
- Releasing button → end action mode, return to FREE or CARRYING

**CHARGING**
- Protagonist adjacent to target hex
- Capture charge accumulating
- Display charge progress
- After charge duration:
  - Roll capture chance
  - Success → transition to CARRYING
  - Failure → transition to COOLDOWN
- Early release → cancel, return to previous mode

**CARRYING**
- Protagonist has captured hex
- Hex position follows protagonist
- Movement restricted to empty cells
- Can start action mode to initiate release
- Can eat to inventory (removes from world)

**RELEASING**
- Action mode active while carrying
- Protagonist moving toward cursor
- When adjacent to cursor on empty cell:
  - Drop hex at cursor
  - Start drop cooldown
  - Transition to COOLDOWN → FREE

**COOLDOWN** (overlay mode)
- Active after failed capture or successful drop
- Blocks starting new charges
- Decrements each tick
- Visual indicator on cursor (rotating red edge)
- Does not block movement or field switching

**FLASHING** (overlay mode)
- Brief visual feedback
- Success flash (green) after capture
- Failure flash (red) after failed attempt
- Auto-clears after duration
- Does not block any actions

## State Machine Structure

### State Machine Context

```typescript
interface StateMachineContext {
  readonly currentMode: GameMode;
  readonly previousMode: GameMode | null;
  readonly modeStack: GameMode[];  // For mode overlays
  readonly transitionHistory: TransitionRecord[];
}

interface TransitionRecord {
  readonly fromMode: GameMode;
  readonly toMode: GameMode;
  readonly tick: number;
  readonly reason: string;
}
```

### Transition Guards

```typescript
interface TransitionGuard {
  /**
   * Check if transition is allowed.
   */
  canTransition(
    from: GameMode,
    to: GameMode,
    state: GameState,
    params: GameParams
  ): TransitionEligibility;
}

interface TransitionEligibility {
  readonly allowed: boolean;
  readonly reason?: string;
}
```

## Public Interface

### GameStateMachine

Main state machine controller.

```typescript
class GameStateMachine {
  /**
   * Determine current primary mode from game state.
   */
  getCurrentMode(state: GameState): GameMode;
  
  /**
   * Get active overlay modes (cooldown, flash).
   */
  getOverlayModes(state: GameState): GameMode[];
  
  /**
   * Check if transition is valid.
   */
  canTransition(
    from: GameMode,
    to: GameMode,
    state: GameState,
    params: GameParams
  ): TransitionEligibility;
  
  /**
   * Execute transition to new mode.
   */
  transition(
    state: GameState,
    to: GameMode,
    params: GameParams
  ): GameState;
  
  /**
   * Handle tick update for current mode.
   */
  handleTick(
    state: GameState,
    params: GameParams,
    rng: () => number
  ): GameState;
  
  /**
   * Handle action start (Space/ACT pressed).
   */
  handleActionStart(state: GameState): GameState;
  
  /**
   * Handle action end (Space/ACT released).
   */
  handleActionEnd(state: GameState, params: GameParams): GameState;
  
  /**
   * Handle cursor movement.
   */
  handleCursorMove(state: GameState, target: Axial): GameState;
  
  /**
   * Handle field toggle.
   */
  handleFieldToggle(state: GameState): GameState;
  
  /**
   * Handle eat command.
   */
  handleEat(state: GameState): GameState;
}
```

### ModeHandler Interface

Each mode implements this interface.

```typescript
interface IModeHandler {
  /**
   * Mode identifier.
   */
  readonly mode: GameMode;
  
  /**
   * Initialize mode (called on entry).
   */
  enter(state: GameState, params: GameParams): GameState;
  
  /**
   * Clean up mode (called on exit).
   */
  exit(state: GameState, params: GameParams): GameState;
  
  /**
   * Update mode each tick.
   */
  tick(
    state: GameState,
    params: GameParams,
    rng: () => number
  ): GameState;
  
  /**
   * Get valid transitions from this mode.
   */
  getValidTransitions(state: GameState): GameMode[];
}
```

### Concrete Mode Handlers

```typescript
class FreeModeHandler implements IModeHandler {
  readonly mode = GameMode.FREE;
  
  enter(state: GameState): GameState {
    // Clear action mode flags
    return { ...state, isActionMode: false, isReleasing: false };
  }
  
  exit(state: GameState): GameState {
    return state;
  }
  
  tick(state: GameState, params: GameParams): GameState {
    // No automatic behavior in free mode
    return state;
  }
  
  getValidTransitions(state: GameState): GameMode[] {
    const valid = [GameMode.ACTION_MODE];
    if (state.capturedCell) valid.push(GameMode.CARRYING);
    return valid;
  }
}

class ActionModeHandler implements IModeHandler {
  readonly mode = GameMode.ACTION_MODE;
  
  enter(state: GameState): GameState {
    return { ...state, isActionMode: true };
  }
  
  exit(state: GameState): GameState {
    return { ...state, isActionMode: false };
  }
  
  tick(state: GameState, params: GameParams): GameState {
    // Move protagonist toward cursor
    // Check for charging/releasing transitions
    // Implementation delegates to game logic
    return state;
  }
  
  getValidTransitions(state: GameState): GameMode[] {
    const valid = [GameMode.FREE];
    // Check conditions for charging/releasing
    // Return valid next modes
    return valid;
  }
}

class ChargingModeHandler implements IModeHandler {
  readonly mode = GameMode.CHARGING;
  
  enter(state: GameState): GameState {
    // Record charge start tick
    return { ...state, captureChargeStartTick: state.tick };
  }
  
  exit(state: GameState): GameState {
    // Clear charge start
    return { ...state, captureChargeStartTick: null };
  }
  
  tick(state: GameState, params: GameParams, rng: () => number): GameState {
    // Check if charge duration met
    // If met, attempt capture with RNG
    // Transition to CARRYING or COOLDOWN
    return state;
  }
  
  getValidTransitions(state: GameState): GameMode[] {
    return [GameMode.CARRYING, GameMode.COOLDOWN, GameMode.ACTION_MODE];
  }
}

class CarryingModeHandler implements IModeHandler {
  readonly mode = GameMode.CARRYING;
  
  enter(state: GameState): GameState {
    // Set carrying flag
    return state;
  }
  
  exit(state: GameState): GameState {
    // Clear captured cell
    return { ...state, capturedCell: null };
  }
  
  tick(state: GameState, params: GameParams): GameState {
    // Flicker effect update
    return state;
  }
  
  getValidTransitions(state: GameState): GameMode[] {
    return [GameMode.ACTION_MODE, GameMode.FREE];
  }
}

class ReleasingModeHandler implements IModeHandler {
  readonly mode = GameMode.RELEASING;
  
  enter(state: GameState): GameState {
    return { ...state, isReleasing: true };
  }
  
  exit(state: GameState): GameState {
    return { ...state, isReleasing: false };
  }
  
  tick(state: GameState, params: GameParams): GameState {
    // Move protagonist toward drop location
    // When adjacent, drop and transition
    return state;
  }
  
  getValidTransitions(state: GameState): GameMode[] {
    return [GameMode.COOLDOWN, GameMode.CARRYING];
  }
}
```

## State Transition Diagram

```
           ┌──────────────┐
           │     FREE     │◄───────────────┐
           └──┬───────────┘                │
              │ action start               │
              ▼                            │
         ┌──────────────┐                  │
         │ ACTION_MODE  │                  │
         └──┬───────┬───┘                  │
    adjacent│       │adjacent              │
    colored │       │empty+carrying        │
            ▼       ▼                      │
       ┌─────────┐ ┌──────────┐           │
       │CHARGING │ │RELEASING │           │
       └──┬──┬───┘ └────┬─────┘           │
    fail│  │success     │complete         │
        │  ▼            │                 │
        │ ┌─────────┐   │                 │
        │ │CARRYING │───┘                 │
        │ └────┬────┘                     │
        │      │eat                       │
        │      ▼                          │
        │    [inventory]                  │
        │                                 │
        ▼                                 │
    ┌──────────┐ drop cooldown            │
    │COOLDOWN  │────────────────────────►│
    └──────────┘

    Overlay modes (active simultaneously):
    - COOLDOWN (after failure or drop)
    - FLASHING (after capture attempt)
```

## Implementation Details

### Mode Detection

Current mode determined from state flags:
```typescript
getCurrentMode(state: GameState): GameMode {
  if (state.isReleasing) return GameMode.RELEASING;
  if (state.captureChargeStartTick !== null) return GameMode.CHARGING;
  if (state.capturedCell !== null) return GameMode.CARRYING;
  if (state.isActionMode) return GameMode.ACTION_MODE;
  return GameMode.FREE;
}
```

### Transition Validation

Check preconditions before allowing transition:
- FROM FREE TO ACTION_MODE: must not be on cooldown
- FROM ACTION_MODE TO CHARGING: must be adjacent, target colored
- FROM CHARGING TO CARRYING: capture must succeed
- FROM CARRYING TO RELEASING: action mode active, cursor on empty

### Mode Stack

Overlay modes use a stack:
```
[FREE] ← base
[COOLDOWN] ← overlay
[FLASHING] ← overlay
```

Primary mode handler processes tick first, then overlays.

## Testing Requirements

### Unit Tests

1. **Mode Detection Tests**:
   - Detect FREE when no flags set
   - Detect CARRYING when capturedCell not null
   - Detect CHARGING when chargeStartTick not null
   - Detect ACTION_MODE when isActionMode true
   - Detect RELEASING when isReleasing true

2. **Transition Validation Tests**:
   - Cannot start action during cooldown
   - Cannot charge non-adjacent
   - Cannot charge empty cell
   - Cannot release without carrying
   - Can return to FREE from any mode

3. **Mode Handler Tests**:
   - Each handler implements interface correctly
   - enter() sets required flags
   - exit() clears required flags
   - tick() performs mode-specific logic
   - getValidTransitions() returns correct modes

4. **Overlay Mode Tests**:
   - Cooldown decrements each tick
   - Flash clears after duration
   - Overlays don't interfere with primary mode
   - Multiple overlays can be active

### Integration Tests

1. Complete flow: FREE → ACTION → CHARGING → CARRYING → RELEASING → COOLDOWN → FREE
2. Failed capture: ACTION → CHARGING → COOLDOWN → FREE
3. Carry and eat: CARRYING → eat → FREE with inventory updated
4. Cancel charge: CHARGING → release early → ACTION_MODE
5. Mode persistence across field toggle

### State Machine Properties

1. Every state has at least one exit transition
2. Transition guards are consistent (same state = same result)
3. No infinite loops (every mode can reach FREE)
4. Overlay modes eventually clear
5. State changes are minimal (only necessary flags modified)

## Error Handling

- Invalid transitions: log warning, return unchanged state
- Missing handlers: throw error (development only)
- Guard failures: return unchanged state, emit event
- Unexpected mode combinations: normalize to valid state

## Performance Considerations

- Mode detection: O(1) flag checks
- Transition validation: O(1) guard checks
- Handler lookup: O(1) map access
- History tracking: bounded circular buffer

## Dependencies

### Required Modules
- Domain/Game Logic (for state transitions)
- Domain/Grid System (for adjacency checks)

### Exports
- `GameStateMachine` class
- `GameMode` enum
- `IModeHandler` interface
- All mode handler classes
- Types and interfaces

## Future Extensions

1. **Custom Modes**: Plugin system for game mode mods
2. **Mode Scripting**: Define modes via configuration
3. **Visual Debugger**: State diagram visualization
4. **Time Travel**: Record/replay mode transitions
5. **Mode Analytics**: Track time in each mode
6. **Multiplayer Modes**: Coordinate mode sync
