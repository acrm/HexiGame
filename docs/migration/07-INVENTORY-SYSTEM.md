# Inventory System

## Overview

The inventory is a separate hexagonal grid with the same dimensions as the world grid, used to store collected hexes.

## Grid Structure

```javascript
// Inventory grid: same shape as world, all cells empty initially
const inventoryGrid = new Map()
const radius = params.GridRadius  // 5

for (let q = -radius; q <= radius; q++) {
  for (let r = -radius; r <= radius; r++) {
    if (!axialInDisk(radius, q, r)) continue
    inventoryGrid.set(keyOf(q, r), { q, r, colorIndex: null })
  }
}
```

**Properties**:
- Same radius as world grid (default: 5)
- 91 cells total (matching world)
- All cells start empty (colorIndex: null)
- Stored in `GameState.inventoryGrid`

## Toggling Between World and Inventory

### Activation
- **Desktop**: Tab key
- **Mobile**: INV/WRL button tap

### Toggle Logic

```javascript
// On Tab press or INV/WRL tap
setGameState(prev => ({
  ...prev,
  activeField: prev.activeField === 'world' ? 'inventory' : 'world'
}))
setIsInventory(v => !v)  // React state for UI
```

### Active Field Behavior

When `activeField === 'inventory'`:
- Cursor movement operates on inventory grid
- Capture works on inventory cells (instant, 100% success)
- Cannot eat (EAT button hidden)
- Turtle not rendered (stays in world position)
- Release mechanism not available
- Background tinted with player base color

When `activeField === 'world'`:
- Normal game mechanics apply
- Inventory remains unchanged in background

## Adding Hexes to Inventory

Hexes enter inventory via the **Eat** action.

### Eat Function

```javascript
function eatCapturedToInventory(state, params, rng) {
  if (state.capturedCell === null) return state
  
  const anchor = state.capturedCell
  const cell = state.grid.get(keyOf(anchor.q, anchor.r))
  
  if (!cell || cell.colorIndex === null) {
    return { ...state, capturedCell: null }
  }
  
  const colorIndex = cell.colorIndex
  const color = params.ColorPalette[colorIndex]
  
  // Remove from world
  const worldGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }])
  
  // Find random empty inventory cell
  const empties = []
  for (const c of state.inventoryGrid.values()) {
    if (c.colorIndex === null) empties.push(c)
  }
  
  if (empties.length > 0) {
    const idx = Math.floor(rng() * empties.length)
    const target = empties[idx]
    const nextInv = updateCells(state.inventoryGrid, [{ ...target, colorIndex }])
    
    // Increment eaten counter
    const nextCounts = { ...(state.paletteCounts || {}) }
    nextCounts[color] = (nextCounts[color] || 0) + 1
    
    return {
      ...state,
      grid: worldGrid,
      inventoryGrid: nextInv,
      capturedCell: null,
      paletteCounts: nextCounts
    }
  }
  
  // No space: just increment counter (hex lost)
  const nextCounts = { ...(state.paletteCounts || {}) }
  nextCounts[color] = (nextCounts[color] || 0) + 1
  
  return {
    ...state,
    grid: worldGrid,
    capturedCell: null,
    paletteCounts: nextCounts
  }
}
```

### Placement Algorithm

1. Collect all empty inventory cells
2. If at least one empty cell exists:
   - Choose random index: `Math.floor(rng() * empties.length)`
   - Place hex at that cell
3. If inventory full (no empty cells):
   - Hex is "lost" (removed from world but not placed)
   - Counter still incremented

**Random placement** ensures variety and prevents predictable patterns.

## Inventory Mode Mechanics

### Capture in Inventory

Different from world capture:

| Aspect | World | Inventory |
|--------|-------|-----------|
| Charge Duration | 6 ticks | 1 tick (instant) |
| Success Probability | Distance-based formula | 100% always |
| Failure Cooldown | 12 ticks | None |
| Protagonist Movement | Required (adjacency check) | None (no protagonist) |
| Flash Feedback | Success/failure | Success only |

```javascript
// In endCaptureCharge()
const inInventory = state.activeField === 'inventory'
const chargeDuration = inInventory ? 1 : params.CaptureHoldDurationTicks
const chance = inInventory ? 100 : computeCaptureChancePercent(params, cell.colorIndex)
const roll = inInventory ? 0 : rng() * 100
```

**Result**: Inventory capture always succeeds immediately (next tick).

### Movement in Inventory

Cursor movement works normally:
- Arrow keys / WASD
- Joystick (mobile)
- Click/tap to focus

No protagonist movement (turtle stays in world).

### Actions Disabled in Inventory

- **Eat**: Not available (EAT button hidden)
- **Release**: No release mechanic
- **Action Mode**: Capture works but no protagonist movement

### Actions Enabled in Inventory

