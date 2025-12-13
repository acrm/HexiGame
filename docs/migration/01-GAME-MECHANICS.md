# Game Mechanics

## Core Gameplay Loop

1. **Navigate** the cursor around the hex grid using keyboard/joystick
2. **Capture** colored hexes using action mode (hold Space/ACT button)
3. **Transport** captured hexes by moving the turtle
4. **Release** hexes at target locations
5. **Eat** hexes to store them in inventory (E key or EAT button)
6. **Manage** inventory by toggling between world and inventory grids

## Game Modes

### Free Mode (Default)
- Cursor moves freely across the grid
- Turtle protagonist stays near cursor (follower behavior)
- Can initiate capture on colored hexes
- Single rotating edge on cursor hex

### Action Mode (Space/ACT Held)
- Activated by holding Space key (desktop) or ACT button (mobile)
- Gated by cooldown timer (cannot activate during 6-tick cooldown)
- Turtle actively moves toward cursor position
- Turtle stops when adjacent to cursor (never enters cursor cell)
- When adjacent to cursor:
  - **If cursor on colored hex and not carrying**: initiates capture charge
  - **If carrying and cursor on empty hex**: initiates release sequence
- Cursor shows two rotating opposite edges (one step per tick)
- Released when Space/ACT released

### Charging Mode (During Action Mode)
- Triggered automatically when turtle reaches adjacency to cursor over colored hex
- Duration: 6 ticks (0.5 seconds) in world, 1 tick instant in inventory
- Visual: cursor edges fill sequentially (1 edge per tick progress)
- Must complete full duration for capture attempt
- Releasing action before completion cancels charge
- Turtle continues moving toward cursor during charge if not yet adjacent

### Carrying Mode
- Active when holding a captured hex
- Carried hex stays on grid with white outline
- Turtle moves slower (1 cell per 4 ticks when actively moving)
- During action mode: can initiate release by moving cursor to empty cell

