# Rendering System

## Canvas-Based Rendering

All game graphics rendered using HTML5 Canvas 2D context.

### Canvas Setup

```javascript
<canvas ref={canvasRef} style={{ display: 'block' }} />

const canvas = canvasRef.current
const ctx = canvas.getContext('2d')
```

### Auto-Scaling

Canvas dynamically resizes to fit container:

```javascript
const availableWidth = container.clientWidth
const availableHeight = container.clientHeight

// Compute grid bounds in logical coordinates
let minX = Infinity, maxX = -Infinity
let minY = Infinity, maxY = -Infinity

for (const cell of gameState.grid.values()) {
  const {x, y} = hexToPixel(cell.q, cell.r)
  const halfW = HEX_SIZE * 1.0
  const halfH = HEX_SIZE * Math.sqrt(3) * 0.5
  minX = Math.min(minX, x - halfW)
  maxX = Math.max(maxX, x + halfW)
  minY = Math.min(minY, y - halfH)
  maxY = Math.max(maxY, y + halfH)
}

const logicalWidth = maxX - minX
const logicalHeight = maxY - minY

// Uniform scale to fit both dimensions
const scale = Math.min(
  availableWidth / logicalWidth,
  availableHeight / logicalHeight
)

canvas.width = Math.floor(availableWidth)
canvas.height = Math.floor(availableHeight)

// Center grid on canvas
const centerX = canvas.width / 2 - ((minX + maxX) / 2) * scale
const centerY = canvas.height / 2 - ((minY + maxY) / 2) * scale
```

**Result**: Grid always fills available space while maintaining aspect ratio.

## Rendering Order (Layers)

Drawn in this order (back to front):

1. **Background Clear / Tint**
2. **Grid Hexes** (colored cells)
3. **Grid Dots** (empty cell vertices)
4. **Cursor Indicators** (rotating edges, charge progress)
5. **Turtle** (protagonist flower)
6. **Mobile Controls** (joystick, buttons)
7. **FPS Counter**

## Hex Cell Rendering

### Draw Function

```javascript
function drawHex(ctx, x, y, size, fill, stroke, lineWidth = 2) {
  const angleDeg = 60
  const pts = []
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i)
    pts.push([
      x + size * Math.cos(angle),
      y + size * Math.sin(angle)
    ])
  }
  
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.closePath()
  
  ctx.fillStyle = fill
  ctx.fill()
  
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}
```

### Colored Hex

```javascript
for (const cell of activeGrid.values()) {
  const pos = hexToPixel(cell.q, cell.r)
  const scaledX = centerX + pos.x * scale
  const scaledY = centerY + pos.y * scale
  
  const fill = cell.colorIndex !== null 
    ? params.ColorPalette[cell.colorIndex] 
    : 'transparent'
  
  const isCaptured = !isInventory && gameState.capturedCell 
    && cell.q === gameState.capturedCell.q 
    && cell.r === gameState.capturedCell.r
  
  const stroke = isCaptured ? '#FFFFFF' : 'transparent'
  const strokeWidth = isCaptured ? 2 * scale : 0
  
  drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, stroke, strokeWidth)
}
```

**White outline** indicates captured hex.

### Empty Cell Dots

```javascript
const GRID_STROKE_COLOR = '#635572ff'
const dotRadius = 1.2 * scale

const seenVertices = new Set()
const emptyCells = Array.from(activeGrid.values()).filter(c => c.colorIndex === null)

for (const cell of emptyCells) {
  const pos = hexToPixel(cell.q, cell.r)
  const baseX = centerX + pos.x * scale
  const baseY = centerY + pos.y * scale
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const vx = baseX + HEX_SIZE * scale * Math.cos(angle)
    const vy = baseY + HEX_SIZE * scale * Math.sin(angle)
    const key = `${Math.round(vx)}:${Math.round(vy)}`
    
    if (seenVertices.has(key)) continue
    
    // Check if all hexes sharing this vertex are empty
    let allEmpty = true
    for (const other of activeGrid.values()) {
      const otherPos = hexToPixel(other.q, other.r)
      const ox = centerX + otherPos.x * scale
      const oy = centerY + otherPos.y * scale
      const dist = Math.hypot(ox - vx, oy - vy)
      
      if (Math.abs(dist - HEX_SIZE * scale) < HEX_SIZE * scale * 0.15) {
        if (other.colorIndex !== null) {
          allEmpty = false
          break
        }
      }
    }
    
    if (!allEmpty) continue
    
    seenVertices.add(key)
    ctx.fillStyle = GRID_STROKE_COLOR
    ctx.beginPath()
    ctx.arc(vx, vy, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

Creates subtle grid pattern in empty areas.

## Cursor Visual States

### Rotating Edge (Default)

Single edge rotates around cursor hex:

```javascript
function computeEdgeIndex(timeMs, rotationPeriodMs = 500) {
  const phase = (timeMs % rotationPeriodMs) / rotationPeriodMs
  return Math.floor(phase * 6) % 6
}

