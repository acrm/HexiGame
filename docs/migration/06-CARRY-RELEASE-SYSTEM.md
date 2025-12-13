# Carry and Release System

## Carrying State

When a hex is successfully captured:
- `capturedCell` is set to the hex's axial coordinates
- The hex remains on the grid at that position
- A white outline is rendered around the hex
- Turtle must maintain adjacency to the carried hex

### Carrying Constraints

1. **Protagonist-Captured Adjacency**
   - Turtle must always be adjacent to carried hex
   - Enforced by invariant check at end of each tick
   - If overlap detected: turtle moves to adjacent cell

2. **Grid Presence**
   - Carried hex stays on grid (colorIndex preserved)
   - Position changes only during release movement
   - Not removed from grid until eaten or dropped

3. **Single Carry**
   - Can only carry one hex at a time
   - Cannot capture while carrying
   - Must drop or eat before capturing another

## Drop Mechanic (Legacy, Not Used)

Simple drop: clears carrying state without moving the hex.

```javascript
function dropCarried(state) {
  if (state.capturedCell === null) return state
  return {
    ...state,
    capturedCell: null,
    captureCooldownTicksRemaining: Math.max(state.captureCooldownTicksRemaining, 6)
  }
}
```

**Current behavior**: Drop is replaced by release mechanism (turtle carries hex to cursor).

## Release Mechanism

### Release Initiation

Triggered when all conditions met during action mode:
- Protagonist is carrying a hex (`capturedCell !== null`)
- Protagonist is adjacent to cursor
- Cursor is over an empty cell

```javascript
// In tick(), when action mode and adjacent
const cursorCell = getCell(next.grid, next.cursor)
if (next.capturedCell && cursorCell && cursorCell.colorIndex === null) {
  const carriedCell = getCell(next.grid, next.capturedCell)
  if (carriedCell && carriedCell.colorIndex !== null) {
    // Move hex to cursor cell immediately
    const movedColor = carriedCell.colorIndex
    const updated = updateCells(next.grid, [
      { ...carriedCell, colorIndex: null },
      { ...cursorCell, colorIndex: movedColor },
    ])
    next = { ...next, grid: updated, capturedCell: { ...next.cursor }, isReleasing: true }
  }
}
```

**Note**: Initial move places hex at cursor, then release movement begins.

### Release Movement

While `isReleasing = true` and `isActionMode = true`:

```javascript
if (next.isReleasing && next.isActionMode && next.activeField === 'world' && next.capturedCell) {
  const movePeriod = 4  // 1 cell per 4 ticks
  
  if (next.tick % movePeriod === 0) {
    // Find best direction for turtle toward cursor
    let bestDir = findBestDirection(next.protagonist, next.cursor, next.capturedCell)
    
    if (bestDir) {
      // Move turtle one step
      const newProtagonist = { q: pq + bestDir.q, r: pr + bestDir.r }
      next = { ...next, protagonist: newProtagonist, facingDirIndex: dirIndex }
      
      // Calculate head cell (in front of turtle's head)
      const headDir = axialDirections[next.facingDirIndex]
      const headCell = { q: newProtagonist.q + headDir.q, r: newProtagonist.r + headDir.r }
      
      // Move carried hex to head cell
      const fromCell = getCell(next.grid, next.capturedCell)
      const toCell = getCell(next.grid, headCell)
      
      if (fromCell && fromCell.colorIndex !== null && toCell && toCell.colorIndex === null) {
        const movedColor = fromCell.colorIndex
        const nextGrid = updateCells(next.grid, [
          { ...fromCell, colorIndex: null },
          { ...toCell, colorIndex: movedColor },
        ])
        next = { ...next, grid: nextGrid, capturedCell: headCell }
      }
      
      // Check completion: head cell reached cursor
      if (headCell.q === cursor.q && headCell.r === cursor.r) {
        next = {
          ...next,
          isReleasing: false,
          capturedCell: null,
          captureCooldownTicksRemaining: Math.max(next.captureCooldownTicksRemaining, 6)
        }
      }
    }
  }
}
```

### Head Cell Calculation

The "head cell" is the position directly in front of the turtle's head:

```javascript
const headDir = axialDirections[protagonist.facingDirIndex]
const headCell = {
  q: protagonist.q + headDir.q,
  r: protagonist.r + headDir.r
}
```

During release, the carried hex occupies this head cell and moves with the turtle.

### Movement Rules

**Turtle**:
- Moves toward cursor at 1 cell per 4 ticks
- Cannot step into the cell containing the carried hex
- Uses greedy pathfinding (minimize distance to cursor)
- Stops if no valid move available

**Carried Hex**:
- Moves to head cell position each turtle step
- Can only move into empty cells
- If blocked (colored cell in head position): turtle cannot advance
- Maintains white outline during movement

### Release Completion

Release ends when head cell reaches cursor position:

