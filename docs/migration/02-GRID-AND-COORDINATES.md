# Grid and Coordinate System

## Hexagonal Grid Fundamentals

### Coordinate System: Axial
The game uses **axial coordinates** (q, r) for hexagonal cells.

```
Axial coordinate system:
- q: column-like axis (increases right)
- r: row-like axis (increases down-right)
- s = -q - r (third coordinate, derived)
```

### Hex Orientation: Pointy-Top
Hexagons have two vertices pointing up/down (not flat sides).

```
Pointy-top hex vertices (60° apart):
  Vertex 0: top (0°)
  Vertex 1: top-right (60°)
  Vertex 2: bottom-right (120°)
  Vertex 3: bottom (180°)
  Vertex 4: bottom-left (240°)
  Vertex 5: top-left (300°)
```

### Grid Shape: Disk (Circle)
Grid consists of all hexes within radius R from origin.

**Inclusion rule**: A hex (q, r) is in the grid if:
```
|q| ≤ R  AND  |r| ≤ R  AND  |s| ≤ R
where s = -q - r
```

**Default radius**: 5
- Results in 91 total hexes
- Origin (0, 0) is the center
- Maximum coordinate value: ±5

## Axial Directions

Six adjacent neighbors from any hex (q, r):

```javascript
const axialDirections = [
  { q: 0, r: -1 },   // 0: up
  { q: +1, r: -1 },  // 1: up-right
  { q: +1, r: 0 },   // 2: down-right
  { q: 0, r: +1 },   // 3: down
  { q: -1, r: +1 },  // 4: down-left
  { q: -1, r: 0 },   // 5: up-left
]
```

### Direction Indexing
- Directions indexed 0-5 clockwise starting from "up"
- Used for turtle facing direction (facingDirIndex)
- Keyboard/joystick input maps to these six directions

### Neighbor Lookup
```javascript
function neighbor(hex, directionIndex) {
  const dir = axialDirections[directionIndex % 6]
  return { q: hex.q + dir.q, r: hex.r + dir.r }
}
```

## Pixel Coordinate Conversion

### Axial to Pixel (for rendering)
Given axial (q, r) and hex size S:

```javascript
const HEX_SIZE = 10  // base size in pixels

function hexToPixel(q, r) {
  const x = HEX_SIZE * 1.5 * q
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2)
  return { x, y }
}
```

**Layout constants**:
- Horizontal spacing: `1.5 * HEX_SIZE`
- Vertical spacing: `sqrt(3) * HEX_SIZE`

### Pixel to Axial (for click/touch)
Reverse conversion with rounding:

```javascript
function pixelToAxial(px, py) {
  const x = (px - centerX) / scale
  const y = (py - centerY) / scale
  
  const qFloat = x / (1.5 * HEX_SIZE)
  const rFloat = (y / (Math.sqrt(3) * HEX_SIZE)) - qFloat / 2
  const sFloat = -qFloat - rFloat
  
  // Round to nearest hex using cube rounding
  let q = qFloat
  let r = rFloat
  let s = sFloat
  
  const rq = Math.round(q)
  const rr = Math.round(r)
  const rs = Math.round(s)
  
  const qDiff = Math.abs(rq - q)
  const rDiff = Math.abs(rr - r)
  const sDiff = Math.abs(rs - s)
  
  // Reset coordinate with largest diff
  if (qDiff > rDiff && qDiff > sDiff) {
    q = -rr - rs
  } else if (rDiff > sDiff) {
    r = -rq - rs
  }
  
  return { q: Math.round(q), r: Math.round(r) }
}
```

### Screen-Space Centering
Canvas rendering centers the grid:

```javascript
// Compute grid bounds
for each cell (q, r):
  const {x, y} = hexToPixel(q, r)
  minX = min(minX, x - HEX_SIZE)
  maxX = max(maxX, x + HEX_SIZE)
  minY = min(minY, y - HEX_SIZE * sqrt(3) / 2)
  maxY = max(maxY, y + HEX_SIZE * sqrt(3) / 2)

// Fit to canvas with uniform scale
const scale = min(
  canvas.width / (maxX - minX),
  canvas.height / (maxY - minY)
)

const centerX = canvas.width / 2 - ((minX + maxX) / 2) * scale
const centerY = canvas.height / 2 - ((minY + maxY) / 2) * scale
```

## Cell Data Structure

### Cell Type
```typescript
type Cell = {
  q: number            // axial column coordinate
  r: number            // axial row coordinate
  colorIndex: number | null  // palette index or null if empty
}
```