const now = performance.now()
const edgeIndex = computeEdgeIndex(now)
drawEdgeHighlight(ctx, scaledX, scaledY, edgeIndex, HEX_SIZE * scale, '#FFFFFF')
```

**Period**: 500ms per full rotation (3 rotations/sec).

### Cooldown (Red Rotating Edge)

```javascript
if (isInCooldown) {
  const now = performance.now()
  const edgeIndex = computeEdgeIndex(now)
  drawEdgeHighlight(ctx, scaledX, scaledY, edgeIndex, HEX_SIZE * scale, '#FF4444')
}
```

**Color**: Dark red (#FF4444 or #AA0000).

### Action Mode (Two Opposite Edges)

```javascript
if (gameState.isActionMode && !isCharging && !isInCooldown) {
  const edgeA = gameState.tick % 6
  const edgeB = (edgeA + 3) % 6
  drawEdgeHighlight(ctx, scaledX, scaledY, edgeA, HEX_SIZE * scale, '#FFFFFF')
  drawEdgeHighlight(ctx, scaledX, scaledY, edgeB, HEX_SIZE * scale, '#FFFFFF')
}
```

**Rotation**: One step per tick (2 rotations/sec at 12 ticks/sec).

### Charging (Sequential Fill)

```javascript
if (isCharging) {
  const now = performance.now()
  const baseEdge = computeEdgeIndex(now)
  const heldTicks = gameState.tick - gameState.captureChargeStartTick
  const fraction = Math.min(1, heldTicks / params.CaptureHoldDurationTicks)
  const edgeCount = Math.max(1, Math.ceil(fraction * 6))
  
  for (let i = 0; i < edgeCount; i++) {
    const edge = (baseEdge + i) % 6
    drawEdgeHighlight(ctx, scaledX, scaledY, edge, HEX_SIZE * scale, '#FFFFFF')
  }
}
```

**Progress**: Edges fill clockwise from rotating base edge.

### Releasing (Rotating Edge)

```javascript
if (isReleasing) {
  const now = performance.now()
  const edgeIndex = computeEdgeIndex(now)
  drawEdgeHighlight(ctx, scaledX, scaledY, edgeIndex, HEX_SIZE * scale, '#FFFFFF')
}
```

**Same as default** (single rotating white edge).

### Edge Highlight Function

```javascript
function drawEdgeHighlight(ctx, centerX, centerY, edge, size, color) {
  const angleDeg = 60
  const pts = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i)
    pts.push([
      centerX + size * Math.cos(angle),
      centerY + size * Math.sin(angle)
    ])
  }
  
  const p1 = pts[edge]
  const p2 = pts[(edge + 1) % 6]
  
  ctx.beginPath()
  ctx.moveTo(p1[0], p1[1])
  ctx.lineTo(p2[0], p2[1])
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
}
```

## Turtle Rendering

### Structure

Turtle consists of:
- **Shell** (center hex, flat-top, rotated 30°)
- **6 Petals** (small hexes in ring around shell)
- **Head** (one petal enlarged, points toward cursor)
- **Eyes** (two dots on head, perpendicular to facing)

### Positioning

Turtle renders at protagonist position:

```javascript
const pivotPos = hexToPixel(protagonist.q, protagonist.r)
const pivotX = centerX + pivotPos.x * scale
const pivotY = centerY + pivotPos.y * scale
```

### Head Direction

Head petal chosen based on cursor direction:

```javascript
const hoverPos = hexToPixel(cursor.q, cursor.r)
const hx = centerX + hoverPos.x * scale
const hy = centerY + hoverPos.y * scale
const vx = hx - pivotX
const vy = hy - pivotY
const cursorAngle = Math.atan2(vy, vx)

