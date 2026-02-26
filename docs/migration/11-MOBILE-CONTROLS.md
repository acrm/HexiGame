# Mobile Controls

## Overview

Mobile users interact via on-screen touch controls rendered directly on the canvas.

## Control Layout

All controls positioned relative to canvas dimensions:

```javascript
const margin = 64
const inward = canvas.width * 0.10
const baseY = canvas.height - margin
```

### Bottom-Left Area: Joystick

```
+-------------------+
|                   |
|                   |
|                   |
|        INV        |  ← INV/WRL button (above joystick)
|                   |
|    (joystick)     |  ← Virtual joystick
+-------------------+
```

**Joystick center**: `(margin + inward, baseY)`

**INV/WRL button**: `(margin + inward, baseY - 64)`

### Bottom-Right Area: Action Buttons

```
+-------------------+
|                   |
|                   |
|                   |
|        EAT        |  ← EAT button (when carrying)
|                   |
|        ACT        |  ← ACT button (action mode)
+-------------------+
```

**ACT button center**: `(canvas.width - margin - inward, baseY)`

**EAT button center**: `(canvas.width - margin - inward, baseY - 64)`

## Virtual Joystick

### Visual Design

**Outer Circle**:
- Radius: 40px
- Fill: `rgba(255, 255, 255, 0.18)` (semi-transparent white)
- Alpha: 0.9

**Inner Knob**:
- Radius: 18px
- Fill: `rgba(255, 255, 255, 0.85)` (bright white)
- Position: Follows touch within outer circle

**Direction Arrow** (debug indicator):
- Length: 36px
- Color: Magenta `#ff00ff`
- Shows current direction when joystick active
- Positioned to right of joystick

### Rendering Code

```javascript
const joyCenterX = margin + inward
const joyCenterY = baseY
const outerRadius = 40
const innerRadius = 18

ctx.save()
ctx.globalAlpha = 0.9

// Outer circle
ctx.fillStyle = 'rgba(255,255,255,0.18)'
ctx.beginPath()
ctx.arc(joyCenterX, joyCenterY, outerRadius, 0, Math.PI * 2)
ctx.fill()

// Inner knob (clamped to outer radius)
const knob = joystickVector
const maxOffset = outerRadius - innerRadius - 4
const len = Math.hypot(knob.x, knob.y) || 1
const kx = joyCenterX + (knob.x / len) * Math.min(len, maxOffset)
const ky = joyCenterY + (knob.y / len) * Math.min(len, maxOffset)

ctx.fillStyle = 'rgba(255,255,255,0.85)'
ctx.beginPath()
ctx.arc(kx, ky, innerRadius, 0, Math.PI * 2)
ctx.fill()

ctx.restore()
```

### Touch Interaction

**Touch Start**:
```javascript
const dJoy = Math.hypot(x - joyCenterX, y - joyCenterY)
if (dJoy <= outerRadius && joystickTouchIdRef.current === null) {
  joystickTouchIdRef.current = t.identifier
  joystickCenterRef.current = { x: joyCenterX, y: joyCenterY }
  joystickVectorRef.current = { x: 0, y: 0 }
  ev.preventDefault()
}
```

**Touch Move**:
```javascript
if (t.identifier === joystickTouchIdRef.current) {
  const vx = x - joystickCenterRef.current.x
  const vy = y - joystickCenterRef.current.y
  joystickVectorRef.current = { x: vx, y: vy }
  
  // Throttle movement (1 per 6 ticks)
  if (gameState.tick - lastJoystickMoveTickRef.current >= 6) {
    lastJoystickMoveTickRef.current = gameState.tick
    const dir = joystickToAxial(vx, vy)
    if (dir) {
      onMove(dir[0], dir[1])
    }
  }
  ev.preventDefault()
}
```

**Touch End**:
```javascript
if (t.identifier === joystickTouchIdRef.current) {
  joystickTouchIdRef.current = null
  joystickCenterRef.current = null
  joystickVectorRef.current = { x: 0, y: 0 }
  ev.preventDefault()
}
```

### Direction Mapping

