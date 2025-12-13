# Infrastructure Layer - Rendering System Module

## Module Overview

**Package**: `src/infrastructure/rendering`  
**Responsibility**: Render game state to screen  
**Dependencies**: Domain Layer (Grid System, Game Logic)  
**Dependents**: Game Canvas Component

## Design Principles

1. **Renderer Interface**: Platform-agnostic rendering API
2. **Layered Rendering**: Independent drawable layers
3. **Performance**: Minimize redraws, batch operations
4. **Extensibility**: Easy to add new visual effects
5. **Separation**: Rendering logic separate from game logic

## Renderer Architecture

### Renderer Layers

```typescript
enum RenderLayer {
  BACKGROUND = 0,    // Grid cells background
  GRID = 1,          // Grid cell colors
  ENTITY = 2,        // Protagonist, carried hex
  CURSOR = 3,        // Cursor, charge indicator
  EFFECT = 4,        // Flash, flicker, particles
  HUD = 5,           // Palette, timer, info
  DEBUG = 6,         // Debug overlays
}
```

### Render Context

```typescript
interface RenderContext {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly hexSize: number;
  readonly params: GameParams;
}
```

## Public Interface

### IRenderer

Base renderer interface.

```typescript
interface IRenderer {
  /**
   * Initialize renderer with canvas.
   */
  initialize(canvas: HTMLCanvasElement, hexSize: number): void;
  
  /**
   * Render complete game state.
   */
  render(state: GameState, params: GameParams): void;
  
  /**
   * Render single layer (for partial updates).
   */
  renderLayer(
    layer: RenderLayer,
    state: GameState,
    params: GameParams
  ): void;
  
  /**
   * Clear canvas.
   */
  clear(): void;
  
  /**
   * Clean up renderer resources.
   */
  dispose(): void;
  
  /**
   * Resize canvas to new dimensions.
   */
  resize(width: number, height: number): void;
}
```

### CanvasRenderer

HTML5 Canvas implementation.

```typescript
class CanvasRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private hexSize: number = 10;
  private layers: Map<RenderLayer, IRenderLayer>;
  
  constructor() {
    this.layers = new Map();
    this.initializeLayers();
  }
  
  initialize(canvas: HTMLCanvasElement, hexSize: number): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hexSize = hexSize;
    
    if (!this.ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
  }
  
  render(state: GameState, params: GameParams): void {
    if (!this.canvas || !this.ctx) return;
    
    const context = this.createRenderContext(params);
    
    // Clear canvas
    this.clear();
    
    // Render layers in order
    const sortedLayers = Array.from(this.layers.entries())
      .sort((a, b) => a[0] - b[0]);
    
    for (const [_, layer] of sortedLayers) {
      if (layer.isVisible(state)) {
        layer.render(context, state);
      }
    }
  }
  
  renderLayer(
    layer: RenderLayer,
    state: GameState,
    params: GameParams
  ): void {
    const renderLayer = this.layers.get(layer);
    if (!renderLayer || !this.canvas || !this.ctx) return;
    
    const context = this.createRenderContext(params);
    renderLayer.render(context, state);
  }
  
  clear(): void {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  dispose(): void {
    this.canvas = null;
    this.ctx = null;
    this.layers.clear();
  }
  
  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  private createRenderContext(params: GameParams): RenderContext {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not initialized');
    }
    
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      centerX: this.canvas.width / 2,
      centerY: this.canvas.height / 2,
      hexSize: this.hexSize,
      params,
    };
  }
  
  private initializeLayers(): void {
    this.layers.set(RenderLayer.BACKGROUND, new BackgroundLayer());
    this.layers.set(RenderLayer.GRID, new GridLayer());
    this.layers.set(RenderLayer.ENTITY, new EntityLayer());
    this.layers.set(RenderLayer.CURSOR, new CursorLayer());
    this.layers.set(RenderLayer.EFFECT, new EffectLayer());
    this.layers.set(RenderLayer.HUD, new HudLayer());
  }
}
```

### IRenderLayer

Interface for drawable layers.

```typescript
interface IRenderLayer {
  /**
   * Render this layer.
   */
  render(context: RenderContext, state: GameState): void;
  
  /**
   * Check if layer should be visible.
   */
  isVisible(state: GameState): boolean;
}
```

## Concrete Render Layers

### BackgroundLayer

Renders background and grid outlines.

```typescript
class BackgroundLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    const { ctx, width, height, centerX, centerY, hexSize } = context;
    const grid = state.activeField === 'world' ? state.grid : state.inventoryGrid;
    
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Grid hexes (outlines only)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    for (const cell of grid.values()) {
      const corners = HexGeometry.corners(cell, hexSize);
      this.drawHexOutline(ctx, corners, centerX, centerY);
    }
  }
  
  isVisible(state: GameState): boolean {
    return true;
  }
  
  private drawHexOutline(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    offsetX: number,
    offsetY: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const { x, y } = corners[i];
      if (i === 0) {
        ctx.moveTo(x + offsetX, y + offsetY);
      } else {
        ctx.lineTo(x + offsetX, y + offsetY);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
}
```