```javascript
if (headCell.q === cursor.q && headCell.r === cursor.r) {
  // Drop hex at cursor
  // Clear carrying state
  // Start cooldown
  next = {
    ...next,
    isReleasing: false,
    capturedCell: null,
    captureCooldownTicksRemaining: 6
  }
}
```

**Result**: Hex is dropped at cursor, 6-tick cooldown begins.

### Release Abort

If action mode ends (Space/ACT released) during release:

```javascript
// On action mode end
if (prev.isReleasing) {
  return {
    ...prev,
    isActionMode: false,
    isReleasing: false
  }
}
```

**Result**: Turtle stops moving immediately, hex stays at current position (still carried).

## Eat Mechanic

Alternative to release: consume the carried hex.

### Activation
- E key (desktop) or EAT button (mobile)
- Only available in world mode while carrying
- Not available in inventory mode

### Effect

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
  
  // Remove from world grid
  const worldGrid = updateCells(state.grid, [{ ...cell, colorIndex: null }])
  
  // Add to random empty inventory cell
  const empties = Array.from(state.inventoryGrid.values()).filter(c => c.colorIndex === null)
  
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
  
  // No inventory space: just increment counter
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

### Outcomes

1. **Inventory Space Available**
   - Hex removed from world grid
   - Added to random empty inventory cell
   - Eaten counter incremented
   - Carrying state cleared
   - No cooldown applied

2. **Inventory Full**
   - Hex removed from world grid
   - Eaten counter still incremented
   - Hex "lost" (not placed in inventory)

## Turtle-Hex Spatial Relationship

### During Capture
After successful capture:
- Turtle is adjacent to captured hex
- Turtle facing direction points toward cursor

### During Carry (Before Release)
- Turtle stationary (or moving with cursor in old follower mode)
- Hex stationary at original capture position
- White outline rendered on hex

### During Release
- Turtle advances toward cursor
- Hex moves as "head cell" in front of turtle
- Turtle rotates around hex, maintaining adjacency
- Head always faces cursor direction

### Invariant Enforcement

At end of each tick:

```javascript
if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
  // Protagonist occupies same cell as captured hex (invalid)
  // Move protagonist to adjacent cell
  for (const dir of axialDirections) {
    const candidate = { q: next.capturedCell.q + dir.q, r: next.capturedCell.r + dir.r }
    if (!axialInDisk(params.GridRadius, candidate.q, candidate.r)) continue
    if (!getCell(next.grid, candidate)) continue
    next = { ...next, protagonist: candidate }
    break
  }
}
```

## Release Pathfinding

Turtle avoids stepping into carried hex cell:

```javascript
function findBestDirection(from, to, avoid) {
  let bestDir = null
  let bestDist = Infinity
  
  for (const dir of axialDirections) {
    const next = { q: from.q + dir.q, r: from.r + dir.r }
    
    // Skip if stepping into carried hex
    if (avoid && next.q === avoid.q && next.r === avoid.r) continue
    
    // Skip if out of bounds
    if (!axialInDisk(radius, next.q, next.r)) continue
    
    const dist = axialDistance(next, to)
    if (dist < bestDist) {
      bestDist = dist
      bestDir = dir
    }
  }
  
  return bestDir
}
```

## Carrying Speed

| Action | Speed |
|--------|-------|
| Cursor movement (carrying) | 1 cell per 4 ticks (throttled) |
| Release movement | 1 cell per 4 ticks |
| Normal movement | 1 cell per 2 ticks |

Carrying is slower than normal action mode movement.

## Visual Indicators

### Carried Hex
- White outline (strokeWidth = 2 * scale)
- Color preserved (not grayed out)
- Rendered on grid at current position

### Turtle During Release
- Head faces cursor direction
- Shell rotates with facing
- Eyes on head hex point perpendicular to facing direction
- Moves smoothly at 4-tick intervals

### Cursor During Release
- Single rotating white edge (same as normal mode)
- No special release indicator

## Edge Cases

### Carrying Across Inventory Toggle
- If carrying in world, then toggle to inventory: carrying state preserved
- Hex remains in world grid
- Cannot release in inventory mode
- Can toggle back to world with hex still carried

### Carrying at Grid Boundary
- Release toward edge: turtle pathfinding stays in bounds
- If cursor at edge: turtle stops when head cell reaches cursor
- No wrapping or special boundary behavior

### Blocked Release Path
- If all directions blocked: turtle doesn't move
- Carried hex stays in place
- Player must change cursor position to find open path

### Multi-Step Release
- Can take many ticks to reach cursor (depends on distance)
- Action mode must stay active entire time
- Releasing action stops movement immediately
- Can resume by re-entering action mode

### Post-Release Cooldown
- 6 ticks (0.5 seconds)
- Prevents immediate re-capture
- Same mechanism as drop cooldown
- Stacks with existing cooldown (takes max value)
