# UI Components

## Component Hierarchy

```
Root
└── Game
    ├── PaletteCluster
    ├── ControlsInfoDesktop (desktop only)
    ├── ControlsInfoMobile (mobile popup)
    └── GameField
        └── Canvas (rendering + mobile controls)
```

## Game Component (Main Container)

**File**: `src/components/Game.tsx`

### Responsibilities

- Create and manage game state
- Handle tick loop (12 ticks/sec)
- Set up input event listeners (keyboard, mouse)
- Orchestrate child components
- Platform detection (mobile vs desktop)

### State Management

```typescript
const [gameState, setGameState] = useState(() => createInitialState(params, rng))
const [fps, setFps] = useState(0)
const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false)
const [isInventory, setIsInventory] = useState(false)
```

### Refs

```typescript
const rngRef = useRef(mulberry32(seed ?? Date.now()))
const spaceIsDownRef = useRef(false)
const joystickTouchIdRef = useRef(null)
const joystickCenterRef = useRef(null)
const joystickVectorRef = useRef({ x: 0, y: 0 })
const lastJoystickMoveTickRef = useRef(0)
```

### Tick Loop

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setGameState(prev => logicTick(prev, params, rng))
  }, 1000 / params.GameTickRate)  // 83.33ms
  return () => clearInterval(interval)
}, [params])
```

### Layout Structure

```tsx
<div className="game-root">
  <div className="game-panel">
    {/* Palette cluster */}
    <PaletteCluster ... />
    
    {/* Info button (mobile only) */}
    {isMobileLayout && <button onClick={...}>i</button>}
    
    {/* Desktop controls */}
    {!isMobileLayout && <ControlsDesktop />}
  </div>
  
  {/* Mobile controls popup */}
  {isMobileLayout && isMobileInfoOpen && (
    <ControlsMobile onClose={...} />
  )}
  
  {/* Game field with canvas */}
  <GameField ... />
</div>
```

## PaletteCluster Component

**File**: `src/components/PaletteCluster.tsx`

### Purpose

Display 8-color palette in diamond arrangement with center status indicator.

### Props

```typescript
interface PaletteClusterProps {
  colorPalette: readonly string[]     // 8 colors
  playerBaseColorIndex: number        // 0
  antagonistIndex: number             // 4
  eatenCounts: Record<string, number> // Eaten counters by color hex
  hoverColorIndex: number | null      // Currently hovered color
  capturedCell: boolean               // Is carrying a hex
  chance: number | null               // Capture chance (0-100 or null)
}
```

### Layout

Diamond cluster of 8 hexes around empty center:

```
      [0]
  [6]     [1]
       C       [7]
  [3]     [4]
      [5]
```

**Ring positions** (clockwise from top-left):
- Position 0 (top-left): palette index 7 (pink #FF99FF)
- Position 1 (top-center): palette index 0 (orange #FF8000) protagonist
- Position 2 (top-right): palette index 1 (#CC6600)
- Position 3 (bottom-left): palette index 5 (purple #9933FF)
- Position 4 (bottom-center): palette index 2 (yellow #996600)
- Position 5 (bottom-right): palette index 6 (light purple #CC66FF)
- Position 6 (left): palette index 4 (dark purple #660099) antagonist
- Position 7 (right): palette index 3 (dark yellow #666600)

### Hex Rendering

```tsx
{clusterPositions.slice(1).map((pos, i) => {
  const colorIdx = ringOrder[i]
  const color = colorPalette[colorIdx]
  const cnt = eatenCounts[color] || 0
  const isHover = colorIdx === hoverColorIndex
  
  return (
    <svg width={40} height={40} viewBox="-1 -1 2 2" ...>
      <polygon
        points={/* 6 vertices */}
        fill={color}
        stroke={isHover ? '#FFFFFF' : '#BBBBBB'}
        strokeWidth={0.12}
      />
      {cnt > 0 && (
        <text x={0} y={0.08} fontSize="0.9" fill="#FFFFFF">
          {cnt}
        </text>
      )}
    </svg>
  )
})}
```

### Center Hex (Status)

```tsx
<svg width={40} height={40} viewBox="-1 -1 2 2" ...>
  <text x={0} y={0} fontSize="0.7" fill="#FFFFFF">
    {capturedCell ? 'Kept' : chance !== null && hoverColorIndex !== null ? `${chance}%` : ''}
  </text>
