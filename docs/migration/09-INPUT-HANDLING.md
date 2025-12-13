# Input Handling

## Platform Detection

Mobile vs desktop determined by viewport width:

```javascript
const isMobileLayout = typeof window !== 'undefined' && window.innerWidth <= 900
```

**Threshold**: 900px width.

## Desktop Input

### Keyboard

```javascript
useEffect(() => {
  function handleKeyDown(e) {
    // Tab: Toggle inventory
    if (e.key === 'Tab') {
      e.preventDefault()
      setIsInventory(v => !v)
      setGameState(prev => ({ 
        ...prev, 
        activeField: !isInventory ? 'inventory' : 'world' 
      }))
      return
    }
    
    // Space: Action mode
    if (e.code === 'Space') {
      if (spaceIsDownRef.current) return  // Already pressed
      
      setGameState(prev => {
        if (prev.captureCooldownTicksRemaining > 0) {
          return prev  // Blocked by cooldown
        }
        spaceIsDownRef.current = true
        return { ...prev, isActionMode: true }
      })
      return
    }
    
    // E: Eat
    if (e.key === 'e' || e.key === 'E') {
      setGameState(prev => eatCapturedToInventory(prev, params, rng))
      return
    }
    
    // Arrow keys / WASD: Movement
    const moves = {
      ArrowUp: [0, -1], w: [0, -1],
      ArrowDown: [0, 1], s: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0],
    }
    
    const delta = moves[e.key]
    if (delta) {
      const [dq, dr] = delta
      setGameState(prev => attemptMoveByDeltaOnActive(prev, params, dq, dr))
    }
  }
  
  function handleKeyUp(e) {
    if (e.code === 'Space') {
      if (!spaceIsDownRef.current) return
      spaceIsDownRef.current = false
      
      setGameState(prev => {
        // Abort release movement
        const baseReset = { 
          ...prev, 
          isActionMode: false, 
          isReleasing: prev.isReleasing ? false : prev.isReleasing 
        }
        
        // Cancel incomplete charge
        if (prev.captureChargeStartTick !== null) {
          const heldTicks = prev.tick - prev.captureChargeStartTick
          if (heldTicks < params.CaptureHoldDurationTicks) {
            return { ...baseReset, captureChargeStartTick: null }
          }
          return baseReset
        }
        
        return baseReset
      })
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
}, [params, isInventory])
```

### Keyboard Mapping

| Key | Action | Notes |
|-----|--------|-------|
| Arrow Keys | Move cursor | 4-directional (up/down/left/right) |
| W/A/S/D | Move cursor | Same as arrow keys |
| Space (hold) | Action mode | Gated by cooldown |
| Space (release) | End action | Cancel charge or abort release |
| E | Eat | Only when carrying in world mode |
| Tab | Toggle inventory | Prevent default browser behavior |

### Key Repeat Handling

- **Movement keys**: Repeat allowed (continuous movement)
- **Space**: Repeat blocked via `spaceIsDownRef` flag
- **E**: Instant action (repeat allowed but has no effect if not carrying)
- **Tab**: Instant toggle (repeat allowed but alternates state)

### Mouse

```javascript
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  
  function handleMouseDown(ev) {
    if (ev.button !== 0) return  // Left click only
    
    const rect = canvas.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    const axial = pixelToAxial(x, y)
    
    onSetCursor(axial.q, axial.r)
  }
  
  canvas.addEventListener('mousedown', handleMouseDown)
  return () => canvas.removeEventListener('mousedown', handleMouseDown)
}, [onSetCursor])
```

**Action**: Click to move cursor directly to hex.

## Mobile Input

### Touch Controls

All touch controls rendered on canvas and handled via touch events.

#### Virtual Joystick

**Positioning**:
```javascript
const margin = 64
const inward = canvas.width * 0.10
const joyCenterX = margin + inward
const joyCenterY = canvas.height - margin
```

**Visual**:
- Outer circle: 40px radius, semi-transparent white
- Inner knob: 18px radius, moves with touch
- Arrow indicator: shows current direction

**Touch Handling**:

