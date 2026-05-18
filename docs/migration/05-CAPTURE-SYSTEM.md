# Capture System

## Capture Flow Overview

1. **Initiate Action Mode** (hold Space/ACT)
2. **Turtle Approaches Cursor** (if not adjacent)
3. **Reach Adjacency Over Colored Hex** → auto-start charge
4. **Hold for Charge Duration** (6 ticks in world, 1 tick in inventory)
5. **Auto-Attempt Capture** (probabilistic roll)
6. **Success or Failure Outcome**

## Action Mode Requirements

Cannot enter action mode if:
- Already in cooldown (captureCooldownTicksRemaining > 0)

```javascript
// On Space down / ACT touch start
setGameState(prev => {
  if (prev.captureCooldownTicksRemaining > 0) {
    return prev  // blocked
  }
  return { ...prev, isActionMode: true }
})
```

## Charge Initiation

### Automatic Start (Action Mode)
When protagonist reaches adjacency to cursor and cursor is over colored hex:

```javascript
// In tick(), when adjacent during action mode
const cursorCell = getCell(next.grid, next.cursor)
if (!next.capturedCell && cursorCell && cursorCell.colorIndex !== null && next.captureCooldownTicksRemaining <= 0) {
  next = { ...next, captureChargeStartTick: next.tick }
}
```

### Manual Start (Legacy, Not Used in Current Build)
Old mechanic allowed Space press to start charge directly:

```javascript
function beginCaptureCharge(state) {
  if (state.capturedCell !== null) return state  // already carrying
  if (state.captureCooldownTicksRemaining > 0) return state  // cooldown
  if (state.captureChargeStartTick !== null) return state  // already charging
  
  // In world mode, only start if cursor on colored hex
  if (state.activeField === 'world') {
    const cursorCell = hoveredCell(state)
    if (!cursorCell || cursorCell.colorIndex === null) {
      return state
    }
  }
  
  return { ...state, captureChargeStartTick: state.tick }
}
```

**Current behavior**: Charge always starts automatically when protagonist adjacent during action mode.

## Charge Duration

| Mode | Duration | Notes |
|------|----------|-------|
| World | 6 ticks | ~0.5 seconds at 12 ticks/sec |
| Inventory | 1 tick | Instant (auto-completes next tick) |

```javascript
const chargeDuration = state.activeField === 'inventory' ? 1 : params.CaptureHoldDurationTicks
```

## Charge Cancellation

Charge is cancelled if:
- Action released before duration completes
- Cursor moves away (charge continues but may fail if protagonist not adjacent)

```javascript
// On Space up / ACT touch end
setGameState(prev => {
  if (prev.captureChargeStartTick !== null) {
    const heldTicks = prev.tick - prev.captureChargeStartTick
    if (heldTicks < params.CaptureHoldDurationTicks) {
      // Too early: cancel charge
      return { ...prev, captureChargeStartTick: null, isActionMode: false }
    }
  }
  return { ...prev, isActionMode: false }
})
```

## Auto-Completion

When charge duration reached, attempt capture automatically:

```javascript
// In tick()
if (rng && next.captureChargeStartTick !== null && (next.tick - next.captureChargeStartTick) >= chargeDuration) {
  next = endCaptureChargeOnActive(next, params, rng)
}
```

## Capture Attempt Logic

```javascript
function endCaptureCharge(state, params, rng) {
  if (state.captureChargeStartTick === null) return state
  
  const heldTicks = state.tick - state.captureChargeStartTick
  let next = { ...state, captureChargeStartTick: null }
  
  const inInventory = state.activeField === 'inventory'
  const chargeDuration = inInventory ? 1 : params.CaptureHoldDurationTicks
  
  // Check held long enough (world mode)
  if (!inInventory && heldTicks < chargeDuration) {
    return next  // too short
  }
  
  // Already carrying or in cooldown
  if (next.capturedCell !== null) return next
  if (next.captureCooldownTicksRemaining > 0) return next
  
  // In world mode: check protagonist adjacency to cursor
  if (!inInventory) {
    const { q: pq, r: pr } = next.protagonist
    const { q: cq, r: cr } = next.cursor
    const isAdjacent = axialDirections.some(d => pq + d.q === cq && pr + d.r === cr)
    
    if (!isAdjacent) {
      // FAIL: protagonist didn't reach cursor
      next = {
        ...next,
        captureCooldownTicksRemaining: params.CaptureFailureCooldownTicks,
        flash: { type: "failure", startedTick: next.tick },
      }
      return next
    }
  }
  
  // Get target cell
  const cell = inInventory ? hoveredCellInventory(next) : hoveredCell(next)
  if (!cell) return next
  
  // Empty cell: turtle just walks there (no capture)
  if (cell.colorIndex === null) {
    return next
  }
  
  // Probabilistic capture
  const chance = inInventory ? 100 : computeCaptureChancePercent(params, cell.colorIndex)
  const roll = inInventory ? 0 : rng() * 100
  
  if (roll < chance) {
    // SUCCESS
    next = {
      ...next,
      capturedCell: { q: cell.q, r: cell.r },
      flash: { type: "success", startedTick: next.tick },
    }
    
    // Ensure protagonist not in same cell as captured
    if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
      // Move protagonist to adjacent cell
      // (same logic as in invariant enforcement)
    }
  } else {
    // FAILURE
    next = {
      ...next,
      captureCooldownTicksRemaining: params.CaptureFailureCooldownTicks,
      flash: { type: "failure", startedTick: next.tick },
    }
  }
  
  return next
}
```

