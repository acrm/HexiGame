# Migration Checklist and Implementation Guide

## Purpose

This document provides a structured checklist for reproducing HexiGame functionality in a new codebase after migration.

## Pre-Migration Preparation

- [ ] Read all migration documentation files (00-13)
- [ ] Review original source code in `src/` directory
- [ ] Examine existing documentation (`docs/GAME_LOGIC.md`, `docs/Scoring.md`)
- [ ] Note current version: 25w48-0.47
- [ ] Understand technology stack: React 18.3, TypeScript 5.4, Vite 5.0

## Core Systems Implementation

### 1. Grid System
**Reference**: `02-GRID-AND-COORDINATES.md`

- [ ] Implement axial coordinate system (q, r)
- [ ] Create hex disk generation (radius 5, 91 cells)
- [ ] Implement axial-to-pixel conversion (pointy-top orientation)
- [ ] Implement pixel-to-axial conversion (for clicks/taps)
- [ ] Create neighbor lookup (6 directions)
- [ ] Implement distance calculation
- [ ] Test grid bounds checking

**Validation**:
- Grid has exactly 91 cells at radius 5
- Origin (0,0) is center
- All 6 neighbors correctly calculated
- Click-to-hex conversion accurate

### 2. State Management
**Reference**: `03-STATE-MANAGEMENT.md`

- [ ] Define GameState interface (all fields from docs)
- [ ] Define Cell, Axial, Grid, FlashState types
- [ ] Implement createInitialState function
- [ ] Ensure immutable state updates
- [ ] Create tick update function (12 ticks/sec)
- [ ] Implement derived state calculations (hovered cell, capture chance)
- [ ] Add state validation invariants

**Validation**:
- State updates never mutate
- Tick loop runs at 12 Hz
- All invariants enforced

### 3. Movement System
**Reference**: `04-MOVEMENT-SYSTEM.md`

- [ ] Implement cursor movement (6 directions)
- [ ] Implement action mode activation/deactivation
- [ ] Implement protagonist movement during action mode (1 cell/2 ticks)
- [ ] Implement protagonist movement during charge
- [ ] Implement release movement (1 cell/4 ticks)
- [ ] Implement head cell calculation
- [ ] Implement movement throttling (when carrying)
- [ ] Implement facing direction tracking

**Validation**:
- Cursor moves to adjacent hexes only
- Protagonist approaches cursor correctly
- Turtle never enters cursor or carried hex cell
- Movement speeds match specifications

### 4. Capture System
**Reference**: `05-CAPTURE-SYSTEM.md`

- [ ] Implement action mode gating (cooldown check)
- [ ] Implement charge initiation (automatic when adjacent)
- [ ] Implement charge duration (6 ticks world, 1 tick inventory)
- [ ] Implement charge cancellation (early release)
- [ ] Implement auto-completion (charge duration reached)
- [ ] Implement probability formula (palette distance-based)
- [ ] Implement capture attempt (random roll)
- [ ] Implement success outcome (set capturedCell, flash)
- [ ] Implement failure outcome (cooldown, flash)
- [ ] Implement chance preview calculation

**Validation**:
- Capture probabilities match formula (100% at distance 0, 10% at distance 4)
- Charge requires full 6 ticks in world mode
- Cooldown blocks action mode for 12 ticks
- Success sets capturedCell correctly

### 5. Carry & Release System
**Reference**: `06-CARRY-RELEASE-SYSTEM.md`

- [ ] Implement carrying state (white outline on hex)
- [ ] Implement protagonist-captured adjacency enforcement
- [ ] Implement release initiation (adjacent + empty cursor)
- [ ] Implement release movement (turtle + hex advance)
- [ ] Implement release completion (head cell reaches cursor)
- [ ] Implement release abort (action mode ends)
- [ ] Implement eat mechanic (remove from world, add to inventory)
- [ ] Implement palette counters increment

**Validation**:
- Carried hex shows white outline
- Turtle never overlaps carried hex
- Release moves both turtle and hex
- Eat correctly updates inventory and counters

### 6. Inventory System
**Reference**: `07-INVENTORY-SYSTEM.md`

- [ ] Create separate inventory grid (same dimensions as world)
- [ ] Implement toggle between world/inventory (Tab key)
- [ ] Implement inventory capture (instant, 100% success)
- [ ] Implement random placement when eating
- [ ] Implement inventory background tint
- [ ] Disable eat button in inventory mode
- [ ] Disable release in inventory mode

**Validation**:
- Inventory has 91 cells (all empty initially)
- Toggle switches active field correctly
- Inventory capture is instant and always succeeds
- Eaten hexes appear in random empty inventory cells

## Rendering Implementation

### 7. Canvas Rendering
**Reference**: `08-RENDERING.md`