### GridLayer

Renders colored hexes.

```typescript
class GridLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    const { ctx, centerX, centerY, hexSize, params } = context;
    const grid = state.activeField === 'world' ? state.grid : state.inventoryGrid;
    
    for (const cell of grid.values()) {
      if (cell.colorIndex === null) continue;
      
      // Skip if this cell is being carried
      if (state.capturedCell && 
          AxialMath.equals(cell, state.capturedCell)) {
        continue;
      }
      
      const color = params.ColorPalette[cell.colorIndex];
      const corners = HexGeometry.corners(cell, hexSize);
      
      this.drawFilledHex(ctx, corners, color, centerX, centerY);
    }
  }
  
  isVisible(state: GameState): boolean {
    return true;
  }
  
  private drawFilledHex(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    color: string,
    offsetX: number,
    offsetY: number
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const { x, y } = corners[i];
      if (i === 0) {
        ctx.moveTo(x + offsetX, y + offsetY);
      } else {
        ctx.lineTo(x + offsetX, y + offsetY);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
}
```

### EntityLayer

Renders protagonist and carried hex.

```typescript
class EntityLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    const { ctx, centerX, centerY, hexSize, params } = context;
    
    // Render carried hex with outline
    if (state.capturedCell) {
      const cell = GridOperations.getCell(
        state.grid,
        state.capturedCell
      );
      if (cell && cell.colorIndex !== null) {
        const color = params.ColorPalette[cell.colorIndex];
        const corners = HexGeometry.corners(state.capturedCell, hexSize);
        
        // Check flicker state
        const isVisible = !GameRules.isFlickerVisible(state.tick, params) 
          || state.activeField === 'inventory';
        
        if (isVisible) {
          this.drawCarriedHex(ctx, corners, color, centerX, centerY);
        }
      }
    }
    
    // Render protagonist (turtle/flower)
    this.drawProtagonist(context, state);
  }
  
  isVisible(state: GameState): boolean {
    return true;
  }
  
  private drawCarriedHex(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    color: string,
    offsetX: number,
    offsetY: number
  ): void {
    // Draw filled hex
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const { x, y } = corners[i];
      if (i === 0) {
        ctx.moveTo(x + offsetX, y + offsetY);
      } else {
        ctx.lineTo(x + offsetX, y + offsetY);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    // Draw white outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  private drawProtagonist(
    context: RenderContext,
    state: GameState
  ): void {
    // Implementation: draw turtle/flower at protagonist position
    // facing direction determines rotation
    // Details depend on art style
  }
}
```

### CursorLayer

Renders cursor and charge indicator.

```typescript
class CursorLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    const { ctx, centerX, centerY, hexSize, params } = context;
    
    // Get cursor corners
    const corners = HexGeometry.corners(state.cursor, hexSize);
    
    // Determine cursor style based on mode
    if (state.captureChargeStartTick !== null) {
      this.drawChargingCursor(ctx, corners, state, params, centerX, centerY);
    } else if (state.captureCooldownTicksRemaining > 0) {
      this.drawCooldownCursor(ctx, corners, state, params, centerX, centerY);
    } else if (state.isActionMode) {
      this.drawActionCursor(ctx, corners, state, centerX, centerY);
    } else {
      this.drawDefaultCursor(ctx, corners, state, centerX, centerY);
    }
  }
  
  isVisible(state: GameState): boolean {
    return true;
  }
  
  private drawDefaultCursor(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    state: GameState,
    offsetX: number,
    offsetY: number
  ): void {
    // Draw single rotating edge (opposite to facing direction)
    const edgeIndex = (state.facingDirIndex + 3) % 6;
    const start = corners[edgeIndex];
    const end = corners[(edgeIndex + 1) % 6];
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x + offsetX, start.y + offsetY);
    ctx.lineTo(end.x + offsetX, end.y + offsetY);
    ctx.stroke();
  }
  
  private drawChargingCursor(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    state: GameState,
    params: GameParams,
    offsetX: number,
    offsetY: number
  ): void {
    // Draw expanding edges as charge progresses
    const chargeTicks = state.tick - state.captureChargeStartTick!;
    const chargeProgress = Math.min(
      1,
      chargeTicks / params.CaptureHoldDurationTicks
    );
    
    const edgesToDraw = Math.ceil(chargeProgress * 6);
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < edgesToDraw; i++) {
      const start = corners[i];
      const end = corners[(i + 1) % 6];
      ctx.beginPath();
      ctx.moveTo(start.x + offsetX, start.y + offsetY);
      ctx.lineTo(end.x + offsetX, end.y + offsetY);
      ctx.stroke();
    }
  }
  
  private drawCooldownCursor(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    state: GameState,
    params: GameParams,
    offsetX: number,
    offsetY: number
  ): void {
    // Draw rotating red edge
    const rotationSpeed = 1; // edges per tick
    const edgeIndex = Math.floor(state.tick * rotationSpeed) % 6;
    const start = corners[edgeIndex];
    const end = corners[(edgeIndex + 1) % 6];
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x + offsetX, start.y + offsetY);
    ctx.lineTo(end.x + offsetX, end.y + offsetY);
    ctx.stroke();
  }
  
  private drawActionCursor(
    ctx: CanvasRenderingContext2D,
    corners: Array<{ x: number; y: number }>,
    state: GameState,
    offsetX: number,
    offsetY: number
  ): void {
    // Draw rotating opposite edge pair
    const edgeIndex = (Math.floor(state.tick / 2) % 6);
    const oppositeIndex = (edgeIndex + 3) % 6;
    
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    
    // Draw first edge
    let start = corners[edgeIndex];
    let end = corners[(edgeIndex + 1) % 6];
    ctx.beginPath();
    ctx.moveTo(start.x + offsetX, start.y + offsetY);
    ctx.lineTo(end.x + offsetX, end.y + offsetY);
    ctx.stroke();
    
    // Draw opposite edge
    start = corners[oppositeIndex];
    end = corners[(oppositeIndex + 1) % 6];
    ctx.beginPath();
    ctx.moveTo(start.x + offsetX, start.y + offsetY);
    ctx.lineTo(end.x + offsetX, end.y + offsetY);
    ctx.stroke();
  }
}
```