</svg>
```

**Display logic**:
- If carrying: show "Kept"
- Else if hovering colored hex: show capture chance "%"
- Else: empty

### Styling

Flat-top hexes (matches visual design):
- Uniform size: 40px
- Positioned absolutely relative to container
- Centered at 50% with transform translate offset

## ControlsInfoDesktop Component

**File**: `src/components/ControlsInfoDesktop.tsx`

### Purpose

Display control instructions for desktop users.

### Content

```tsx
<div style={{ padding: '6px 10px', color: '#fff', ... }}>
  <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Controls</div>
  <div>Arrows/WASD = move cursor</div>
  <div>Space (hold) = capture hex under cursor</div>
  <div>Space = drop carried hex</div>
  <div>E = eat carried hex (stores in inventory)</div>
  <div>Tab = toggle World ↔ Inventory</div>
  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
    In Inventory: cursor & capture/move work on inventory grid
  </div>
</div>
```

**Placement**: Inside game panel, below palette cluster (desktop only).

## ControlsInfoMobile Component

**File**: `src/components/ControlsInfoMobile.tsx`

### Purpose

Display control instructions for mobile users in popup overlay.

### Props

```typescript
interface Props {
  onClose: () => void
  topOffset?: number  // Default: 64
}
```

### Content

```tsx
<>
  {/* Dark overlay */}
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 }}
    onClick={onClose}
  />
  
  {/* Popup panel */}
  <div style={{ position: 'absolute', right: 8, top: topOffset, zIndex: 1001 }}>
    <div style={{ background: '#2a0845', border: '2px solid #b36bff', ... }}>
      <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 'bold' }}>Controls</div>
      <div>Joystick = move cursor</div>
      <div>CAP = hold to capture hex under cursor</div>
      <div>REL = drop carried hex</div>
      <div>EAT = eat carried hex (stores in inventory)</div>
      <div>INV/WRL = toggle World ↔ Inventory</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>
        In Inventory: cursor & capture/move work on inventory grid
      </div>
    </div>
  </div>
</>
```

**Placement**: Absolute positioned below info button (mobile only).

**Dismissal**: Click overlay or press info button again.

## GameField Component

**File**: `src/components/GameField.tsx`

### Purpose

Render game graphics and mobile touch controls on canvas.

### Props

```typescript
interface GameFieldProps {
  gameState: GameState
  params: Params
  fps: number
  setFps: (fps: number) => void
  joystickVector: { x: number; y: number }
  joystickToAxial: (vx: number, vy: number) => [number, number] | null
  joystickTouchIdRef: React.MutableRefObject<number | null>
  joystickCenterRef: React.MutableRefObject<{ x: number; y: number } | null>
  joystickVectorRef: React.MutableRefObject<{ x: number; y: number }>
  lastJoystickMoveTickRef: React.MutableRefObject<number>
  isInventory: boolean
  onToggleInventory: () => void
  onCapture: () => void
  onRelease: () => void
  onEat: () => void
  onMove: (dq: number, dr: number) => void
  onSetCursor: (q: number, r: number) => void
}
```

### Refs

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null)
const canvasContainerRef = useRef<HTMLDivElement>(null)
const frameCounterRef = useRef({ last: performance.now(), frames: 0 })
const actTouchIdRef = useRef<number | null>(null)
const scaleRef = useRef<number>(1)
const centerXRef = useRef<number>(0)
const centerYRef = useRef<number>(0)
```

### Rendering Loop

```typescript
useEffect(() => {
  let mounted = true
  
  function render() {
    if (!mounted) return
    // Canvas rendering code (see RENDERING.md)
    requestAnimationFrame(render)
  }
  
  const raf = requestAnimationFrame(render)
  return () => {
    mounted = false
    cancelAnimationFrame(raf)
  }
}, [gameState, params, fps, joystickVector, ...])
```

### Touch Event Handlers

