# State Management

## GameState Structure

The complete game state is captured in a single TypeScript interface:

```typescript
interface GameState {
  // Timing & progression
  tick: number                      // Current logical tick (increments by 1)
  remainingSeconds: number          // Timer countdown (informational)
  
  // Spatial state
  cursor: Axial                     // Cursor position { q, r }
  protagonist: Axial                // Turtle position { q, r }
  
  // Capture & carry state
  capturedCell: Axial | null        // Position of captured hex (or null)
  captureCooldownTicksRemaining: number  // Ticks until can attempt capture
  captureChargeStartTick: number | null  // Tick when charge began (or null)
  
  // Visual feedback
  flash: FlashState | null          // Success/failure flash state
  
  // Grid data
  grid: Grid                        // World grid (Map<string, Cell>)
  inventoryGrid: Grid               // Inventory grid (Map<string, Cell>)
  
  // Mode switches
  activeField: 'world' | 'inventory'  // Which grid is active
  isReleasing: boolean              // True during release movement phase
  isActionMode: boolean             // True while Space/ACT held
  
  // Protagonist orientation
  facingDirIndex: number            // Direction index 0-5
  
  // Scoring/tracking
  paletteCounts: Record<string, number>  // Eaten count by color hex string
}
```

### FlashState Structure
```typescript
interface FlashState {
  type: 'success' | 'failure'
  startedTick: number
}
```

### Axial Structure
```typescript
type Axial = { q: number; r: number }
```

### Cell Structure
```typescript
type Cell = {
  q: number
  r: number
  colorIndex: number | null  // Index into ColorPalette array
}
```

### Grid Structure
```typescript
type Grid = Map<string, Cell>
// Keys are "q,r" strings
```

## Initial State Creation

```javascript
function createInitialState(params, rng) {
  const grid = generateGrid(params, rng)
  const inventoryGrid = createInventoryGrid(params.GridRadius)
  const start = { q: 0, r: 0 }
  
  return {
    tick: 0,
    remainingSeconds: params.TimerInitialSeconds,  // 300
    cursor: { ...start },
    protagonist: { ...start },
    capturedCell: null,
    captureCooldownTicksRemaining: 0,
    captureChargeStartTick: null,
    flash: null,
    grid,
    inventoryGrid,
    activeField: 'world',
    facingDirIndex: 0,
    paletteCounts: {},
    isReleasing: false,
    isActionMode: false,
  }
}
```

## State Update Pattern

All state updates are **immutable**:

```javascript
// Bad: mutating state
state.tick += 1  // ❌

// Good: creating new state
const newState = { ...state, tick: state.tick + 1 }  // ✅

// For nested updates:
const newState = {
  ...state,
  grid: updateCells(state.grid, [updatedCell]),
  flash: { type: 'success', startedTick: state.tick }
}
```

## Tick Update Lifecycle

Every tick (83.33ms, 12 times per second):

```javascript
function tick(state, params, rng) {
  let next = { ...state, tick: state.tick + 1 }
  
  // 1. Decrement cooldown timer
  if (next.captureCooldownTicksRemaining > 0) {
    next = { ...next, captureCooldownTicksRemaining: next.captureCooldownTicksRemaining - 1 }
  }
  
  // 2. Action mode movement (turtle approaches cursor)
  if (next.isActionMode && next.activeField === 'world' && !next.isReleasing && next.captureChargeStartTick === null) {
    // Move protagonist toward cursor at 1 cell per 2 ticks
    // Stop when adjacent
    // If adjacent and conditions met: start charge or release
    // (see detailed logic in MOVEMENT-SYSTEM.md)
  }
  
  // 3. Charge movement (legacy, during charge)
  if (next.captureChargeStartTick !== null && next.activeField === 'world') {
    // Continue moving protagonist during charge
  }
  
  // 4. Release movement
  if (next.isReleasing && next.isActionMode && next.activeField === 'world' && next.capturedCell) {
    // Move turtle + carried hex toward cursor at 1 cell per 4 ticks
    // When head cell reaches cursor: drop and end release
    // (see CARRY-RELEASE-SYSTEM.md)
  }
  
  // 5. Auto-complete capture when charge duration reached
  const chargeDuration = next.activeField === 'inventory' ? 1 : params.CaptureHoldDurationTicks
  if (rng && next.captureChargeStartTick !== null && (next.tick - next.captureChargeStartTick) >= chargeDuration) {
    next = endCaptureChargeOnActive(next, params, rng)
  }
  
  // 6. Clear flash after duration
  if (next.flash && (next.tick - next.flash.startedTick) >= params.CaptureFlashDurationTicks) {
    next = { ...next, flash: null }
  }
  
  // 7. Timer countdown (every 12 ticks = 1 second)
  if (next.tick % params.GameTickRate === 0 && next.remainingSeconds > 0) {
    next = { ...next, remainingSeconds: next.remainingSeconds - 1 }
  }
  
  // 8. Enforce protagonist/captured adjacency invariant
  if (next.capturedCell && next.protagonist.q === next.capturedCell.q && next.protagonist.r === next.capturedCell.r) {
    // Move protagonist to adjacent cell
  }
  
  return next
}
```

## State Transition Triggers

### User Input Events