- [ ] Set up canvas auto-scaling to container
- [ ] Implement hex drawing function (pointy-top)
- [ ] Implement grid hex rendering (colored + empty)
- [ ] Implement grid corner dots (empty cell visualization)
- [ ] Implement cursor edge highlighting (6 states)
- [ ] Implement turtle rendering (flower with 6 petals)
- [ ] Implement turtle head selection (toward cursor)
- [ ] Implement turtle eyes (perpendicular to head)
- [ ] Implement inventory background tint
- [ ] Implement FPS counter
- [ ] Set up requestAnimationFrame loop

**Validation**:
- Grid renders centered and scaled
- All cursor states render correctly
- Turtle faces cursor with head petal
- 60 FPS maintained

### 8. Cursor Visual States
**Reference**: `08-RENDERING.md`, section on cursor states

- [ ] Default: single rotating edge (500ms period)
- [ ] Cooldown: single rotating red edge
- [ ] Action mode: two opposite edges (1 tick rotation)
- [ ] Charging: sequential edge fill (progress indicator)
- [ ] Releasing: single rotating edge
- [ ] Inventory: same logic as world

**Validation**:
- Each state visually distinct
- Rotation periods correct
- Charge progress visible

## Input Handling Implementation

### 9. Desktop Input
**Reference**: `09-INPUT-HANDLING.md`

- [ ] Implement keyboard handlers (keydown/keyup)
- [ ] Map arrow keys + WASD to movement
- [ ] Implement Space hold/release (action mode)
- [ ] Implement E key (eat)
- [ ] Implement Tab key (inventory toggle)
- [ ] Implement mouse click (cursor focus)
- [ ] Add key repeat blocking for Space

**Validation**:
- All keys respond correctly
- Space hold activates action mode
- Click moves cursor to hex

### 10. Mobile Input
**Reference**: `09-INPUT-HANDLING.md`, `11-MOBILE-CONTROLS.md`

- [ ] Implement virtual joystick (40px outer, 18px knob)
- [ ] Implement joystick direction mapping (6 sectors)
- [ ] Implement joystick throttling (6 ticks)
- [ ] Implement ACT button (30px hex, hold behavior)
- [ ] Implement EAT button (24px hex, conditional visibility)
- [ ] Implement INV/WRL button (24px hex, toggle)
- [ ] Implement tap-to-focus (grid taps)
- [ ] Handle multi-touch (separate touch IDs)
- [ ] Render mobile controls on canvas

**Validation**:
- Joystick moves cursor in correct directions
- ACT button hold/release works correctly
- Buttons meet 44px minimum touch target size
- Multi-touch doesn't interfere

## UI Components Implementation

### 11. React Components
**Reference**: `10-UI-COMPONENTS.md`

- [ ] Create Game component (main container)
- [ ] Create GameField component (canvas + touch)
- [ ] Create PaletteCluster component (8-hex diamond)
- [ ] Create ControlsInfoDesktop component
- [ ] Create ControlsInfoMobile component (popup)
- [ ] Implement responsive layout (900px breakpoint)
- [ ] Implement platform detection
- [ ] Implement info button (mobile)
- [ ] Style with Game.css

**Validation**:
- Desktop layout: side panel + canvas
- Mobile layout: top panel + canvas
- Controls info shows correctly per platform
- Palette cluster displays eaten counters

### 12. Parameters System
**Reference**: `12-PARAMETERS.md`

- [ ] Define Params interface (all 14 parameters)
- [ ] Create DefaultParams constant
- [ ] Implement parameter merging (overrides)
- [ ] Pass params through component tree
- [ ] Use params in logic functions
- [ ] Test parameter customization

**Validation**:
- All 14 default parameters present
- Custom params override defaults correctly
- Changing params affects gameplay

## Build System Implementation

### 13. Build Configuration
**Reference**: `13-BUILD-SYSTEM.md`

- [ ] Set up Vite 5.0 configuration
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up React plugin
- [ ] Configure version injection (import.meta.env.APP_VERSION)
- [ ] Create version.json file
- [ ] Implement version bump script
- [ ] Set up build-notes.md
- [ ] Configure package.json scripts (dev, build, preview, typecheck)

**Validation**:
- `npm run dev` starts dev server
- `npm run build` creates production bundle
- Version appears in title bar
- Bump script updates version correctly

## Testing & Validation

### Functional Testing

- [ ] **Grid**: Click every cell, verify cursor moves
- [ ] **Movement**: Test all 6 directions (keyboard + joystick)
- [ ] **Capture**: Attempt capture on all 8 colors, verify probabilities
- [ ] **Carry**: Pick up hex, verify white outline
- [ ] **Release**: Carry hex to empty cell, verify drop
- [ ] **Eat**: Eat hex, verify appears in inventory
- [ ] **Inventory**: Toggle to inventory, capture hex, toggle back
- [ ] **Cooldown**: Fail capture, verify 12-tick cooldown
- [ ] **Action Mode**: Hold Space, verify turtle approaches cursor