Three main handlers:
- `handleTouchStart`: Detect button/joystick touches
- `handleTouchMove`: Update joystick vector
- `handleTouchEnd`: Release buttons, process taps

All registered with `{ passive: false }` to allow `preventDefault()`.

### Canvas Element

```tsx
<div ref={canvasContainerRef} className="game-field">
  <canvas ref={canvasRef} style={{ display: 'block' }} />
</div>
```

Container provides sizing; canvas fills container.

## Layout (CSS)

**File**: `src/components/Game.css`

### Desktop Layout

```css
.game-root {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  background: #370152ff;
}

.game-panel {
  width: 33.33vw;
  min-width: 260px;
  max-width: 480px;
  padding: 18px 20px;
  background: #27013bff;
  border-right: 1px solid #202030;
}

.game-field {
  flex: 1;
  position: relative;
}
```

**Layout**: Side panel (left) + game field (right).

### Mobile Layout

```css
@media (max-width: 900px) {
  .game-root {
    flex-direction: column;
    height: calc(var(--vh, 1vh) * 100);
  }
  
  .game-panel {
    width: 100%;
    min-width: 0;
    max-width: none;
    padding: 12px 16px;
    border-right: none;
    border-bottom: 1px solid #202030;
  }
  
  .game-field {
    flex: 1;
    min-height: 0;
  }
}
```

**Layout**: Top panel + game field (bottom).

**Dynamic height**: Uses CSS variable `--vh` for Safari compatibility.

## Info Button (Mobile Only)

```tsx
{isMobileLayout && (
  <button
    type="button"
    onClick={() => setIsMobileInfoOpen(v => !v)}
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      border: '1px solid #ffffff88',
      background: isMobileInfoOpen ? '#ffffff22' : 'transparent',
      color: '#fff',
      fontSize: 13,
      padding: 0,
      cursor: 'pointer',
    }}
  >
    i
  </button>
)}
```

**Position**: Top-right of game panel.

**Behavior**: Toggle mobile controls popup.

## Color Theme

### Background Colors

- Dark purple: `#370152ff` (main background)
- Darker purple: `#27013bff` (panel background)
- Border: `#202030`

### Color Palette (8 colors)

```javascript
ColorPalette: [
  "#FF8000",  // 0: Orange (player)
  "#CC6600",  // 1: Dark orange
  "#996600",  // 2: Yellow-brown
  "#666600",  // 3: Dark yellow
  "#660099",  // 4: Dark purple (antagonist)
  "#9933FF",  // 5: Purple
  "#CC66FF",  // 6: Light purple
  "#FF99FF",  // 7: Pink
]
```

### UI Accents

- White: `#FFFFFF` (cursor edges, text, outlines)
- Light gray: `#BBBBBB` (palette hex strokes)
- Grid dots: `#635572ff`
- Success flash: `#00BFFF` (bright blue)
- Failure flash: `#FF4444` (bright red)
- Cooldown edge: `#AA0000` (dark red)

## Responsive Breakpoint

**Threshold**: 900px width

```javascript
const isMobileLayout = window.innerWidth <= 900
```

Below 900px:
- Use mobile layout (column)
- Show mobile controls on canvas
- Show info button + popup
- Hide desktop controls

Above 900px:
- Use desktop layout (row)
- Hide mobile controls
- Show desktop controls inline
- Hide info button

## Text Styling

### Palette Cluster Numbers

- Font size: `0.9` (SVG units)
- Color: White
- Position: Centered in hex

### Center Status

- Font size: `0.7` (SVG units)
- Color: White
- Text: "Kept" or "X%"

### Desktop Controls

- Font size: 13px
- Color: White (opacity 0.9)
- Line height: 1.6

### Mobile Controls

- Font size: 13px
- Color: White
- Background: `#2a0845` (dark purple)
- Border: `2px solid #b36bff` (bright purple)

### Mobile Button Labels

- "ACT": 15px sans-serif, black on white hex
- "EAT": 12px sans-serif, black on white hex
- "INV"/"WRL": 12px sans-serif, black on white hex

### FPS Counter

- Font size: 11px
- Color: White (opacity 0.85)
- Position: Bottom center
- Font: sans-serif
