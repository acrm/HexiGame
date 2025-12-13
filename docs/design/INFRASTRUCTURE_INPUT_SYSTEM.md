# Infrastructure Layer - Input System Module

## Module Overview

**Package**: `src/infrastructure/input`  
**Responsibility**: Abstract input from keyboard, touch, and virtual joystick  
**Dependencies**: Application Layer (Command System)  
**Dependents**: Game Container Component

## Design Principles

1. **Input Abstraction**: Platform-agnostic command generation
2. **Device Independence**: Support keyboard, touch, gamepad uniformly
3. **Configurable Mapping**: Customizable key/button bindings
4. **Debouncing**: Prevent duplicate inputs
5. **Accessibility**: Support multiple input methods simultaneously

## Input Sources

### Input Source Types

```typescript
enum InputSourceType {
  KEYBOARD = 'keyboard',
  TOUCH = 'touch',
  JOYSTICK = 'joystick',
  GAMEPAD = 'gamepad',
}
```

### Raw Input Events

```typescript
interface RawKeyboardInput {
  readonly type: 'keydown' | 'keyup';
  readonly code: string;
  readonly key: string;
  readonly timestamp: number;
}

interface RawTouchInput {
  readonly type: 'touchstart' | 'touchmove' | 'touchend';
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly timestamp: number;
}

interface RawJoystickInput {
  readonly type: 'joystick_move' | 'joystick_release';
  readonly x: number;  // -1 to 1
  readonly y: number;  // -1 to 1
  readonly timestamp: number;
}
```

## Public Interface

### IInputSource

Base interface for all input sources.

```typescript
interface IInputSource {
  /**
   * Input source type identifier.
   */
  readonly sourceType: InputSourceType;
  
  /**
   * Initialize input source (attach listeners).
   */
  initialize(): void;
  
  /**
   * Clean up input source (detach listeners).
   */
  dispose(): void;
  
  /**
   * Get commands generated since last call.
   */
  pollCommands(): IGameCommand[];
  
  /**
   * Check if input source is currently active.
   */
  isActive(): boolean;
}
```

### KeyboardInput

Desktop keyboard input source.

```typescript
class KeyboardInput implements IInputSource {
  readonly sourceType = InputSourceType.KEYBOARD;
  
  private keyStates: Map<string, boolean>;
  private commandBuffer: IGameCommand[];
  private keyMapping: KeyMapping;
  
  constructor(keyMapping: KeyMapping) {
    this.keyStates = new Map();
    this.commandBuffer = [];
    this.keyMapping = keyMapping;
  }
  
  initialize(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  
  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
  
  pollCommands(): IGameCommand[] {
    const commands = [...this.commandBuffer];
    this.commandBuffer = [];
    return commands;
  }
  
  isActive(): boolean {
    return Array.from(this.keyStates.values()).some(pressed => pressed);
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.keyStates.get(e.code)) return; // Already down
    this.keyStates.set(e.code, true);
    
    const command = this.keyMapping.mapKeyDown(e.code);
    if (command) {
      this.commandBuffer.push(command);
    }
  };
  
  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keyStates.set(e.code, false);
    
    const command = this.keyMapping.mapKeyUp(e.code);
    if (command) {
      this.commandBuffer.push(command);
    }
  };
}
```

### TouchInput

Mobile touch input source.

```typescript
class TouchInput implements IInputSource {
  readonly sourceType = InputSourceType.TOUCH;
  
  private canvas: HTMLCanvasElement;
  private activeTouches: Map<number, TouchState>;
  private commandBuffer: IGameCommand[];
  private touchMapping: TouchMapping;
  
  constructor(canvas: HTMLCanvasElement, touchMapping: TouchMapping) {
    this.canvas = canvas;
    this.activeTouches = new Map();
    this.commandBuffer = [];
    this.touchMapping = touchMapping;
  }
  
  initialize(): void {
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }
  
  dispose(): void {
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }
  
  pollCommands(): IGameCommand[] {
    const commands = [...this.commandBuffer];
    this.commandBuffer = [];
    return commands;
  }
  
  isActive(): boolean {
    return this.activeTouches.size > 0;
  }
  
  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const commands = this.touchMapping.mapTouchStart(touch);
      this.commandBuffer.push(...commands);
    }
  };
  
  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const commands = this.touchMapping.mapTouchMove(touch);
      this.commandBuffer.push(...commands);
    }
  };
  
  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const commands = this.touchMapping.mapTouchEnd(touch);
      this.commandBuffer.push(...commands);
    }
  };
}
```

### JoystickInput

Virtual joystick input source.