```javascript
function handleTouchStart(ev) {
  for (const t of ev.changedTouches) {
    const x = t.clientX - rect.left
    const y = t.clientY - rect.top
    
    const dJoy = Math.hypot(x - joyCenterX, y - joyCenterY)
    if (dJoy <= 40 && joystickTouchIdRef.current === null) {
      joystickTouchIdRef.current = t.identifier
      joystickCenterRef.current = { x: joyCenterX, y: joyCenterY }
      joystickVectorRef.current = { x: 0, y: 0 }
      ev.preventDefault()
    }
  }
}

function handleTouchMove(ev) {
  for (const t of ev.changedTouches) {
    if (t.identifier !== joystickTouchIdRef.current) continue
    
    const x = t.clientX - rect.left
    const y = t.clientY - rect.top
    const vx = x - joystickCenterRef.current.x
    const vy = y - joystickCenterRef.current.y
    joystickVectorRef.current = { x: vx, y: vy }
    
    // Throttle movement
    const nowTick = gameState.tick
    if (nowTick - lastJoystickMoveTickRef.current >= 6) {
      lastJoystickMoveTickRef.current = nowTick
      const dir = joystickToAxial(vx, vy)
      if (dir) {
        onMove(dir[0], dir[1])
      }
    }
    ev.preventDefault()
  }
}

function handleTouchEnd(ev) {
  for (const t of ev.changedTouches) {
    if (t.identifier === joystickTouchIdRef.current) {
      joystickTouchIdRef.current = null
      joystickCenterRef.current = null
      joystickVectorRef.current = { x: 0, y: 0 }
      ev.preventDefault()
    }
  }
}
```

**Direction Mapping**:
```javascript
function joystickToAxial(vx, vy) {
  const len = Math.hypot(vx, vy)
  if (len < 6) return null  // Dead zone
  
  const angle = Math.atan2(vy, vx)
  const deg = (angle * 180 / Math.PI + 360) % 360
  
  // Map 60° sectors to hex directions
  if (deg >= 330 || deg < 30) return [1, 0]       // Right
  else if (deg >= 30 && deg < 90) return [0, 1]    // Down-right
  else if (deg >= 90 && deg < 150) return [-1, 1]  // Down-left
  else if (deg >= 150 && deg < 210) return [-1, 0] // Left
  else if (deg >= 210 && deg < 270) return [0, -1] // Up-left
  else return [1, -1]                              // Up-right
}
```

**Throttle**: 1 move per 6 ticks (avoid jitter).

#### ACT Button (Action Mode)

**Positioning**:
```javascript
const capCenterX = canvas.width - margin - inward
const capCenterY = canvas.height - margin
```

**Visual**:
- Hex shape, 30px radius
- White fill with black "ACT" text
- Only visible in world mode

**Touch Handling**:

```javascript
function handleTouchStart(ev) {
  for (const t of ev.changedTouches) {
    const x = t.clientX - rect.left
    const y = t.clientY - rect.top
    
    const dCap = Math.hypot(x - capCenterX, y - capCenterY)
    if (dCap <= 30 && !isInventory) {
      ev.preventDefault()
      actTouchIdRef.current = t.identifier
      onCapture()  // Sets isActionMode = true
    }
  }
}

function handleTouchEnd(ev) {
  for (const t of ev.changedTouches) {
    // Release ACT even if finger moved outside button
    if (t.identifier === actTouchIdRef.current) {
      actTouchIdRef.current = null
      ev.preventDefault()
      onRelease()  // Sets isActionMode = false, abort release
    }
  }
}
```

**Behavior**: Hold to activate action mode, release anywhere to end.

#### EAT Button

**Positioning**:
```javascript
const eatCenterX = capCenterX
const eatCenterY = capCenterY - 64  // Above ACT button
```

**Visual**:
- Hex shape, 24px radius
- White fill with black "EAT" text
- Only visible when carrying in world mode

**Touch Handling**:

```javascript
if (!isInventory && gameState.capturedCell) {
  const dEat = Math.hypot(x - eatCenterX, y - eatCenterY)
  if (dEat <= 24) {
    ev.preventDefault()
    onEat()
  }
}
```

**Behavior**: Tap to eat (instant action).

#### INV/WRL Button (Inventory Toggle)

**Positioning**:
```javascript
const invCenterX = joyCenterX
const invCenterY = joyCenterY - 64  // Above joystick
```

**Visual**:
- Hex shape, 24px radius
- White fill with black text
- Text: "INV" in world mode, "WRL" in inventory mode

**Touch Handling**:

```javascript
const dInv = Math.hypot(x - invCenterX, y - invCenterY)
if (dInv <= 24) {
  ev.preventDefault()
  onToggleInventory()
}
```