### Grid Type
```typescript
type Grid = Map<string, Cell>

// Key format: "q,r"
function keyOf(q: number, r: number): string {
  return `${q},${r}`
}
```

### Grid Operations
```javascript
// Get cell
const cell = grid.get(keyOf(q, r))

// Set cell (immutable)
const newGrid = new Map(grid)
newGrid.set(keyOf(q, r), { q, r, colorIndex: 3 })

// Update multiple cells
function updateCells(grid, cellsArray) {
  const next = new Map(grid)
  for (const cell of cellsArray) {
    next.set(keyOf(cell.q, cell.r), cell)
  }
  return next
}
```

## Grid Initialization

### World Grid
```javascript
function generateGrid(params, rng) {
  const grid = new Map()
  const radius = params.GridRadius  // default: 5
  const paletteLen = params.ColorPalette.length  // 8
  const prob = params.InitialColorProbability  // 0.30
  
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!axialInDisk(radius, q, r)) continue
      
      const colorIndex = rng() < prob
        ? Math.floor(rng() * paletteLen)
        : null
      
      grid.set(keyOf(q, r), { q, r, colorIndex })
    }
  }
  return grid
}
```

**Initial distribution**:
- 30% of cells start with random colors
- 70% start empty
- Colors chosen uniformly from palette

### Inventory Grid
```javascript
// Same shape as world, all cells empty
function createInventoryGrid(radius) {
  const grid = new Map()
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!axialInDisk(radius, q, r)) continue
      grid.set(keyOf(q, r), { q, r, colorIndex: null })
    }
  }
  return grid
}
```

## Distance Metrics

### Axial Distance (Manhattan in Cube Space)
Distance between two hexes:

```javascript
function axialDistance(a, b) {
  const dq = a.q - b.q
  const dr = a.r - b.r
  const ds = (-a.q - a.r) - (-b.q - b.r)
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2
}
```

### Adjacency Check
```javascript
function isAdjacent(a, b) {
  return axialDirections.some(dir => 
    a.q + dir.q === b.q && a.r + dir.r === b.r
  )
}
```

### Pathfinding (Simple Greedy)
Turtle movement uses greedy distance minimization:

```javascript
function findClosestStep(from, to, avoid) {
  let bestDir = null
  let bestDist = Infinity
  
  for (const dir of axialDirections) {
    const next = { q: from.q + dir.q, r: from.r + dir.r }
    
    // Skip if blocked
    if (avoid && next.q === avoid.q && next.r === avoid.r) continue
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

## Grid Rendering Constants

### Visual Sizing
```javascript
const HEX_SIZE = 10  // logical hex "radius" in pixels

// Actual hex dimensions (pointy-top):
const hexWidth = HEX_SIZE * 2
const hexHeight = HEX_SIZE * Math.sqrt(3)

// Spacing:
const horizontalSpacing = HEX_SIZE * 1.5
const verticalSpacing = hexHeight
```

### Vertex Calculation
```javascript
function hexVertices(centerX, centerY, size) {
  const points = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)  // 60° per vertex
    const x = centerX + size * Math.cos(angle)
    const y = centerY + size * Math.sin(angle)
    points.push([x, y])
  }
  return points
}
```

### Edge Highlighting
Individual edges numbered 0-5:
```javascript
function drawEdgeHighlight(ctx, centerX, centerY, edgeIndex, size, color) {
  const vertices = hexVertices(centerX, centerY, size)
  const p1 = vertices[edgeIndex]
  const p2 = vertices[(edgeIndex + 1) % 6]
  
  ctx.beginPath()
  ctx.moveTo(p1[0], p1[1])
  ctx.lineTo(p2[0], p2[1])
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()
}
```

## Grid Corner Dots (Empty Cell Visualization)

For empty cells, draw dots at vertices that are only surrounded by empty cells:

```javascript
// For each empty cell's 6 vertices:
// - Check if all neighboring hexes sharing this vertex are empty
// - If so, draw a small dot at that vertex
// - Deduplicate vertices using rounded pixel coordinates as keys
```

This creates a subtle grid pattern showing empty space structure without drawing full hex outlines.

## Coordinate Edge Cases

### Out of Bounds
- Cursor movement to invalid coordinates is blocked
- Turtle pathfinding stays within grid bounds
- Click/touch outside grid is ignored or snaps to nearest hex

### Origin Position
- Grid origin (0, 0) is the center cell
- Starting position for cursor and protagonist
- No special gameplay significance

### Grid Boundaries
- Circular boundary (disk shape)
- All edge cells have < 6 neighbors
- Movement blocked at boundary (cannot go outside)
