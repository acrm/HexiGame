# Application Layer - Command System Module

## Module Overview

**Package**: `src/application/commands`  
**Responsibility**: Process player actions as immutable commands  
**Dependencies**: Domain Layer (Game Logic), State Machine  
**Dependents**: Input System, Game Container

## Design Principles

1. **Command Pattern**: Each action is an object
2. **Immutability**: Commands don't modify state, return new state
3. **Composability**: Commands can be queued and batched
4. **Reversibility**: Commands can be undone (future)
5. **Serializability**: Commands can be serialized for replay/network

## Command Hierarchy

### Base Command Interface

```typescript
interface IGameCommand {
  /**
   * Unique command type identifier.
   */
  readonly type: string;
  
  /**
   * Timestamp when command was created.
   */
  readonly timestamp: number;
  
  /**
   * Check if command can be executed in current state.
   */
  canExecute(state: GameState, params: GameParams): boolean;
  
  /**
   * Execute command, returning new state.
   */
  execute(
    state: GameState,
    params: GameParams,
    rng: () => number
  ): GameState;
  
  /**
   * Get human-readable description.
   */
  describe(): string;
  
  /**
   * Serialize command to JSON.
   */
  toJSON(): object;
}
```

### Command Types

```typescript
enum CommandType {
  // Cursor Movement
  MOVE_CURSOR = 'move_cursor',
  MOVE_CURSOR_DELTA = 'move_cursor_delta',
  
  // Action Mode
  START_ACTION = 'start_action',
  END_ACTION = 'end_action',
  
  // Protagonist Movement
  MOVE_PROTAGONIST = 'move_protagonist',
  MOVE_PROTAGONIST_DELTA = 'move_protagonist_delta',
  
  // Capture & Release
  START_CHARGE = 'start_charge',
  CANCEL_CHARGE = 'cancel_charge',
  DROP_CARRIED = 'drop_carried',
  
  // Inventory
  EAT_TO_INVENTORY = 'eat_to_inventory',
  TOGGLE_FIELD = 'toggle_field',
  
  // System
  TICK = 'tick',
  RESET = 'reset',
}
```

## Concrete Commands

### Movement Commands

```typescript
class MoveCursorCommand implements IGameCommand {
  readonly type = CommandType.MOVE_CURSOR;
  
  constructor(
    readonly target: Axial,
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    // Check if target is in active grid
    const grid = state.activeField === 'world' ? state.grid : state.inventoryGrid;
    return GridOperations.getCell(grid, this.target) !== undefined;
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    return StateTransitions.setCursor(state, this.target);
  }
  
  describe(): string {
    return `Move cursor to (${this.target.q}, ${this.target.r})`;
  }
  
  toJSON(): object {
    return {
      type: this.type,
      target: this.target,
      timestamp: this.timestamp,
    };
  }
}

class MoveCursorDeltaCommand implements IGameCommand {
  readonly type = CommandType.MOVE_CURSOR_DELTA;
  
  constructor(
    readonly direction: HexDirection,
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    const delta = DIRECTION_VECTORS[this.direction];
    const target = AxialMath.add(state.cursor, delta);
    const grid = state.activeField === 'world' ? state.grid : state.inventoryGrid;
    return GridOperations.getCell(grid, target) !== undefined;
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    const delta = DIRECTION_VECTORS[this.direction];
    const newCursor = AxialMath.add(state.cursor, delta);
    return StateTransitions.setCursor(state, newCursor);
  }
  
  describe(): string {
    return `Move cursor ${HexDirection[this.direction]}`;
  }
  
  toJSON(): object {
    return {
      type: this.type,
      direction: this.direction,
      timestamp: this.timestamp,
    };
  }
}

class MoveProtagonistCommand implements IGameCommand {
  readonly type = CommandType.MOVE_PROTAGONIST;
  
  constructor(
    readonly target: Axial,
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    const engine = new GameEngine();
    const eligibility = engine.canMove(state, this.target);
    return eligibility.canMove;
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    const engine = new GameEngine();
    return engine.applyMove(state, this.target);
  }
  
  describe(): string {
    return `Move protagonist to (${this.target.q}, ${this.target.r})`;
  }
  
  toJSON(): object {
    return {
      type: this.type,
      target: this.target,
      timestamp: this.timestamp,
    };
  }
}
```

### Action Commands