```typescript
class JoystickInput implements IInputSource {
  readonly sourceType = InputSourceType.JOYSTICK;
  
  private position: { x: number; y: number };
  private isActive: boolean;
  private commandBuffer: IGameCommand[];
  private lastMoveTime: number;
  private moveThrottle: number; // milliseconds
  
  constructor(moveThrottle: number = 100) {
    this.position = { x: 0, y: 0 };
    this.isActive = false;
    this.commandBuffer = [];
    this.lastMoveTime = 0;
    this.moveThrottle = moveThrottle;
  }
  
  initialize(): void {
    // Joystick managed externally, this just processes state
  }
  
  dispose(): void {
    this.position = { x: 0, y: 0 };
    this.isActive = false;
  }
  
  /**
   * Update joystick state (called by touch handler).
   */
  updatePosition(x: number, y: number): void {
    this.position = { x, y };
    this.isActive = true;
    
    const now = Date.now();
    if (now - this.lastMoveTime < this.moveThrottle) return;
    
    const direction = this.vectorToDirection(x, y);
    if (direction !== null) {
      this.commandBuffer.push(new MoveCursorDeltaCommand(direction));
      this.lastMoveTime = now;
    }
  }
  
  /**
   * Release joystick (called by touch handler).
   */
  release(): void {
    this.position = { x: 0, y: 0 };
    this.isActive = false;
  }
  
  pollCommands(): IGameCommand[] {
    const commands = [...this.commandBuffer];
    this.commandBuffer = [];
    return commands;
  }
  
  isActive(): boolean {
    return this.isActive;
  }
  
  private vectorToDirection(x: number, y: number): HexDirection | null {
    const len = Math.sqrt(x * x + y * y);
    if (len < 0.2) return null; // Dead zone
    
    // Convert to angle and map to hex direction
    const angle = Math.atan2(y, x);
    const degrees = (angle * 180 / Math.PI + 360) % 360;
    
    // Map 360 degrees to 6 hex directions (60 degrees each)
    const sectorSize = 60;
    const offset = 30; // Offset so sectors align with hex directions
    const sector = Math.floor((degrees + offset) / sectorSize) % 6;
    
    // Map sector to hex direction based on screen orientation
    // Assuming pointy-top hex with "up" at top of screen
    const mapping = [
      HexDirection.DOWN_RIGHT,  // Right (0°)
      HexDirection.DOWN,        // Down-right (60°)
      HexDirection.DOWN_LEFT,   // Down-left (120°)
      HexDirection.UP_LEFT,     // Left (180°)
      HexDirection.UP,          // Up-left (240°)
      HexDirection.UP_RIGHT,    // Up-right (300°)
    ];
    
    return mapping[sector];
  }
}
```

## Input Mapping

### KeyMapping

Maps keyboard keys to commands.

```typescript
interface KeyMapping {
  /**
   * Map key down event to command.
   */
  mapKeyDown(code: string): IGameCommand | null;
  
  /**
   * Map key up event to command.
   */
  mapKeyUp(code: string): IGameCommand | null;
}

class DefaultKeyMapping implements KeyMapping {
  mapKeyDown(code: string): IGameCommand | null {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        return new MoveCursorDeltaCommand(HexDirection.UP);
      case 'ArrowDown':
      case 'KeyS':
        return new MoveCursorDeltaCommand(HexDirection.DOWN);
      case 'ArrowLeft':
      case 'KeyA':
        return new MoveCursorDeltaCommand(HexDirection.UP_LEFT);
      case 'ArrowRight':
      case 'KeyD':
        return new MoveCursorDeltaCommand(HexDirection.DOWN_RIGHT);
      case 'KeyQ':
        return new MoveCursorDeltaCommand(HexDirection.UP_LEFT);
      case 'KeyE':
        return new MoveCursorDeltaCommand(HexDirection.UP_RIGHT);
      case 'Space':
        return new StartActionCommand();
      case 'Tab':
        return new ToggleFieldCommand();
      case 'KeyX':
        return new EatToInventoryCommand();
      default:
        return null;
    }
  }
  
  mapKeyUp(code: string): IGameCommand | null {
    switch (code) {
      case 'Space':
        return new EndActionCommand();
      default:
        return null;
    }
  }
}
```

### TouchMapping

Maps touch events to commands.

