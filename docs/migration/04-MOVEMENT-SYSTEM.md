# Movement System

## Cursor Movement

### Input Mapping
Keyboard and joystick input map to six axial directions:

```javascript
const directionMap = {
  // Keyboard
  'ArrowUp': [0, -1],      // Up
  'w': [0, -1],
  'ArrowDown': [0, 1],     // Down
  's': [0, 1],
  'ArrowLeft': [-1, 0],    // Up-left
  'a': [-1, 0],
  'ArrowRight': [1, 0],    // Down-right
  'd': [1, 0],
}

// Note: Keyboard only provides 4 of 6 hex directions
// Full 6-direction control on mobile via joystick
```

### Joystick to Axial Mapping
Mobile joystick vector converted to nearest hex direction:

```javascript
function joystickToAxial(vx, vy) {
  const len = Math.hypot(vx, vy)
  if (len < 6) return null  // dead zone
  
  const angle = Math.atan2(vy, vx)
  const deg = (angle * 180 / Math.PI + 360) % 360
  
  // Map screen angles to axial directions
  // (accounts for pointy-top hex orientation)
  if (deg >= 330 || deg < 30) return [1, 0]      // right → down-right
  else if (deg >= 30 && deg < 90) return [0, 1]   // down-right → down
  else if (deg >= 90 && deg < 150) return [-1, 1] // down-left → down-left
  else if (deg >= 150 && deg < 210) return [-1, 0]// left → up-left
  else if (deg >= 210 && deg < 270) return [0, -1]// up-left → up
  else return [1, -1]                             // up-right → up-right
}
```

### Cursor Movement Function
```javascript
function attemptMoveByDeltaOnActive(state, params, dq, dr) {
  // Throttle when carrying in world mode
  if (state.activeField === 'world' && state.capturedCell) {
    const movePeriod = 4  // 1 cell per 4 ticks
    const lastMove = state.lastCarryMoveTick ?? 0
    if (state.tick - lastMove < movePeriod) {
      return state  // too soon
    }
  }
  
  const target = { q: state.cursor.q + dq, r: state.cursor.r + dr }
  
  // Enforce adjacency (must be one of six directions)
  const matchedIndex = axialDirections.findIndex(
    d => state.cursor.q + d.q === target.q && state.cursor.r + d.r === target.r
  )
  if (matchedIndex === -1) return state
  
  const nextState = { ...state, facingDirIndex: matchedIndex }
  return attemptMoveToOnActive(nextState, params, target)
}

function attemptMoveToOnActive(state, params, target) {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state
  
  const grid = state.activeField === 'inventory' ? state.inventoryGrid : state.grid
  const targetCell = getCell(grid, target)
  if (!targetCell) return state
  
  // Cursor always moves (carried hex moved separately by turtle)
  return { ...state, cursor: { ...target } }
}
```

### Click/Tap Cursor Movement
```javascript
function attemptMoveTo(state, params, target) {
  if (!axialInDisk(params.GridRadius, target.q, target.r)) return state
  const targetCell = getCell(state.grid, target)
  if (!targetCell) return state
  return { ...state, cursor: { ...target } }
}
```

**Note**: Click/tap moves cursor directly (no adjacency requirement).

## Protagonist Movement

### Free Mode (Default)
Protagonist stays stationary. Previously had follower behavior, now only moves during action mode.

### Action Mode Movement
When isActionMode = true and not in release phase:

```javascript
// In tick() function
if (next.isActionMode && next.activeField === 'world' && !next.isReleasing && next.captureChargeStartTick === null) {
  const { q: pq, r: pr } = next.protagonist
  const { q: cq, r: cr } = next.cursor
  
  // Check if already adjacent
  const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr)
  
  if (!isAdjacent) {
    const movePeriod = 2  // 1 cell per 2 ticks
    if (next.tick % movePeriod === 0) {
      // Find best direction toward cursor
      let bestDir = null
      let bestDist = Infinity
      
      for (const dir of axialDirections) {
        const nq = pq + dir.q
        const nr = pr + dir.r
        
        // Do not step into cursor cell
        if (nq === cq && nr === cr) continue
        
        // Do not step into captured hex cell
        if (next.capturedCell && nq === next.capturedCell.q && nr === next.capturedCell.r) continue
        
        // Distance to cursor (axial metric)
        const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr)
        
        if (dist < bestDist) {
          bestDist = dist
          bestDir = dir
        }
      }
      
      if (bestDir) {
        const facingIndex = axialDirections.findIndex(d => d.q === bestDir.q && d.r === bestDir.r)
        next = {
          ...next,
          protagonist: { q: pq + bestDir.q, r: pr + bestDir.r },
          facingDirIndex: facingIndex >= 0 ? facingIndex : next.facingDirIndex
        }
      }
    }
  } else {
    // Adjacent: trigger capture or release
    const cursorCell = getCell(next.grid, next.cursor)
    
    if (next.capturedCell && cursorCell && cursorCell.colorIndex === null) {
      // Carrying + cursor on empty → start release
      // Move carried hex to cursor, start release mode
      const carriedCell = getCell(next.grid, next.capturedCell)
      if (carriedCell && carriedCell.colorIndex !== null) {
        const movedColor = carriedCell.colorIndex
        const updated = updateCells(next.grid, [
          { ...carriedCell, colorIndex: null },
          { ...cursorCell, colorIndex: movedColor },
        ])
        next = { ...next, grid: updated, capturedCell: { ...next.cursor }, isReleasing: true }
      }
    } else if (!next.capturedCell && cursorCell && cursorCell.colorIndex !== null && next.captureCooldownTicksRemaining <= 0) {
      // Not carrying + cursor on colored hex + no cooldown → start charge
      next = { ...next, captureChargeStartTick: next.tick }
    }
  }
}
```

### Charge Movement (Legacy Continuation)
During charge, protagonist continues moving toward cursor:

```javascript
if (next.captureChargeStartTick !== null && next.activeField === 'world') {
  const { q: pq, r: pr } = next.protagonist
  const { q: cq, r: cr } = next.cursor
  const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr)
  
  if (!isAdjacent) {
    const movePeriod = 2
    const heldTicks = next.tick - next.captureChargeStartTick
    if (heldTicks % movePeriod === 0) {
      // Same greedy pathfinding as action mode
      // (find closest adjacent cell to cursor)
    }
  }
}
```

### Release Movement
When isReleasing = true and action mode still active:

```javascript
if (next.isReleasing && next.isActionMode && next.activeField === 'world' && next.capturedCell) {
  const movePeriod = 4  // 1 cell per 4 ticks (slower when carrying)
  
  if (next.tick % movePeriod === 0) {
    const pq = next.protagonist.q
    const pr = next.protagonist.r
    const cq = next.cursor.q
    const cr = next.cursor.r
    
    // Find direction toward cursor (excluding carried hex cell)
    let bestDir = null
    let bestDist = Infinity
    
    for (const dir of axialDirections) {
      const nq = pq + dir.q
      const nr = pr + dir.r
      
      // Do not move into carried hex cell
      if (next.capturedCell && nq === next.capturedCell.q && nr === next.capturedCell.r) {
        continue
      }
      
      const dist = Math.abs(cq - nq) + Math.abs(cr - nr) + Math.abs(-cq - cr + nq + nr)
      if (dist < bestDist) {
        bestDist = dist
        bestDir = dir
      }
    }
    
    if (bestDir) {
      // Move turtle
      const newProtagonist = { q: pq + bestDir.q, r: pr + bestDir.r }
      next = { ...next, protagonist: newProtagonist, facingDirIndex: axialDirections.findIndex(d => d.q === bestDir.q && d.r === bestDir.r) }
      
      // Move carried hex to head cell (in front of turtle)
      const headDir = axialDirections[next.facingDirIndex]
      const headCell = { q: newProtagonist.q + headDir.q, r: newProtagonist.r + headDir.r }
      
      const currentCaptured = next.capturedCell
      const fromKey = currentCaptured ? keyOfAxial(currentCaptured) : null
      const fromCell = fromKey ? next.grid.get(fromKey) : null
      const toCell = getCell(next.grid, headCell)
      
      if (fromCell && fromCell.colorIndex !== null && toCell && (toCell.colorIndex === null || keyOfAxial(currentCaptured) === keyOfAxial(headCell))) {
        if (fromKey && keyOfAxial(headCell) !== fromKey) {
          const movedColor = fromCell.colorIndex
          const nextGrid = updateCells(next.grid, [
            { ...fromCell, colorIndex: null },
            { ...toCell, colorIndex: movedColor },
          ])
          next = { ...next, grid: nextGrid, capturedCell: headCell }
        }
      }
      
      // Check if head cell reached cursor → release complete
      if (headCell.q === cq && headCell.r === cr) {
        next = { ...next, isReleasing: false, capturedCell: null, captureCooldownTicksRemaining: Math.max(next.captureCooldownTicksRemaining, 6) }
      }
    }
  }
}
```