**Keyboard/Touch**: `attemptMoveByDeltaOnActive(state, params, dq, dr)`
- Updates cursor position
- May update facingDirIndex
- Respects movement throttling when carrying

**Action Start** (Space down / ACT touch): `beginActionMode(state)`
- Sets isActionMode = true
- Gated by cooldown

**Action End** (Space up / ACT release): `endActionMode(state)`
- Sets isActionMode = false
- Sets isReleasing = false (abort release movement)
- If charging < required duration: cancel charge

**Eat** (E key / EAT button): `eatCapturedToInventory(state, params, rng)`
- Removes color from grid
- Places in random inventory cell
- Increments palette count
- Clears capturedCell

**Toggle Inventory** (Tab / INV-WRL button)
- Switches activeField between 'world' and 'inventory'

**Click/Tap**: `attemptMoveTo(state, params, target)`
- Sets cursor to clicked/tapped hex

### Automatic Transitions

**Capture Completion** (charge duration elapsed):
- Attempt probabilistic capture
- On success: set capturedCell, show success flash
- On failure: set cooldown, show failure flash

**Release Completion** (head cell reaches cursor):
- Drop hex at cursor
- Clear capturedCell and isReleasing
- Start cooldown (6 ticks)

**Flash Expiry** (2 ticks after flash start):
- Clear flash state

**Cooldown Expiry** (after N ticks):
- captureCooldownTicksRemaining reaches 0

## State Derivations (Computed Values)

These are calculated from state, not stored:

### Hovered Cell
```javascript
function hoveredCell(state) {
  return state.grid.get(keyOfAxial(state.cursor))
}

function hoveredCellInventory(state) {
  return state.inventoryGrid.get(keyOfAxial(state.cursor))
}

function hoveredCellActive(state) {
  return state.activeField === 'inventory' 
    ? hoveredCellInventory(state) 
    : hoveredCell(state)
}
```

### Capture Chance Preview
```javascript
function previewCaptureChanceAtCursor(state, params) {
  if (state.capturedCell !== null) return null
  if (state.captureCooldownTicksRemaining > 0) return null
  const cell = hoveredCell(state)
  if (!cell || cell.colorIndex === null) return null
  return computeCaptureChancePercent(params, cell.colorIndex)
}
```

### Carry Flicker State
```javascript
function isCarryFlickerOn(state, params) {
  if (!state.capturedCell) return false
  const cycle = params.CarryFlickerCycleTicks  // 6
  const phase = state.tick % cycle
  return phase < Math.floor(cycle * params.CarryFlickerOnFraction)  // 0.5
}
```

### Adjacency Metric
```javascript
function computeAdjacentSameColorCounts(state, params) {
  const result = new Array(params.ColorPalette.length).fill(0)
  for (const cell of state.grid.values()) {
    if (cell.colorIndex === null) continue
    let hasSameNeighbor = false
    for (const dir of axialDirections) {
      const neighbor = state.grid.get(keyOf(cell.q + dir.q, cell.r + dir.r))
      if (neighbor && neighbor.colorIndex === cell.colorIndex) {
        hasSameNeighbor = true
        break
      }
    }
    if (hasSameNeighbor) {
      result[cell.colorIndex] += 1
    }
  }
  return result
}
```

## State Persistence

Currently **not implemented**:
- No localStorage/sessionStorage
- No backend save
- Page refresh resets to initial state
- Seed is Date.now() (not reproducible)

For future persistence:
- Serialize GameState to JSON
- Store params and RNG seed separately
- Reconstruct Grid maps from arrays
- Validate version compatibility

## React Integration

State is managed in React component:

```javascript
const [gameState, setGameState] = useState(() => 
  createInitialState(params, rng)
)

// Tick loop
useEffect(() => {
  const interval = setInterval(() => {
    setGameState(prev => tick(prev, params, rng))
  }, 1000 / params.GameTickRate)  // 83.33ms
  return () => clearInterval(interval)
}, [params])

// Input handlers
function handleKeyDown(e) {
  if (e.code === 'Space') {
    setGameState(prev => {
      if (prev.captureCooldownTicksRemaining > 0) return prev
      return { ...prev, isActionMode: true }
    })
  }
  // ... other handlers
}
```

### Refs for Input State
Some transient input state uses refs (not GameState):

```javascript
const spaceIsDownRef = useRef(false)  // Track key held state
const joystickTouchIdRef = useRef(null)  // Active joystick touch
const actTouchIdRef = useRef(null)  // Active ACT button touch
```

## State Validation Invariants

These must always hold:

1. **Protagonist ≠ Captured**: If capturedCell exists, protagonist must be in different cell
2. **Grid Bounds**: All cell coordinates within GridRadius
3. **Valid Color Indices**: colorIndex is null or 0 <= colorIndex < ColorPalette.length
4. **Tick Monotonic**: tick always increases
5. **Cooldown Non-Negative**: captureCooldownTicksRemaining >= 0
6. **Active Field Valid**: activeField is 'world' or 'inventory'
7. **Facing Direction Valid**: 0 <= facingDirIndex <= 5
8. **Flash Duration**: If flash exists, current tick - startedTick <= CaptureFlashDurationTicks

Violations indicate bugs in state update logic.