### EffectLayer

Renders visual effects (flash, particles).

```typescript
class EffectLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    if (!state.flash) return;
    
    const { ctx, centerX, centerY, hexSize } = context;
    const corners = HexGeometry.corners(state.cursor, hexSize);
    
    // Draw flash effect
    const color = state.flash.type === 'success' ? '#00ff00' : '#ff0000';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const { x, y } = corners[i];
      if (i === 0) {
        ctx.moveTo(x + centerX, y + centerY);
      } else {
        ctx.lineTo(x + centerX, y + centerY);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  isVisible(state: GameState): boolean {
    return state.flash !== null;
  }
}
```

### HudLayer

Renders UI elements (palette, timer, stats).

```typescript
class HudLayer implements IRenderLayer {
  render(context: RenderContext, state: GameState): void {
    const { ctx, width, params } = context;
    
    // Render timer
    this.drawTimer(ctx, state.remainingSeconds, 10, 10);
    
    // Render palette cluster
    this.drawPalette(ctx, params, state, width - 200, 10);
    
    // Render capture chance (if applicable)
    const chance = previewCaptureChanceAtCursor(state, params);
    if (chance !== null) {
      this.drawCaptureChance(ctx, chance, width / 2, 30);
    }
  }
  
  isVisible(state: GameState): boolean {
    return true;
  }
  
  private drawTimer(
    ctx: CanvasRenderingContext2D,
    seconds: number,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    ctx.fillText(
      `${minutes}:${secs.toString().padStart(2, '0')}`,
      x,
      y
    );
  }
  
  private drawPalette(
    ctx: CanvasRenderingContext2D,
    params: GameParams,
    state: GameState,
    x: number,
    y: number
  ): void {
    // Draw palette hexes in cluster
    // Implementation details depend on design
  }
  
  private drawCaptureChance(
    ctx: CanvasRenderingContext2D,
    chance: number,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${chance}%`, x, y);
  }
}
```

## Testing Requirements

### Unit Tests

1. **Renderer Tests**:
   - Initialize sets up canvas context
   - Render calls all visible layers
   - Clear empties canvas
   - Resize updates dimensions

2. **Layer Tests**:
   - Each layer renders without errors
   - isVisible returns correct value
   - Layers don't interfere with each other

3. **Geometry Tests**:
   - Hex corners calculated correctly
   - Pixel to axial conversion accurate
   - Bounding box correct

### Integration Tests

1. Full render pipeline: state → layers → canvas
2. Partial update: single layer re-render
3. Animation: multiple frames render correctly
4. Resize: canvas adapts to new dimensions

### Visual Regression Tests

1. Screenshot comparison for known states
2. Animation frame sequences
3. Different screen sizes
4. Different hex sizes

## Performance Considerations

- Minimize canvas clears (layer-based)
- Batch draw calls where possible
- Cache corner calculations
- Use requestAnimationFrame for smooth rendering
- Avoid text rendering in hot loops

## Dependencies

### Required Modules
- Domain/Grid System (for hex geometry)
- Domain/Game Logic (for state interpretation)

### Exports
- `IRenderer` interface
- `CanvasRenderer` class
- `RenderLayer` enum
- All layer classes

## Future Extensions

1. **WebGL Renderer**: High-performance 3D rendering
2. **SVG Renderer**: Vector graphics export
3. **Particle System**: Rich visual effects
4. **Shaders**: Custom visual filters
5. **Sprite Atlas**: Texture-based rendering
6. **Camera System**: Pan, zoom, shake