## Capture Probability Formula

### Palette Distance Calculation
```javascript
function paletteDistance(colorIndex, playerBaseIndex, paletteLength) {
  if (paletteLength <= 0) return 0
  
  // Circular distance
  const delta = ((colorIndex - playerBaseIndex) % paletteLength + paletteLength) % paletteLength
  return Math.min(delta, paletteLength - delta)
}
```

### Chance Computation
```javascript
function computeCaptureChancePercent(params, colorIndex) {
  const paletteLen = params.ColorPalette.length
  if (paletteLen <= 0) return 0
  
  const dist = paletteDistance(colorIndex, params.PlayerBaseColorIndex, paletteLen)
  const maxDist = Math.floor(paletteLen / 2)  // 4 for 8 colors
  
  if (maxDist === 0) {
    return params.ChanceBasePercent
  }
  
  if (dist === maxDist) {
    return 0
  }
  
  if (dist === 0) {
    return params.ChanceBasePercent  // 100
  }
  
  // Linear interpolation with minimum clamp
  const raw = ((maxDist - dist) / maxDist) * params.ChanceBasePercent
  const mapped = Math.max(10, Math.round(raw))
  return Math.max(0, Math.min(100, mapped))
}
```

### Example Probabilities (8-Color Palette)

| Color Index | Color | Distance | Chance |
|-------------|-------|----------|--------|
| 0 | #FF8000 (player) | 0 | 100% |
| 1 | #CC6600 | 1 | 75% |
| 2 | #996600 | 2 | 50% |
| 3 | #666600 | 3 | 25% |
| 4 | #660099 (antagonist) | 4 | 10% (clamped) |
| 5 | #9933FF | 3 | 25% |
| 6 | #CC66FF | 2 | 50% |
| 7 | #FF99FF | 1 | 75% |

**Formula**:
```
maxDist = 4
dist = min(abs(colorIndex - 0), 8 - abs(colorIndex - 0))
chance = max(10%, (4 - dist) / 4 * 100%)
```

## Capture Success Outcome

### State Changes
```javascript
capturedCell = { q: cell.q, r: cell.r }
flash = { type: 'success', startedTick: currentTick }
```

### Visual Feedback
- Captured hex renders with white outline (permanent while carrying)
- Success flash shown for 2 ticks (currently not as overlay, just outline)
- Cursor edges continue rotating

### Constraints
- Protagonist must stay adjacent to captured hex
- If overlap detected: protagonist moved to adjacent cell
- Captured hex stays on grid (not removed)

## Capture Failure Outcome

### State Changes
```javascript
captureCooldownTicksRemaining = params.CaptureFailureCooldownTicks  // 12
flash = { type: 'failure', startedTick: currentTick }
```

### Visual Feedback
- Failure flash shown for 2 ticks (red edges)
- Cursor shows single rotating red edge during cooldown
- Cannot start new action mode until cooldown expires

### Cooldown Duration
- Default: 12 ticks (1 second)
- Blocks action mode activation
- Shown via red rotating cursor edge

## Chance Preview

Display capture chance before attempting:

```javascript
function previewCaptureChanceAtCursor(state, params) {
  if (state.capturedCell !== null) return null  // carrying
  if (state.captureCooldownTicksRemaining > 0) return null  // cooldown
  
  const cell = hoveredCell(state)
  if (!cell || cell.colorIndex === null) return null  // no hex
  
  return computeCaptureChancePercent(params, cell.colorIndex)
}
```

Displayed in palette cluster center as "X%" text.

## Inventory Mode Differences

| Aspect | World Mode | Inventory Mode |
|--------|-----------|----------------|
| Charge Duration | 6 ticks | 1 tick (instant) |
| Success Probability | Distance-based | 100% always |
| Protagonist Movement | Required (must be adjacent) | N/A (no protagonist) |
| Empty Cell Capture | Turtle walks there | Works normally |
| Failure Possible | Yes (probability + adjacency) | No |
| Cooldown on Failure | 12 ticks | N/A |

## Capture Parameters

From `DefaultParams`:

```javascript
CaptureHoldDurationTicks: 6       // 0.5 seconds
CaptureFailureCooldownTicks: 12   // 1.0 seconds
CaptureFlashDurationTicks: 2      // ~0.167 seconds
ChanceBasePercent: 100            // 100% at distance 0
ChancePenaltyPerPaletteDistance: 20  // (not used in current formula)
```

## Random Number Generation

Uses simple Math.random() or optional seeded RNG:

```javascript
// Seeded RNG (Mulberry32)
function mulberry32(seed) {
  let t = seed >>> 0
  return function() {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(seed)
const roll = rng() * 100  // [0, 100)
```

Current implementation: seed = Date.now() (not reproducible).

## Capture Edge Cases

### Multiple Concurrent Charges
- Only one charge active at a time
- `captureChargeStartTick` is single value (not array)

### Cursor Moves During Charge
- Charge continues on original target cell
- If protagonist doesn't reach adjacency: failure

### Already Carrying
- Cannot start new charge
- Space press while carrying triggers drop instead

### Cooldown Expiry
- Naturally expires after N ticks
- No manual clear (automatic in tick update)
- Can stack with drop cooldown (takes max value)

### Flash Duration
- Always 2 ticks
- Cleared automatically in tick update
- Does not block actions (purely visual)