```javascript
function joystickToAxial(vx, vy) {
  const len = Math.hypot(vx, vy)
  if (len < 6) return null  // Dead zone (6px radius)
  
  const angle = Math.atan2(vy, vx)
  const deg = (angle * 180 / Math.PI + 360) % 360
  
  // 60° sectors
  if (deg >= 330 || deg < 30) return [1, 0]       // 0°: right → down-right
  else if (deg >= 30 && deg < 90) return [0, 1]    // 60°: down-right → down
  else if (deg >= 90 && deg < 150) return [-1, 1]  // 120°: down-left
  else if (deg >= 150 && deg < 210) return [-1, 0] // 180°: left → up-left
  else if (deg >= 210 && deg < 270) return [0, -1] // 240°: up-left → up
  else return [1, -1]                              // 300°: up-right
}
```

**Dead zone**: 6px radius prevents accidental tiny movements.

## ACT Button (Action Mode)

### Visual Design

**Shape**: Hexagon (flat-top orientation)
- Radius: 30px
- Fill: `rgba(255, 255, 255, 0.95)` (nearly opaque white)
- Stroke: Transparent
- Line width: 3

**Label**: "ACT"
- Font: 15px sans-serif
- Color: `rgba(0, 0, 0, 0.85)` (dark gray/black)
- Position: Centered

### Rendering Code

```javascript
const capCenterX = canvas.width - margin - inward
const capCenterY = baseY
const capRadius = 30

if (!isInventory) {  // Only show in world mode
  drawHex(ctx, capCenterX, capCenterY, capRadius, 'rgba(255,255,255,0.95)', 'transparent', 3)
  
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.font = '15px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ACT', capCenterX, capCenterY + 1)
}
```

### Touch Interaction

**Touch Start**:
```javascript
const dCap = Math.hypot(x - capCenterX, y - capCenterY)
if (dCap <= capRadius && !isInventory) {
  ev.preventDefault()
  actTouchIdRef.current = t.identifier
  onCapture()  // Sets isActionMode = true
}
```

**Touch End**:
```javascript
if (t.identifier === actTouchIdRef.current) {
  actTouchIdRef.current = null
  ev.preventDefault()
  onRelease()  // Sets isActionMode = false, abort release
}
```

**Behavior**: Hold to activate action mode, release anywhere to end.

### Visibility

- **World mode**: Always visible
- **Inventory mode**: Hidden (ACT button not shown)

## EAT Button

### Visual Design

**Shape**: Hexagon (flat-top orientation)
- Radius: 24px (smaller than ACT)
- Fill: `rgba(255, 255, 255, 0.95)`
- Stroke: Transparent
- Line width: 2

**Label**: "EAT"
- Font: 12px sans-serif
- Color: `rgba(0, 0, 0, 0.85)`
- Position: Centered

### Rendering Code

```javascript
const eatCenterX = capCenterX
const eatCenterY = capCenterY - 64
const eatRadius = 24

if (!isInventory && gameState.capturedCell) {
  drawHex(ctx, eatCenterX, eatCenterY, eatRadius, 'rgba(255,255,255,0.95)', 'transparent', 2)
  
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('EAT', eatCenterX, eatCenterY)
}
```

### Touch Interaction

**Touch Start/End**:
```javascript
const dEat = Math.hypot(x - eatCenterX, y - eatCenterY)
if (dEat <= eatRadius && !isInventory && gameState.capturedCell) {
  ev.preventDefault()
  onEat()
}
```

**Behavior**: Tap to eat (instant action).

### Visibility

- **World mode + carrying**: Visible
- **World mode + not carrying**: Hidden
- **Inventory mode**: Hidden

## INV/WRL Button (Inventory Toggle)

### Visual Design

**Shape**: Hexagon (flat-top orientation)
- Radius: 24px
- Fill: `rgba(255, 255, 255, 0.95)`
- Stroke: Transparent
- Line width: 2

**Label**: "INV" or "WRL"
- Font: 12px sans-serif
- Color: `rgba(0, 0, 0, 0.85)`
- Text: "INV" when in world mode, "WRL" when in inventory mode

### Rendering Code

```javascript
const invCenterX = joyCenterX
const invCenterY = joyCenterY - 64
const invRadius = 24

drawHex(ctx, invCenterX, invCenterY, invRadius, 'rgba(255,255,255,0.95)', 'transparent', 2)

ctx.fillStyle = 'rgba(0,0,0,0.85)'
ctx.font = '12px sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText(isInventory ? 'WRL' : 'INV', invCenterX, invCenterY)
```