### Platform Testing

- [ ] **Desktop**: Test on Chrome, Firefox, Safari
- [ ] **Mobile**: Test on iOS Safari, Android Chrome
- [ ] **Tablet**: Test on iPad
- [ ] **Responsive**: Test at various screen sizes around 900px breakpoint

### Performance Testing

- [ ] Verify 60 FPS on desktop
- [ ] Verify 60 FPS on mobile
- [ ] Verify 12 ticks/sec (check with debug logs)
- [ ] Test with full inventory (91 hexes)
- [ ] Test rapid input (keyboard spam, joystick wiggle)

## Visual Verification

### Screenshots Checklist

Take screenshots to compare with original:

- [ ] Initial grid (world mode)
- [ ] Cursor on colored hex (chance display)
- [ ] Cursor during action mode (two edges)
- [ ] Cursor during charge (sequential edges)
- [ ] Cursor during cooldown (red edge)
- [ ] Carried hex (white outline)
- [ ] Turtle rendering (head facing cursor)
- [ ] Inventory mode (background tint)
- [ ] Palette cluster (with eaten counters)
- [ ] Mobile controls (joystick, buttons)
- [ ] Desktop layout (side panel)
- [ ] Mobile layout (top panel)

## Edge Cases & Bug Prevention

Test these scenarios:

- [ ] Capture at grid edge (protagonist pathfinding)
- [ ] Carry to grid edge (release movement)
- [ ] Toggle inventory while carrying
- [ ] Rapid Space press (charge cancellation)
- [ ] Joystick in dead zone (no movement)
- [ ] Multi-touch: joystick + ACT simultaneously
- [ ] Eat when inventory full (hex lost gracefully)
- [ ] Click outside grid (no crash)
- [ ] Resize window during gameplay
- [ ] Mobile orientation change

## Code Quality Checks

- [ ] TypeScript strict mode enabled, no errors
- [ ] No console errors in browser
- [ ] No memory leaks (long gameplay sessions)
- [ ] Immutable state updates (no mutations)
- [ ] All event listeners cleaned up (useEffect returns)
- [ ] Canvas refs not null before use
- [ ] Touch events prevent default (no scroll)

## Documentation Verification

- [ ] All 14 doc files present in docs/migration/
- [ ] README explains migration docs purpose
- [ ] Code comments match English-only policy
- [ ] Build notes updated with version

## Final Checklist

- [ ] All core systems implemented
- [ ] All rendering implemented
- [ ] All input handling implemented
- [ ] All UI components implemented
- [ ] All parameters configurable
- [ ] Build system operational
- [ ] All tests passing
- [ ] Visual comparison matches original
- [ ] Performance targets met
- [ ] No critical bugs
- [ ] Documentation complete

## Success Criteria

Migration is complete when:

1. ✅ All functionality from `docs/migration/` reproduced
2. ✅ Visual appearance matches original
3. ✅ Input handling identical on desktop and mobile
4. ✅ 60 FPS rendering maintained
5. ✅ 12 ticks/sec logic loop stable
6. ✅ No TypeScript errors
7. ✅ No console errors
8. ✅ Build system operational
9. ✅ All edge cases handled
10. ✅ Cross-platform compatibility verified

## Post-Migration Tasks

After successful migration:

- [ ] Archive original codebase
- [ ] Update main README with new setup instructions
- [ ] Tag release with migration version
- [ ] Test on production environment
- [ ] Monitor for issues in first week
- [ ] Plan next features from backlog

## Reference

See individual numbered docs for detailed specifications:

- 00-OVERVIEW.md — High-level introduction
- 01-GAME-MECHANICS.md — Core gameplay systems
- 02-GRID-AND-COORDINATES.md — Hex grid implementation
- 03-STATE-MANAGEMENT.md — Game state structure
- 04-MOVEMENT-SYSTEM.md — Movement mechanics
- 05-CAPTURE-SYSTEM.md — Capture mechanics
- 06-CARRY-RELEASE-SYSTEM.md — Carry and release
- 07-INVENTORY-SYSTEM.md — Inventory mechanics
- 08-RENDERING.md — Canvas rendering
- 09-INPUT-HANDLING.md — Keyboard/mouse/touch
- 10-UI-COMPONENTS.md — React components
- 11-MOBILE-CONTROLS.md — Mobile touch controls
- 12-PARAMETERS.md — Configuration
- 13-BUILD-SYSTEM.md — Build and versioning
- 14-CHECKLIST.md — This file
