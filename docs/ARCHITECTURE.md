# HexiGame - High-Level Architecture

## Overview

HexiGame is a hex-grid based color manipulation puzzle game. This document defines the target architecture for a maintainable, testable, and extensible codebase.

## Architecture Layers

The system follows a layered architecture with clear dependency rules:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (React Components, UI, Rendering)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       Application Layer                 │
│  (Game Orchestration, State Machine)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Domain Layer                    │
│  (Game Logic, Rules, Entities)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Infrastructure Layer               │
│  (Input, Rendering, Storage)            │
└─────────────────────────────────────────┘
```

### Dependency Rules

1. Each layer may only depend on layers below it
2. Domain layer must have ZERO dependencies on outer layers
3. Infrastructure adapts domain to external systems, not vice versa
4. Presentation layer orchestrates but doesn't contain business logic

## Module Structure

### 1. Domain Layer (Pure Business Logic)

#### 1.1 Core Game Logic Module
**Responsibility**: Implements game rules and state transitions

**Key Components**:
- `GameState` - Immutable game state structure
- `GameRules` - Pure functions for game rule validation
- `StateTransitions` - Pure state transition functions
- `GameClock` - Tick-based timing logic

**Interfaces**:
```typescript
interface IGameEngine {
  tick(state: GameState, params: GameParams): GameState;
  canCapture(state: GameState, target: Axial): CaptureEligibility;
  canMove(state: GameState, target: Axial): MoveEligibility;
  canDrop(state: GameState): DropEligibility;
  applyCapture(state: GameState, target: Axial, success: boolean): GameState;
  applyMove(state: GameState, target: Axial): GameState;
  applyDrop(state: GameState): GameState;
}
```

#### 1.2 Grid System Module
**Responsibility**: Hexagonal grid mathematics and operations

**Key Components**:
- `AxialCoordinate` - Axial coordinate value object
- `HexGrid` - Grid data structure and queries
- `HexMath` - Distance, neighbors, pathfinding
- `GridGenerator` - Initial grid creation algorithms

**Interfaces**:
```typescript
interface IHexGrid {
  getCell(coord: Axial): Cell | undefined;
  setCell(cell: Cell): IHexGrid;
  neighbors(coord: Axial): Axial[];
  inBounds(coord: Axial): boolean;
  distance(a: Axial, b: Axial): number;
  path(from: Axial, to: Axial): Axial[];
}
```

#### 1.3 Game Entities Module
**Responsibility**: Domain entities and value objects

**Key Components**:
- `Cell` - Single hex cell entity
- `Protagonist` - Player character entity
- `CapturedHex` - Carried hex entity
- `ColorPalette` - Color system value object

**Interfaces**:
```typescript
interface IEntity {
  readonly id: string;
  readonly position: Axial;
}

interface ICell extends IEntity {
  readonly colorIndex: number | null;
}

interface IProtagonist extends IEntity {
  readonly facingDirection: number;
  readonly isCarrying: boolean;
  readonly carriedCell: Axial | null;
}
```

### 2. Application Layer (Use Cases & Orchestration)

#### 2.1 Game State Machine Module
**Responsibility**: Manages game mode transitions and state

**Key Components**:
- `GameMode` - Enum/type of possible game modes
- `StateMachine` - Mode transition logic
- `ModeHandlers` - Mode-specific behavior

**Game Modes**:
- `Free` - Normal movement, can initiate capture
- `ActionMode` - Space/ACT held, protagonist moving to cursor
- `Charging` - Adjacent to target, charging capture
- `Carrying` - Transporting a captured hex
- `Releasing` - Moving to drop location
- `Cooldown` - Post-failure cooldown period

**Interfaces**:
```typescript
interface IGameStateMachine {
  getCurrentMode(state: GameState): GameMode;
  canTransition(from: GameMode, to: GameMode, state: GameState): boolean;
  transition(state: GameState, to: GameMode): GameState;
  handleAction(state: GameState, action: GameAction): GameState;
}
```

#### 2.2 Command System Module
**Responsibility**: Processes player actions as commands

**Key Components**:
- `GameCommand` - Base command interface
- `CommandQueue` - Command buffering and execution
- `CommandHandlers` - Command → state transition mapping

**Command Types**:
- `MoveCursorCommand` - Move cursor/target
- `StartActionCommand` - Begin action mode (Space/ACT down)
- `EndActionCommand` - End action mode (Space/ACT up)
- `ToggleFieldCommand` - Switch world/inventory
- `EatCommand` - Eat carried hex to inventory

**Interfaces**:
```typescript
interface IGameCommand {
  readonly type: string;
  execute(state: GameState, params: GameParams): GameState;
  canExecute(state: GameState): boolean;
}

interface ICommandProcessor {
  enqueue(command: IGameCommand): void;
  process(state: GameState): GameState;
  clear(): void;
}
```

#### 2.3 Game Session Module
**Responsibility**: Manages game lifecycle and session state

**Key Components**:
- `SessionManager` - Session creation, save, load
- `SessionState` - Extended state with metadata
- `ProgressTracker` - Score, statistics tracking

**Interfaces**:
```typescript
interface IGameSession {
  start(params: GameParams, seed?: number): SessionState;
  pause(): void;
  resume(): void;
  reset(): void;
  save(): SerializedSession;
  load(data: SerializedSession): void;
}
```

### 3. Infrastructure Layer (External Interfaces)

#### 3.1 Input System Module
**Responsibility**: Abstract input from various sources

**Key Components**:
- `InputAdapter` - Convert raw input to commands
- `KeyboardInput` - Desktop keyboard handler
- `TouchInput` - Mobile touch handler
- `JoystickInput` - Virtual joystick handler

**Interfaces**:
```typescript
interface IInputSource {
  initialize(): void;
  dispose(): void;
  getCommands(): IGameCommand[];
}