### Touch Interaction

**Touch Start**:
```javascript
const dInv = Math.hypot(x - invCenterX, y - invCenterY)
if (dInv <= invRadius) {
  ev.preventDefault()
  onToggleInventory()
}
```

**Behavior**: Tap to toggle (instant action).

### Visibility

- **All modes**: Always visible

## Touch Target Sizes

All controls meet accessibility standards:

| Button | Diameter | Standard | Compliant |
|--------|----------|----------|-----------|
| Joystick | 80px | 44px min | ✅ Yes (182%) |
| ACT | 60px | 44px min | ✅ Yes (136%) |
| EAT | 48px | 44px min | ✅ Yes (109%) |
| INV/WRL | 48px | 44px min | ✅ Yes (109%) |

## Control Spacing

**Vertical spacing**: 64px between stacked buttons

**Horizontal spacing**: ~80% canvas width between left and right controls

**Edge margins**: 64px from canvas edges

**Dynamic inward offset**: 10% of canvas width (adapts to screen size)

## Touch Event Configuration

All touch handlers use non-passive listeners:

```javascript
canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false })
```

**Purpose**: Allows `preventDefault()` to block scroll/zoom on touch.

## Multi-Touch Support

Touch identifiers prevent interference:

```javascript
// Each control tracks its own touch ID
const joystickTouchIdRef = useRef(null)
const actTouchIdRef = useRef(null)

// Touch handlers check identifier matches
if (t.identifier === joystickTouchIdRef.current) {
  // Handle joystick move
}
if (t.identifier === actTouchIdRef.current) {
  // Handle ACT release
}
```

**Result**: Can use joystick and ACT button simultaneously.

## Tap-to-Focus

Tapping empty grid space moves cursor to that hex:

```javascript
// In handleTouchEnd
if (!consumed) {
  const axial = pixelToAxial(x, y)
  onSetCursor(axial.q, axial.r)
}
```

**Consumed** means touch was on a button (joystick, ACT, EAT, INV/WRL).

## Visual Feedback

### Active Touch

- **Joystick**: Knob follows finger
- **ACT**: No visual change (always white)
- **EAT**: No visual change (instant action)
- **INV/WRL**: No visual change (instant action)

### Game State Feedback

- **Action mode active**: Cursor shows two rotating opposite edges
- **Carrying**: White outline on carried hex
- **Cooldown**: Red rotating edge on cursor

## Mobile Layout Considerations

### Portrait Orientation

Controls at bottom don't interfere with grid view (grid auto-scales to fit).

### Landscape Orientation

Controls may overlap grid slightly on very wide screens; still functional.

### Small Screens

Minimum canvas size handles controls gracefully:
- Joystick and buttons stay within canvas bounds
- Spacing scales with canvas width (inward offset is percentage)

### Large Screens (Tablet)

Controls remain at bottom corners:
- Large spacing (80% canvas width)
- Easy to reach with thumbs

## Control Rendering Order

Drawn last (on top of grid):

1. Grid hexes and cursor
2. Turtle
3. **Joystick** (outer circle, then knob)
4. **Direction arrow** (debug)
5. **ACT button** (if visible)
6. **EAT button** (if visible)
7. **INV/WRL button**
8. FPS counter

## Disabled States

No visual disabled states; controls simply not rendered when not applicable:

- **ACT**: Hidden in inventory mode
- **EAT**: Hidden when not carrying or in inventory mode

## Alternative Input

Mobile users can also:
- **Tap grid**: Move cursor directly to hex
- **No keyboard**: Touch-only interaction

Desktop keyboard shortcuts not available on mobile (no keyboard).

## Debug Features

### Direction Arrow

Shows joystick direction:

```javascript
if (debugArrow && dir) {
  const px = hexToPixel(dir[0], dir[1])
  const ang = Math.atan2(px.y, px.x)
  const arrowLen = 36
  
  // Draw arrow from arrowCenterX, arrowCenterY in direction ang
  // ... (line + arrowhead)
}
```

**Position**: To the right of joystick

**Color**: Magenta `#ff00ff`

**Visibility**: Controlled by `debugArrow` constant (currently true)

## Performance

All controls rendered in same canvas render loop:
- No separate DOM elements
- No layout thrashing
- Scales with canvas scale factor
- 60 FPS target maintained
