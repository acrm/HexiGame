# Migration Documentation

This directory contains comprehensive documentation of HexiGame's current functionality (version 25w48-0.47), created to guide migration to a new codebase.

## Purpose

These documents describe **every aspect** of the current implementation that must be reproduced after migration. They serve as:

- Complete specification of game mechanics
- Reference for implementation details
- Validation checklist for migration completion
- Historical record of functionality at migration point

## Document Index

### Getting Started

- **[00-OVERVIEW.md](00-OVERVIEW.md)** — Start here for high-level introduction, technology stack, and architecture overview

### Core Game Systems

- **[01-GAME-MECHANICS.md](01-GAME-MECHANICS.md)** — Game modes, capture probability, timing, and core gameplay loop
- **[02-GRID-AND-COORDINATES.md](02-GRID-AND-COORDINATES.md)** — Hexagonal grid, axial coordinates, pixel conversion, and spatial operations
- **[03-STATE-MANAGEMENT.md](03-STATE-MANAGEMENT.md)** — GameState structure, immutable updates, tick lifecycle, and derived values
- **[04-MOVEMENT-SYSTEM.md](04-MOVEMENT-SYSTEM.md)** — Cursor, protagonist, action mode, release movement, and pathfinding
- **[05-CAPTURE-SYSTEM.md](05-CAPTURE-SYSTEM.md)** — Capture flow, probability formula, charge mechanism, and success/failure outcomes
- **[06-CARRY-RELEASE-SYSTEM.md](06-CARRY-RELEASE-SYSTEM.md)** — Carrying state, release mechanism, eat action, and turtle-hex spatial relationship
- **[07-INVENTORY-SYSTEM.md](07-INVENTORY-SYSTEM.md)** — Inventory grid, toggle mechanism, random placement, and eaten counters

### Rendering & UI

- **[08-RENDERING.md](08-RENDERING.md)** — Canvas rendering, hex drawing, cursor states, turtle visuals, and rendering loop
- **[09-INPUT-HANDLING.md](09-INPUT-HANDLING.md)** — Keyboard, mouse, touch events, platform detection, and input throttling
- **[10-UI-COMPONENTS.md](10-UI-COMPONENTS.md)** — React components, layout, responsive design, and styling
- **[11-MOBILE-CONTROLS.md](11-MOBILE-CONTROLS.md)** — Virtual joystick, touch buttons, multi-touch, and mobile-specific features

### Configuration & Build

- **[12-PARAMETERS.md](12-PARAMETERS.md)** — All tunable parameters, defaults, formulas, and customization
- **[13-BUILD-SYSTEM.md](13-BUILD-SYSTEM.md)** — Vite, TypeScript, versioning scheme, and build workflow

### Migration Guide

- **[14-CHECKLIST.md](14-CHECKLIST.md)** — Complete implementation checklist with validation criteria

## How to Use This Documentation

### For Migration

1. **Read** [00-OVERVIEW.md](00-OVERVIEW.md) for context
2. **Review** documents 01-13 for each subsystem
3. **Follow** [14-CHECKLIST.md](14-CHECKLIST.md) step-by-step
4. **Validate** each section against original before proceeding
5. **Compare** screenshots and behavior with original

### As Reference

- **Search** for specific features using file names (e.g., "capture" → 05-CAPTURE-SYSTEM.md)
- **Look up** parameters in [12-PARAMETERS.md](12-PARAMETERS.md)
- **Find** input mappings in [09-INPUT-HANDLING.md](09-INPUT-HANDLING.md)
- **Check** state fields in [03-STATE-MANAGEMENT.md](03-STATE-MANAGEMENT.md)

### For Understanding

Documents explain **why** as well as **what**:
- Design decisions and tradeoffs
- Edge cases and their handling
- Performance considerations
- Platform-specific behaviors

## Document Structure

Each document follows this pattern:

1. **Overview** — High-level summary
2. **Core Concepts** — Fundamental ideas and structures
3. **Implementation Details** — Code-level specifics
4. **Examples** — Concrete use cases with code
5. **Edge Cases** — Special situations and handling
6. **Validation** — How to verify correct implementation

## Key Features Documented

### Game Mechanics
✅ Tick-based game loop (12 ticks/second)  
✅ Probabilistic capture system  
✅ Action mode proximity-based movement  
✅ Carry and release mechanics  
✅ Inventory system with random placement  
✅ Cooldown system  

### Grid & Spatial
✅ Axial coordinate hex grid  
✅ Pointy-top orientation  
✅ Disk-shaped play area (radius 5)  
✅ Pixel ↔ axial conversion  
✅ Pathfinding and distance metrics  

### Visual
✅ Canvas-based rendering  
✅ Auto-scaling to viewport  
✅ Cursor state indicators (6 modes)  
✅ Turtle protagonist visualization  
✅ Grid corner dots  
✅ Inventory background tint  

### Input
✅ Keyboard (arrow keys, WASD, Space, E, Tab)  
✅ Mouse (click to focus)  
✅ Touch (virtual joystick, buttons)  
✅ Multi-touch support  
✅ Platform detection  

### UI
✅ Responsive layout (desktop/mobile)  
✅ Palette cluster display  
✅ Control instructions  
✅ Mobile popup overlay  
✅ FPS counter  

## Completeness Guarantee

These documents describe **100% of current functionality**:

- ✅ Every game mechanic
- ✅ Every visual element
- ✅ Every input method
- ✅ Every UI component
- ✅ Every parameter
- ✅ Every edge case we know about

If something exists in the current build, it's documented here.

## Version Information

**Documentation Created For**: Version 25w48-0.47  
**Documentation Date**: 2025-12-13  
**Source Code Location**: `src/` directory at time of documentation  

## Maintenance

These docs are a **snapshot** of functionality at migration time. They should:

- ❌ **Not** be updated with new features (create new docs for post-migration changes)
- ✅ **Can** be corrected if errors found in migration docs themselves
- ✅ **Should** remain alongside new codebase as historical reference

## Related Documentation

Other docs in main `docs/` directory:

- `GAME_LOGIC.md` — Original pure logic specification (theoretical)
- `Scoring.md` — Adjacency metric implementation (current)
- `../build-notes.md` — Version history with change log
- `../AI_AGENT_INSTRUCTIONS.md` — Development workflow and versioning

## Questions?

If migration docs are unclear:

1. Check related docs (cross-referenced in each file)
2. Examine original source code in `src/`
3. Test behavior in original build
4. Add clarification to migration docs for future reference

## Success Metric

Migration is successful when:

> A developer unfamiliar with the original codebase can recreate HexiGame's complete functionality using only these documents, without needing to reference the original source code.

## Contributing to Migration Docs

If you find issues while migrating:

- Ambiguous descriptions → Add clarification
- Missing edge cases → Document them
- Incorrect specifications → Correct with reference to original
- Additional examples needed → Add them

Update these docs so the next migration (if any) is even smoother.

---

**Note**: All code examples in these docs use English comments and identifiers, following the project's language policy (English in files, Russian in chat).