```typescript
interface TouchMapping {
  /**
   * Map touch start to commands.
   */
  mapTouchStart(touch: Touch): IGameCommand[];
  
  /**
   * Map touch move to commands.
   */
  mapTouchMove(touch: Touch): IGameCommand[];
  
  /**
   * Map touch end to commands.
   */
  mapTouchEnd(touch: Touch): IGameCommand[];
}

class DefaultTouchMapping implements TouchMapping {
  private canvas: HTMLCanvasElement;
  private hexSize: number;
  
  constructor(canvas: HTMLCanvasElement, hexSize: number) {
    this.canvas = canvas;
    this.hexSize = hexSize;
  }
  
  mapTouchStart(touch: Touch): IGameCommand[] {
    const commands: IGameCommand[] = [];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Check if touch is on button area
    if (this.isTouchOnButton(x, y, 'ACT')) {
      commands.push(new StartActionCommand());
    } else if (this.isTouchOnButton(x, y, 'EAT')) {
      commands.push(new EatToInventoryCommand());
    } else if (this.isTouchOnButton(x, y, 'INV')) {
      commands.push(new ToggleFieldCommand());
    } else {
      // Touch on field - move cursor
      const axial = HexGeometry.pixelToAxial(x, y, this.hexSize);
      commands.push(new MoveCursorCommand(axial));
    }
    
    return commands;
  }
  
  mapTouchMove(touch: Touch): IGameCommand[] {
    // Handle joystick movement separately
    return [];
  }
  
  mapTouchEnd(touch: Touch): IGameCommand[] {
    const commands: IGameCommand[] = [];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Release action button
    if (this.isTouchOnButton(x, y, 'ACT')) {
      commands.push(new EndActionCommand());
    }
    
    return commands;
  }
  
  private isTouchOnButton(x: number, y: number, button: string): boolean {
    // Implementation depends on button layout
    // Check if x,y within button bounding box
    return false; // Placeholder
  }
}
```

## Input Manager

Orchestrates multiple input sources.

```typescript
class InputManager {
  private sources: IInputSource[];
  private commandProcessor: CommandProcessor;
  
  constructor(commandProcessor: CommandProcessor) {
    this.sources = [];
    this.commandProcessor = commandProcessor;
  }
  
  /**
   * Register input source.
   */
  addSource(source: IInputSource): void {
    this.sources.push(source);
    source.initialize();
  }
  
  /**
   * Unregister input source.
   */
  removeSource(source: IInputSource): void {
    const index = this.sources.indexOf(source);
    if (index >= 0) {
      this.sources[index].dispose();
      this.sources.splice(index, 1);
    }
  }
  
  /**
   * Poll all sources and enqueue commands.
   */
  poll(): void {
    for (const source of this.sources) {
      const commands = source.pollCommands();
      for (const command of commands) {
        this.commandProcessor.enqueue(command);
      }
    }
  }
  
  /**
   * Clean up all sources.
   */
  dispose(): void {
    for (const source of this.sources) {
      source.dispose();
    }
    this.sources = [];
  }
  
  /**
   * Check if any input is active.
   */
  isAnyActive(): boolean {
    return this.sources.some(source => source.isActive());
  }
}
```

## Testing Requirements

### Unit Tests

1. **KeyboardInput Tests**:
   - Key down generates correct command
   - Key up generates correct command
   - Repeated key down ignored (no repeat)
   - All mappings work correctly
   - Dispose removes listeners

2. **TouchInput Tests**:
   - Touch on hex moves cursor
   - Touch on button triggers action
   - Multiple simultaneous touches handled
   - Dispose removes listeners

3. **JoystickInput Tests**:
   - Vector to direction conversion correct
   - Dead zone prevents jitter
   - Throttling prevents spam
   - All 6 directions reachable

4. **Input Mapping Tests**:
   - All keys in mapping return commands
   - Unknown keys return null
   - Mappings are reversible (can customize)

5. **InputManager Tests**:
   - Poll collects from all sources
   - Commands enqueued in order
   - Dispose cleans up all sources

### Integration Tests

1. Keyboard input → command → state change
2. Touch input → command → state change
3. Joystick input → command → state change
4. Multiple sources active simultaneously
5. Input during cooldown ignored correctly

## Performance Considerations

- Event handlers: avoid allocations
- Command buffering: minimal copying
- Throttling: prevent excessive updates
- Polling: O(n) where n = active sources

## Dependencies

### Required Modules
- Application/Command System (for command types)
- Domain/Grid System (for pixel to axial conversion)

### Exports
- `IInputSource` interface
- `KeyboardInput` class
- `TouchInput` class
- `JoystickInput` class
- `InputManager` class
- Mapping interfaces and default implementations

## Future Extensions

1. **Gamepad Support**: Add gamepad input source
2. **Custom Bindings**: User-configurable key mappings
3. **Input Recording**: Capture input for replay
4. **Gesture Recognition**: Swipe, pinch gestures
5. **Haptic Feedback**: Vibration on mobile
6. **Accessibility**: Voice commands, switch access