```typescript
class StartActionCommand implements IGameCommand {
  readonly type = CommandType.START_ACTION;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return state.captureCooldownTicksRemaining === 0;
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    const engine = new GameEngine();
    return engine.startActionMode(state);
  }
  
  describe(): string {
    return 'Start action mode';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}

class EndActionCommand implements IGameCommand {
  readonly type = CommandType.END_ACTION;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return state.isActionMode;
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    const engine = new GameEngine();
    return engine.endActionMode(state);
  }
  
  describe(): string {
    return 'End action mode';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}

class DropCarriedCommand implements IGameCommand {
  readonly type = CommandType.DROP_CARRIED;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    const engine = new GameEngine();
    return engine.canDrop(state);
  }
  
  execute(state: GameState, params: GameParams): GameState {
    if (!this.canExecute(state, params)) return state;
    const engine = new GameEngine();
    return engine.applyDrop(state);
  }
  
  describe(): string {
    return 'Drop carried hex';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}
```

### Inventory Commands

```typescript
class EatToInventoryCommand implements IGameCommand {
  readonly type = CommandType.EAT_TO_INVENTORY;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return state.capturedCell !== null;
  }
  
  execute(state: GameState, params: GameParams, rng: () => number): GameState {
    if (!this.canExecute(state, params)) return state;
    
    // Find empty spot in inventory
    const emptySpot = GridOperations.getEmptyCells(state.inventoryGrid)[0];
    if (!emptySpot) return state; // Inventory full
    
    // Get color from captured cell
    const capturedCell = GridOperations.getCell(state.grid, state.capturedCell!);
    if (!capturedCell) return state;
    
    // Place in inventory
    const newInventoryCell = {
      q: emptySpot.q,
      r: emptySpot.r,
      colorIndex: capturedCell.colorIndex,
    };
    const newInventory = GridOperations.setCell(state.inventoryGrid, newInventoryCell);
    
    // Remove from world
    const clearedWorldCell = { ...capturedCell, colorIndex: null };
    const newWorld = GridOperations.setCell(state.grid, clearedWorldCell);
    
    // Update palette counts
    const color = params.ColorPalette[capturedCell.colorIndex!];
    const newCounts = {
      ...state.paletteCounts,
      [color]: (state.paletteCounts?.[color] ?? 0) + 1,
    };
    
    return {
      ...state,
      grid: newWorld,
      inventoryGrid: newInventory,
      capturedCell: null,
      paletteCounts: newCounts,
    };
  }
  
  describe(): string {
    return 'Eat carried hex to inventory';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}

class ToggleFieldCommand implements IGameCommand {
  readonly type = CommandType.TOGGLE_FIELD;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return true; // Can always toggle
  }
  
  execute(state: GameState, params: GameParams): GameState {
    const newField = state.activeField === 'world' ? 'inventory' : 'world';
    return StateTransitions.setActiveField(state, newField);
  }
  
  describe(): string {
    return 'Toggle active field';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}
```

### System Commands

```typescript
class TickCommand implements IGameCommand {
  readonly type = CommandType.TICK;
  
  constructor(
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return true;
  }
  
  execute(state: GameState, params: GameParams, rng: () => number): GameState {
    const stateMachine = new GameStateMachine();
    return stateMachine.handleTick(state, params, rng);
  }
  
  describe(): string {
    return 'Game tick';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      timestamp: this.timestamp,
    };
  }
}

class ResetCommand implements IGameCommand {
  readonly type = CommandType.RESET;
  
  constructor(
    readonly seed?: number,
    readonly timestamp: number = Date.now()
  ) {}
  
  canExecute(state: GameState, params: GameParams): boolean {
    return true;
  }
  
  execute(state: GameState, params: GameParams, rng: () => number): GameState {
    const newRng = this.seed !== undefined 
      ? mulberry32(this.seed)
      : mulberry32(Date.now());
    return createInitialState(params, newRng);
  }
  
  describe(): string {
    return this.seed !== undefined
      ? `Reset game with seed ${this.seed}`
      : 'Reset game';
  }
  
  toJSON(): object {
    return {
      type: this.type,
      seed: this.seed,
      timestamp: this.timestamp,
    };
  }
}
```

## Command Processor

### Command Queue