// Choose petal closest to cursor angle
let headIndex = 0
let bestDiff = Infinity
for (let i = 0; i < 6; i++) {
  const petalAngle = (Math.PI / 180) * (60 * i - 30)
  const ringRadius = centerRadius * 2.05
  const px = ringRadius * Math.cos(petalAngle)
  const py = ringRadius * Math.sin(petalAngle)
  const angle = Math.atan2(py, px)
  const diff = Math.abs(Math.atan2(Math.sin(cursorAngle - angle), Math.cos(cursorAngle - angle)))
  if (diff < bestDiff) {
    bestDiff = diff
    headIndex = i
  }
}
```

### Petal Rendering

```javascript
const parentRadius = HEX_SIZE * scale
const centerRadius = parentRadius / 3
const shellRadius = parentRadius / Math.sqrt(3)

const baseColor = params.ColorPalette[params.PlayerBaseColorIndex]
const tailIndex = (headIndex + 3) % 6

for (let i = 0; i < 6; i++) {
  if (i === tailIndex) continue  // Tail petal omitted
  
  const angle = (Math.PI / 180) * (60 * i - 30)
  const ringRadius = centerRadius * 2.05
  const cx = pivotX + ringRadius * Math.cos(angle)
  const cy = pivotY + ringRadius * Math.sin(angle)
  
  const isHead = i === headIndex
  const radius = isHead ? centerRadius : parentRadius / 9
  const fill = isHead ? baseColor : 'rgba(255,255,255,0.6)'
  
  drawHex(ctx, cx, cy, radius, fill, '#FFFFFF', 0.8 * scale)
  
  if (isHead) {
    // Draw eyes
    const hx = cx - pivotX
    const hy = cy - pivotY
    const len = Math.hypot(hx, hy) || 1
    const ux = hx / len
    const uy = hy / len
    const px = -uy
    const py = ux
    const eyeOffset = radius * 0.35
    const eyeSize = radius * 0.12
    
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(cx + px * eyeOffset, cy + py * eyeOffset, eyeSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx - px * eyeOffset, cy - py * eyeOffset, eyeSize, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Draw shell
ctx.save()
ctx.translate(pivotX, pivotY)
ctx.rotate((30 * Math.PI) / 180)
drawHex(ctx, 0, 0, shellRadius, baseColor, '#FFFFFF', 0.8 * scale)
ctx.restore()
```

**Result**: Flower-like turtle with head facing cursor, tail omitted.

## Inventory Background Tint

```javascript
if (isInventory) {
  ctx.fillStyle = params.ColorPalette[params.PlayerBaseColorIndex]
  ctx.globalAlpha = 0.15
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalAlpha = 1.0
}
```

**Tint**: 15% opacity player color (#FF8000 by default).

## FPS Counter

```javascript
const frameData = frameCounterRef.current
frameData.frames++
const now = performance.now()

if (now - frameData.last >= 1000) {
  setFps(frameData.frames)
  frameData.frames = 0
  frameData.last = now
}

ctx.save()
ctx.fillStyle = '#ffffff'
ctx.globalAlpha = 0.85
ctx.font = '11px sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'bottom'
ctx.fillText(`FPS: ${fps}`, canvas.width / 2, canvas.height - 4)
ctx.restore()
```

**Position**: Bottom center of canvas.

## Render Loop

```javascript
useEffect(() => {
  let mounted = true
  
  function render() {
    if (!mounted) return
    // ... rendering code ...
    requestAnimationFrame(render)
  }
  
  const raf = requestAnimationFrame(render)
  return () => {
    mounted = false
    cancelAnimationFrame(raf)
  }
}, [gameState, params, fps, joystickVector, joystickToAxial, setFps, isInventory])
```

**Loop**: `requestAnimationFrame` (typically 60 FPS).

**Dependencies**: Re-create render loop when state/params change.

## Performance Considerations

### Scaling
- Single scale factor for all elements
- Maintains aspect ratio
- No distortion

### Drawing Optimization
- No z-buffering needed (2D layers)
- Clear canvas each frame (full redraw)
- Simple shapes (hexagons, dots, lines)

### Typical Performance
- 60 FPS on modern devices
- 91 hexes per grid (max 182 if toggling)
- Low draw call count (few hundred primitives)