**Behavior**: Tap to toggle (instant action).

#### Tap to Focus

Tapping grid (outside buttons) moves cursor to that hex:

```javascript
function handleTouchEnd(ev) {
  for (const t of ev.changedTouches) {
    // Skip if this was a button touch
    if (t.identifier === actTouchIdRef.current) continue
    if (t.identifier === joystickTouchIdRef.current) continue
    
    // Check if tap was on any button
    const x = t.clientX - rect.left
    const y = t.clientY - rect.top
    
    // ... check distances to buttons ...
    
    // If not on button: move cursor
    const axial = pixelToAxial(x, y)
    onSetCursor(axial.q, axial.r)
  }
}
```

**Behavior**: Tap empty grid space to move cursor directly.

### Touch Event Configuration

```javascript
canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false })
```

**Non-passive**: Allows `preventDefault()` to block scrolling.

## Input State Management

### Refs for Transient State

```javascript
const spaceIsDownRef = useRef(false)          // Space key held
const joystickTouchIdRef = useRef(null)       // Active joystick touch ID
const joystickCenterRef = useRef(null)        // Joystick touch start position
const joystickVectorRef = useRef({ x: 0, y: 0 }) // Current joystick vector
const actTouchIdRef = useRef(null)            // Active ACT button touch ID
const lastJoystickMoveTickRef = useRef(0)     // Last tick when joystick moved cursor
```

**Why refs**: These values don't need to trigger re-renders and change rapidly.

### State Updates

Input handlers call state setters:

```javascript
setGameState(prev => /* ... new state ... */)
setIsInventory(v => !v)
```

## Input Throttling

### Joystick Movement

```javascript
const nowTick = gameState.tick
if (nowTick - lastJoystickMoveTickRef.current >= 6) {
  lastJoystickMoveTickRef.current = nowTick
  onMove(dq, dr)
}
```

**Throttle**: 1 move per 6 ticks (every 0.5 seconds).

### Cursor Movement When Carrying

```javascript
if (state.activeField === 'world' && state.capturedCell) {
  const movePeriod = 4
  const lastMove = state.lastCarryMoveTick ?? 0
  if (state.tick - lastMove < movePeriod) {
    return state  // Too soon
  }
}
```

**Throttle**: 1 move per 4 ticks when carrying in world.

## Input Edge Cases

### Multiple Simultaneous Touches

Touch IDs prevent confusion:
- Joystick uses first touch inside joystick area
- ACT button uses first touch inside button area
- Each tracked separately via `identifier`

### Touch Outside Then Release Inside

Joystick knob clamped to outer radius:

```javascript
const maxOffset = outerRadius - innerRadius - 4
const len = Math.hypot(knob.x, knob.y) || 1
const kx = joyCenterX + (knob.x / len) * Math.min(len, maxOffset)
const ky = joyCenterY + (knob.y / len) * Math.min(len, maxOffset)
```

ACT button releases even if finger moves outside:

```javascript
if (t.identifier === actTouchIdRef.current) {
  // Release action regardless of touch position
  onRelease()
}
```

### Keyboard + Mouse Hybrid

Both work simultaneously:
- Keyboard for movement/actions
- Mouse for cursor focus
- No conflict (state updates merge)

### Mobile Safari Quirks

Dynamic viewport height handled:

```javascript
useEffect(() => {
  const applyVh = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }
  applyVh()
  window.addEventListener('resize', applyVh)
  return () => window.removeEventListener('resize', applyVh)
}, [])
```

Used in CSS:
```css
height: calc(var(--vh, 1vh) * 100);
```

Prevents address bar from causing layout shifts.

## Input Accessibility

### Touch Target Sizes

| Control | Size | Meets Standard |
|---------|------|----------------|
| Joystick | 80px diameter | ✅ (44px minimum) |
| ACT button | 60px diameter | ✅ |
| EAT button | 48px diameter | ✅ |
| INV/WRL button | 48px diameter | ✅ |

All controls exceed minimum touch target size (44×44px).

### Keyboard Navigation

- All actions accessible via keyboard
- No mouse-only features
- Clear key mapping (documented in controls panel)

### Visual Feedback

- Hover states on desktop (cursor changes)
- Active button states on mobile (touch highlights)
- Clear action feedback (flashes, edges)