```typescript
class CommandQueue {
  private queue: IGameCommand[] = [];
  
  /**
   * Add command to queue.
   */
  enqueue(command: IGameCommand): void {
    this.queue.push(command);
  }
  
  /**
   * Add multiple commands to queue.
   */
  enqueueBatch(commands: IGameCommand[]): void {
    this.queue.push(...commands);
  }
  
  /**
   * Get next command without removing.
   */
  peek(): IGameCommand | null {
    return this.queue[0] ?? null;
  }
  
  /**
   * Remove and return next command.
   */
  dequeue(): IGameCommand | null {
    return this.queue.shift() ?? null;
  }
  
  /**
   * Remove all commands.
   */
  clear(): void {
    this.queue = [];
  }
  
  /**
   * Get queue size.
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Check if queue is empty.
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
  
  /**
   * Get all commands (copy).
   */
  getAll(): IGameCommand[] {
    return [...this.queue];
  }
}
```

### Command Processor

```typescript
class CommandProcessor {
  private readonly queue: CommandQueue;
  private readonly history: IGameCommand[];
  private readonly maxHistorySize: number;
  
  constructor(maxHistorySize: number = 1000) {
    this.queue = new CommandQueue();
    this.history = [];
    this.maxHistorySize = maxHistorySize;
  }
  
  /**
   * Enqueue command for execution.
   */
  enqueue(command: IGameCommand): void {
    this.queue.enqueue(command);
  }
  
  /**
   * Process all queued commands.
   */
  processAll(
    state: GameState,
    params: GameParams,
    rng: () => number
  ): GameState {
    let currentState = state;
    
    while (!this.queue.isEmpty()) {
      const command = this.queue.dequeue();
      if (!command) break;
      
      if (command.canExecute(currentState, params)) {
        currentState = command.execute(currentState, params, rng);
        this.addToHistory(command);
      }
    }
    
    return currentState;
  }
  
  /**
   * Process next command only.
   */
  processNext(
    state: GameState,
    params: GameParams,
    rng: () => number
  ): GameState {
    const command = this.queue.dequeue();
    if (!command) return state;
    
    if (command.canExecute(state, params)) {
      this.addToHistory(command);
      return command.execute(state, params, rng);
    }
    
    return state;
  }
  
  /**
   * Clear command queue.
   */
  clearQueue(): void {
    this.queue.clear();
  }
  
  /**
   * Get command history.
   */
  getHistory(): IGameCommand[] {
    return [...this.history];
  }
  
  /**
   * Clear command history.
   */
  clearHistory(): void {
    this.history.length = 0;
  }
  
  /**
   * Export history as JSON.
   */
  exportHistory(): object[] {
    return this.history.map(cmd => cmd.toJSON());
  }
  
  private addToHistory(command: IGameCommand): void {
    this.history.push(command);
    
    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}
```

## Testing Requirements

### Unit Tests

1. **Command Creation Tests**:
   - Each command type instantiates correctly
   - toJSON serializes all required fields
   - describe() returns readable string

2. **Command Validation Tests**:
   - canExecute returns false for invalid states
   - canExecute returns true for valid states
   - Boundary conditions handled correctly

3. **Command Execution Tests**:
   - execute returns new state (immutability)
   - execute applies correct changes
   - execute returns unchanged state when invalid

4. **Queue Tests**:
   - enqueue adds to end
   - dequeue removes from front (FIFO)
   - clear empties queue
   - size/isEmpty work correctly

5. **Processor Tests**:
   - processAll executes all valid commands
   - processAll skips invalid commands
   - history tracks executed commands
   - history respects max size

### Integration Tests

1. Command sequence: move cursor, start action, move protagonist, capture
2. Invalid command ignored: move out of bounds, then valid move succeeds
3. Batch processing: multiple moves processed in order
4. History replay: export history, create new state, replay produces same result
5. Command cancellation: clear queue before processing

### Serialization Tests

1. Every command round-trips through JSON
2. Deserialized command behaves identically
3. History export/import preserves order
4. Timestamps preserved

## Performance Considerations

- Command instantiation: lightweight objects
- Queue operations: O(1) enqueue, O(1) dequeue
- History: bounded size, O(1) append
- Batch processing: single state update per command

## Dependencies

### Required Modules
- Domain/Game Logic (for GameEngine, StateTransitions)
- Domain/Grid System (for movement validation)
- Application/State Machine (for mode transitions)

### Exports
- `IGameCommand` interface
- All command classes
- `CommandQueue` class
- `CommandProcessor` class
- `CommandType` enum

## Future Extensions

1. **Undo/Redo**: Store inverse commands
2. **Macros**: Composite commands
3. **Conditional Commands**: Execute if condition met
4. **Network Commands**: Serialize for multiplayer
5. **Command Validation**: Centralized validation rules
6. **Command Middleware**: Pre/post-execution hooks