### Release Mode
- Activated when action mode held, carrying, and cursor over empty adjacent cell
- Turtle moves toward cursor carrying the hex in front of it
- Head cell (position in front of turtle's head) carries the color
- Movement speed: 1 cell per 4 ticks
- Turtle avoids stepping into the hex it's carrying
- When head cell reaches cursor position: hex is dropped, release ends
- Releasing action (Space/ACT up) stops further movement immediately
- After completion: 6-tick cooldown begins

### Cooldown Mode
- Duration: varies based on event
  - After failed capture: 12 ticks (CaptureFailureCooldownTicks)
  - After successful drop/release: 6 ticks
- Blocks new action mode activation
- Visual: single rotating red edge on cursor hex
- Can still move cursor and protagonist normally

### Inventory Mode (Tab Toggle)
- Switch active field from world to inventory grid
- Inventory grid is same shape as world (radius 5, all empty initially)
- Cursor and capture mechanics work on inventory grid
- Capture in inventory is instant (1 tick) with 100% success rate
- Cannot eat hexes while in inventory mode
- Toggle back to world mode with Tab/INV-WRL button

## Capture Probability System

### Base Mechanic
- Probability based on color distance in palette
- Player base color: index 0 (orange #FF8000)
- Antagonist color: index 4 (dark purple #660099)

### Probability Formula
```
paletteDistance = circular distance from playerBaseColorIndex
maxDistance = floor(paletteLength / 2) = 4 for 8-color palette
chance = ((maxDistance - distance) / maxDistance) * 100%
chance = max(10%, min(100%, chance))
```

### Concrete Probabilities (8-color palette)
- Distance 0 (own color #FF8000): 100%
- Distance 1 (#CC6600 or #FF99FF): ~75%
- Distance 2 (#996600 or #CC66FF): ~50%
- Distance 3 (#666600 or #9933FF): ~25%
- Distance 4 (#660099, antagonist): 0% (clamped to minimum 10% in code)

### Capture Attempt
1. Roll random value 0-100
2. If roll < chance: success
   - Captured hex is marked (white outline)
   - Success flash shown (brief)
   - Enter carrying mode
3. If roll >= chance: failure
   - No hex captured
   - Failure flash shown (brief red edges)
   - Enter cooldown (12 ticks)

### Capture Requirements
- Must be in action mode
- Turtle must be adjacent to cursor
- Cursor must be over colored hex
- Not already carrying a hex
- Not in cooldown period
- Must hold action for full charge duration (6 ticks)

## Eating Mechanic

### World Eating (E Key or EAT Button)
- Only available when carrying a hex in world mode
- Removes color from world grid
- Places hex in random empty inventory cell
- Increments eaten counter for that color
- Shows count in palette cluster display
- Clears carried state
- No cooldown applied

### Inventory Mode
- Cannot eat while in inventory mode
- Can only capture/move hexes within inventory

## Movement Constraints

### Free Cursor Movement
- Cursor can move to any cell within grid radius
- Must be one of six adjacent hexes (axial directions)
- No restriction based on cell content
- Throttled in some modes (action mode when carrying: 1 move per 4 ticks)

### Turtle Movement
- **Normal following**: stays adjacent to cursor when possible
- **Action mode**: actively approaches cursor, stops when adjacent
  - Speed: 1 cell per 2 ticks
  - Never enters cursor cell
  - Never enters carried hex cell
  - Chooses direction minimizing distance to cursor
- **Carrying during release**: 1 cell per 4 ticks
  - Moves toward cursor
  - Carried hex moves as head cell (in front of turtle)
  - Stops when head cell reaches cursor

### Carried Hex Constraints
- Stays on grid as regular hex with white outline
- Moved by turtle during release mode
- Turtle and carried hex maintain adjacency
- Turtle cannot occupy same cell as carried hex

## Timing & Tick System

### Logical Tick Rate
- Fixed rate: 12 ticks per second
- Independent of rendering frame rate
- All durations expressed in ticks

### Key Durations
- Capture charge: 6 ticks (0.5s)
- Capture cooldown: 12 ticks (1.0s)  
- Drop cooldown: 6 ticks (0.5s)
- Flash feedback: 2 ticks (~0.167s)
- Flicker cycle: 6 ticks (0.5s)
- Action mode movement: 1 cell per 2 ticks
- Carrying movement: 1 cell per 4 ticks
- Cursor joystick throttle: 1 move per 6 ticks

### Timer
- Initial value: 300 seconds (5 minutes)
- Counts down at 1 second per 12 ticks
- Purely informational (no enforcement)
- Stops at 0 but game continues

## Grid State Evolution

### Initial State
- Grid cells randomly colored with probability 0.30 (30%)
- Colors chosen uniformly from 8-color palette
- Inventory grid starts completely empty
- Cursor and protagonist start at origin (0, 0)

### State Transitions
- Cells can be: empty (null) or colored (0-7 index)
- Capture doesn't remove color (hex stays until dropped elsewhere or eaten)
- Eating removes color from cell permanently
- Releasing moves color from carried cell to cursor cell
- No color generation during gameplay (only initial)

## Adjacency Metric (Scoring)

### Current Implementation
For each color, count cells that have at least one same-color neighbor.

```
for each colored cell C:
  if any of C's 6 neighbors has the same color:
    increment count for that color
```

### Display
- Shown as numbers inside palette cluster hexes
- Only displayed when count > 0
- No gameplay effect (informational only)

## Protagonist & Cursor Relationship

### Cursor
- Direct player control via input
- Visual indicator on grid (rotating edges)
- Shows charge progress, action mode, cooldown states
- Can be anywhere on grid

### Protagonist (Turtle)
- Visual representation of player position
- Follows cursor in free mode
- Actively approaches cursor in action mode
- Renders with head facing cursor
- Never overlaps with captured hex
- Determines capture/release eligibility (must be adjacent to cursor)

## Failure Conditions

### Capture Failure
- Probability roll fails (see formula above)
- Turtle doesn't reach adjacency before charge ends (action mode only)
- Results: failure flash, 12-tick cooldown, no hex captured

### Movement Blocking
- None currently (cursor can always move to valid adjacent hexes)
- Turtle pathfinding always finds valid adjacent cell (doesn't enter cursor or carried hex)

## Success Feedback

### Visual
- White outline on captured hex (permanent while carrying)
- Brief success flash (2 ticks, not currently shown as overlay)
- Cursor edge indicators change based on mode

### State Changes
- capturedCell set to hex position
- Turtle maintains adjacency to captured hex
- Can move/release/eat the captured hex