- **Capture**: Instant 100% success
- **Drop**: Clear captured cell (Space while carrying)
- **Toggle**: Switch back to world (Tab or INV/WRL button)

## Palette Eaten Counters

### Counter Storage

```javascript
paletteCounts: Record<string, number>  // Color hex string → count
```

Example:
```javascript
{
  "#FF8000": 5,
  "#CC6600": 3,
  "#996600": 1,
}
```

### Increment on Eat

```javascript
const color = params.ColorPalette[colorIndex]  // e.g., "#FF8000"
const nextCounts = { ...(state.paletteCounts || {}) }
nextCounts[color] = (nextCounts[color] || 0) + 1
```

### Display

Shown inside palette cluster hexes:
- If count > 0: display number
- If count === 0: no text

```javascript
{cnt > 0 ? (
  <text x={0} y={0.08} fontSize="0.9" fill="#FFFFFF">
    {cnt}
  </text>
) : null}
```

## Visual Rendering

### Inventory Grid Rendering

Full hex grid rendered when `isInventory === true`:

```javascript
const activeGrid = isInventory ? gameState.inventoryGrid : gameState.grid

for (const cell of activeGrid.values()) {
  const pos = hexToPixel(cell.q, cell.r)
  const scaledX = centerX + pos.x * scale
  const scaledY = centerY + pos.y * scale
  
  let fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent'
  
  // Check if captured hex
  const isCapturedHere = !isInventory && !!gameState.capturedCell && cell.q === gameState.capturedCell.q && cell.r === gameState.capturedCell.r
  const strokeColor = isCapturedHere ? '#FFFFFF' : 'transparent'
  
  drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, strokeColor, strokeWidth)
}
```

### Background Tint

When in inventory mode:

```javascript
if (isInventory) {
  ctx.fillStyle = params.ColorPalette[params.PlayerBaseColorIndex]  // Player color
  ctx.globalAlpha = 0.15
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalAlpha = 1.0
}
```

Creates subtle colored background to distinguish from world.

### Grid Corner Dots

Same as world grid: dots rendered at vertices surrounded only by empty cells.

### No Protagonist Rendering

Turtle is not drawn when `isInventory === true`:

```javascript
if (!isInventory) {
  // Render turtle
}
```

### Cursor Rendering

Cursor edges rendered normally:
- Rotating edges in inventory mode
- Charge edges when capturing
- Same visual logic as world mode

## Inventory Capacity

### Current Implementation
- **Maximum**: 91 cells (same as world grid)
- **No soft limit**: Can fill entire inventory
- **Overflow behavior**: Hexes lost if inventory full when eating

### Future Considerations
- Could add inventory expansion mechanic
- Could add stacking (multiple hexes per cell)
- Could add inventory size limit < grid size
- Could add "auto-eat when full" logic

## Inventory Persistence

Currently **not implemented**:
- Inventory state lost on page refresh
- No save/load mechanism
- Seed-based reproduction would need to replay all eat actions

For future persistence:
- Serialize inventoryGrid to JSON
- Store alongside world grid
- Reconstruct Map from array

## Using Inventory Hexes

**Current implementation**: Inventory is storage only.

**No mechanics for**:
- Moving hexes from inventory back to world
- Combining/crafting in inventory
- Special inventory-only actions
- Delivery/consumption from inventory

Inventory hexes are purely collectible (score tracking).

## Inventory Mode UI Indicators

### Button Label
- World mode: Shows "INV" (toggle to inventory)
- Inventory mode: Shows "WRL" (toggle to world)

### Control Text
Desktop controls info:
```
Tab = toggle World ↔ Inventory
In Inventory: cursor & capture/move work on inventory grid
```

Mobile controls info:
```
INV/WRL = toggle World ↔ Inventory
In Inventory: cursor & capture/move work on inventory grid
```

### Visual Feedback
- Background tint (player color, 15% opacity)
- No turtle rendering
- Same cursor behavior
- EAT button hidden (mobile)

## Edge Cases

### Carrying While Toggling
- If carrying in world, can toggle to inventory
- Carried hex remains in world grid (capturedCell position)
- Cannot release in inventory mode
- Can toggle back with hex still carried

### Empty Inventory
- All cells empty (transparent)
- Grid dots show structure
- Capture adds first hex

### Full Inventory
- All 91 cells occupied
- Eat still works (hex lost, counter increments)
- No warning or blocking

### Inventory Capture While Carrying in World
- If toggle to inventory while carrying world hex:
  - capturedCell still points to world grid cell
  - Can capture inventory hex (separate capturedCell tracking would be needed)
  - **Bug potential**: Current implementation may have undefined behavior

### Mixed Grid Capture
- activeField determines which grid's cell at cursor position is checked
- Grid maps are separate (no shared cells)
- No cross-grid interaction