interface IInputMapper {
  mapToCommand(rawInput: RawInput): IGameCommand | null;
}
```

#### 3.2 Rendering System Module
**Responsibility**: Render game state to screen

**Key Components**:
- `Renderer` - Abstract renderer interface
- `CanvasRenderer` - HTML5 Canvas implementation
- `RenderPipeline` - Layered rendering system
- `VisualEffects` - Animations, particles, flashes

**Layers**:
1. Grid layer (background hexes)
2. Entity layer (protagonist, carried hex)
3. Cursor layer (cursor, charge indicator)
4. Effect layer (flash, flicker)
5. UI layer (HUD, palette)

**Interfaces**:
```typescript
interface IRenderer {
  initialize(canvas: HTMLCanvasElement): void;
  render(state: GameState, params: GameParams): void;
  dispose(): void;
}

interface IRenderLayer {
  readonly zIndex: number;
  render(ctx: RenderContext, state: GameState): void;
}
```

#### 3.3 Configuration Module
**Responsibility**: Manage game parameters and settings

**Key Components**:
- `GameParams` - Complete parameter set
- `ConfigValidator` - Validate parameter combinations
- `ConfigPresets` - Named preset configurations

**Interfaces**:
```typescript
interface IConfigManager {
  getParams(): GameParams;
  setParams(params: Partial<GameParams>): void;
  validate(params: GameParams): ValidationResult;
  loadPreset(name: string): GameParams;
  savePreset(name: string, params: GameParams): void;
}
```

### 4. Presentation Layer (React Components)

#### 4.1 Component Hierarchy
```
App
├── GameContainer (orchestrator)
│   ├── GameCanvas (rendering)
│   ├── GameControls (input UI)
│   │   ├── DesktopControls
│   │   └── MobileControls
│   ├── GameHUD (status display)
│   │   ├── PaletteCluster
│   │   ├── TimerDisplay
│   │   └── StatsDisplay
│   └── GameModals (popups)
│       ├── InfoModal
│       └── PauseModal
└── DebugPanel (dev tools)
```

#### 4.2 Component Responsibilities
- **GameContainer**: Session lifecycle, command dispatch, state subscription
- **GameCanvas**: Rendering delegation only, no logic
- **GameControls**: Input → command conversion, platform detection
- **GameHUD**: Read-only state display
- **DebugPanel**: Development tools (state inspector, command history)

## Data Flow

### Command Flow (User Input → State Change)
```
Input Device → InputAdapter → Command → CommandProcessor → StateTransition → NewState
```

### Render Flow (State → Screen)
```
GameState → Renderer → RenderPipeline → Layers → Canvas
```

### Tick Flow (Time → State Update)
```
Timer → TickCommand → GameEngine.tick() → NewState → Render
```

## State Management Strategy

### Immutability
- All state is immutable
- State transitions create new state objects
- No in-place mutations anywhere

### Single Source of Truth
- One `GameState` object represents complete game state
- Derived values computed on-demand, not stored
- No duplicate state across components

### Predictable Updates
- State changes only through defined transitions
- All transitions are pure functions
- Side effects isolated to infrastructure layer

## Testing Strategy

### Unit Tests
Each module has isolated unit tests:
- **Domain modules**: Pure function tests, property-based tests
- **Application modules**: State machine tests, command tests
- **Infrastructure modules**: Adapter tests, mock implementations

### Integration Tests
Cross-module interaction tests:
- Complete user flows (move, capture, drop)
- Mode transitions (free → charging → carrying)
- Multi-field interactions (world ↔ inventory)

### Test Structure
```
tests/
├── unit/
│   ├── domain/
│   │   ├── game-logic.test.ts
│   │   ├── grid-system.test.ts
│   │   └── entities.test.ts
│   ├── application/
│   │   ├── state-machine.test.ts
│   │   ├── command-system.test.ts
│   │   └── session.test.ts
│   └── infrastructure/
│       ├── input.test.ts
│       ├── rendering.test.ts
│       └── config.test.ts
└── integration/
    ├── capture-flow.test.ts
    ├── movement-flow.test.ts
    ├── inventory-flow.test.ts
    └── complete-game.test.ts
```

## Extension Points

The architecture supports these future extensions:

1. **New Game Modes**: Add to StateMachine, implement handlers
2. **New Input Methods**: Implement InputAdapter interface
3. **New Rendering Backends**: Implement Renderer interface (WebGL, SVG)
4. **Multiplayer**: Add network layer below Application, sync state
5. **Replays**: CommandQueue already records all actions
6. **Procedural Content**: Plugin to GridGenerator
7. **Mod Support**: Configuration presets + custom rules

## Performance Considerations

- Grid operations: O(1) lookup via Map
- Rendering: Layered approach enables selective re-render
- Input: Command buffering prevents frame drops
- State: Structural sharing for efficient immutable updates

## Security Considerations

- No user data stored (session state is local only)
- RNG seed for deterministic testing (not security-critical)
- Input validation at command level prevents invalid state

## Migration Strategy (Future Implementation)

1. Keep existing code running
2. Implement new architecture in parallel
3. Add feature flag to switch between old/new
4. Migrate modules one at a time
5. Remove old code when fully migrated

## Glossary

- **Axial Coordinates**: Hex grid coordinate system using q, r values
- **Protagonist**: Player character (turtle/flower entity)
- **Capture**: Taking ownership of a colored hex
- **Carry**: Transporting a captured hex
- **Action Mode**: State when Space/ACT button is held
- **Tick**: Discrete time unit (1/12 second)
- **World Field**: Main game grid
- **Inventory Field**: Secondary storage grid