## Movement Speeds

| Mode | Speed | Notes |
|------|-------|-------|
| Cursor (free) | Instant | Direct input, no throttle |
| Cursor (carrying) | 1 cell per 4 ticks | Throttled in world mode |
| Cursor (joystick) | 1 cell per 6 ticks | Throttle to avoid jitter |
| Protagonist (action mode) | 1 cell per 2 ticks | Approaching cursor |
| Protagonist (charge) | 1 cell per 2 ticks | Same as action mode |
| Protagonist (release) | 1 cell per 4 ticks | Slower when carrying |

## Facing Direction

Protagonist tracks facing direction (0-5 index):

```javascript
// Updated during movement
const dirIndex = axialDirections.findIndex(d => d.q === moveDir.q && d.r === moveDir.r)
if (dirIndex >= 0) {
  next = { ...next, facingDirIndex: dirIndex }
}

// Used for:
// - Turtle head rendering (points in facing direction)
// - Head cell calculation during release (protagonist.q + dir.q, protagonist.r + dir.r)
```

## Movement Blocking

### Cursor
- Blocked outside grid bounds
- Otherwise moves freely (can overlap colored or empty cells)

### Protagonist
- Blocked by grid bounds
- Cannot enter cursor cell
- Cannot enter carried hex cell
- Otherwise moves to minimize distance to cursor

### Carried Hex (During Release)
- Moves as "head cell" (in front of turtle)
- Can only move into empty cells (or its current position)
- Blocked by colored cells
- If blocked: turtle stops moving (cannot push through)

## Pathfinding Algorithm

Simple greedy distance minimization:

1. For each of 6 adjacent cells from current position:
   - Check if blocked (cursor, carried hex, out of bounds)
   - Calculate axial distance to target
2. Choose direction with minimum distance
3. If tie: uses first found (deterministic due to direction order)
4. If all blocked: don't move

**Note**: Not optimal pathfinding (can get stuck), but works for circular grid with few obstacles.

## Inventory Mode Movement

In inventory mode:
- Cursor movement works on inventoryGrid (not world grid)
- Protagonist does not move (stays in world, not rendered)
- No action mode movement
- Capture still works (instant, 100% chance)
- No release mechanism (just capture and drop)

## Movement Edge Cases

### Protagonist-Captured Overlap Prevention
Invariant enforced at end of tick:

```javascript
if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
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

### Action Release Abort
When action ends (Space/ACT released) during release:

```javascript
if (prev.isReleasing) {
  return { ...prev, isActionMode: false, isReleasing: false }
}
```

Turtle stops moving immediately, hex stays at current position.

### Grid Boundary
Movement toward boundary:
- Cursor: blocked at edge (doesn't wrap)
- Protagonist: pathfinding excludes out-of-bounds cells
- No special behavior (just stops at edge)
