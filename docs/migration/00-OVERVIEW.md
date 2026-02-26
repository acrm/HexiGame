# HexiGame Migration Overview

## Document Purpose

This migration documentation set describes the **complete current functionality** of HexiGame as of version 25w48-0.47. All features, mechanics, visual behaviors, and interactions documented here must be reproduced in the new codebase after migration.

## Application Summary

HexiGame is a hex-grid puzzle game built with React and TypeScript. The player controls a turtle protagonist that navigates a hexagonal grid world, capturing colored hexes through a probabilistic mechanic, transporting them, and storing them in an inventory.

## Core Technology Stack

- **Framework**: React 18.3.1
- **Language**: TypeScript 5.4.0
- **Build Tool**: Vite 5.0.0
- **Rendering**: HTML5 Canvas (2D context)
- **State Management**: React hooks (useState, useRef, useEffect)

## Architecture Overview

The application follows a clean separation of concerns:

1. **Pure Game Logic** (`src/logic/pureLogic.ts`)
   - Tick-based game state updates (12 ticks/second)
   - Immutable state transformations
   - No DOM/Canvas dependencies
   - Functional, testable design

2. **React Components** (`src/components/`)
   - `Game.tsx`: Main game container, input handling, state orchestration
   - `GameField.tsx`: Canvas rendering and touch controls
   - `PaletteCluster.tsx`: Color palette display with eaten counts
   - `ControlsInfoDesktop.tsx`: Desktop control instructions
   - `ControlsInfoMobile.tsx`: Mobile control instructions overlay

3. **Entry Point** (`src/index.tsx`)
   - React root initialization
   - Dynamic viewport height handling for mobile
   - Version display in title

## Key Game Systems

1. **Hex Grid System**
   - Axial coordinate system
   - Configurable radius (default: 5)
   - Random initial color distribution

2. **Movement System**
   - Cursor-based navigation
   - Turtle protagonist follower
   - Action mode proximity-based movement

3. **Capture Mechanic**
   - Hold-to-charge interaction
   - Distance-based probability
   - Success/failure feedback
   - Cooldown system

4. **Carry & Release System**
   - Single hex transport
   - Movement constraints (empty cells only)
   - Proximity-based release targeting

5. **Inventory System**
   - Separate grid space (same dimensions as world)
   - Toggle between world and inventory
   - Random placement when eating hexes
   - Instant 100% capture in inventory

6. **Visual System**
   - Tick-based animations
   - Cursor state indicators (rotating edges, charging progress)
   - Turtle rendering with head orientation
   - Flash feedback on capture attempts
   - Mobile virtual controls overlay

7. **Dual Platform Support**
   - Desktop: keyboard controls, mouse click focus
   - Mobile: virtual joystick, touch buttons, tap-to-focus

## Documentation Structure

- `00-OVERVIEW.md` — This file, high-level introduction
- `01-GAME-MECHANICS.md` — Core gameplay systems and rules
- `02-GRID-AND-COORDINATES.md` — Hex grid implementation details
- `03-STATE-MANAGEMENT.md` — Game state structure and lifecycle
- `04-MOVEMENT-SYSTEM.md` — Cursor, protagonist, and action mode movement
- `05-CAPTURE-SYSTEM.md` — Capture mechanic implementation
- `06-CARRY-RELEASE-SYSTEM.md` — Hex transport mechanics
- `07-INVENTORY-SYSTEM.md` — Inventory grid and eating mechanics
- `08-RENDERING.md` — Canvas rendering and visual effects
- `09-INPUT-HANDLING.md` — Keyboard, mouse, and touch input
- `10-UI-COMPONENTS.md` — React components and HUD elements
- `11-MOBILE-CONTROLS.md` — Touch controls and mobile-specific features
- `12-PARAMETERS.md` — Configuration and tunable values
- `13-BUILD-SYSTEM.md` — Versioning, build, and deployment
- `14-CHECKLIST.md` — Migration implementation checklist

## Version Information

**Current Version**: 25w48-0.47

**Versioning Scheme**: Weekly snapshots (Minecraft-style)
- Format: `<weekCode>-<minor>.<build>`
- Example: `25w48-0.47` = Week 48 of 2025, minor 0, build 47

## Non-Functional Requirements

### Performance
- 60 FPS target rendering
- 12 ticks/second logical update rate
- Responsive on mobile devices
- Canvas auto-scaling to viewport

### Accessibility
- Touch-friendly button sizes (30-40px radius)
- High contrast colors for visibility
- Clear visual feedback for all actions
- Platform-appropriate controls

### Responsive Design
- Desktop layout: side panel + canvas field (landscape)
- Mobile layout: top panel + canvas field (portrait/square)
- Dynamic viewport height handling (`--vh` CSS variable)
- Auto-hide/show appropriate controls

## Migration Checklist

When reproducing this application:

- [ ] All game mechanics function identically
- [ ] Visual appearance matches current implementation
- [ ] Input handling works on both desktop and mobile
- [ ] State management preserves all current fields
- [ ] Tick-based timing matches (12 ticks/sec)
- [ ] Canvas rendering reproduces all visual elements
- [ ] Mobile controls layout and behavior identical
- [ ] Inventory system fully functional
- [ ] Parameter configuration preserved
- [ ] Build and versioning system operational

## Known Limitations & Future Features

### Not Yet Implemented
- Scoring system (beyond simple eaten counters)
- Delivery targets/goals
- Progression system
- End conditions beyond timer
- Audio/sound effects
- Persistence/save system
- Multiplayer support

### Current Simplifications
- Single-color carry (no multi-hex transport)
- No obstacles beyond occupied cells
- No AI opponents
- Timer is informational only (no forced end)

## References

See existing documentation:
- `docs/GAME_LOGIC.md` — Original pure logic specification
- `docs/Scoring.md` — Adjacency metric (current implementation)
- `build-notes.md` — Version history with change descriptions
- `AI_AGENT_INSTRUCTIONS.md` — Development workflow and versioning
