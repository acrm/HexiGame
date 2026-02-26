# HexiGame — Game Design Concept

**Document Version:** 1.0  
**Last Updated:** February 20, 2026  
**Target Audience:** Game designers, collaborators, and technical stakeholders

---

## Executive Summary

**HexiGame** (working title: *Hexi*) is a minimalist, single-player puzzle game built around strategic color manipulation on a hexagonal grid. The player guides a turtle protagonist that can collect, carry, and place colored hexagonal tiles to achieve spatial color patterns. The core tension emerges from limited inventory slots and strategic planning of hex placement.

The game emphasizes **thoughtful planning, spatial reasoning, and risk assessment** within a serene, meditative aesthetic. It is designed for short to medium play sessions (5–10 minutes), with potential for open-ended or challenge modes.

---

## Core Pillars

1. **Calm, Meditative Gameplay**  
   No enemies, no time pressure (in sandbox mode), no failure states — just exploration and pattern-building.

2. **Meaningful Choices**  
   Limited inventory forces the player to decide which colors to collect and where to place them for optimal outcomes.

3. **Emergent Complexity**  
   Simple rules (collect, place, reposition) lead to deep strategic possibilities through spatial planning.

4. **Visual Clarity**  
   Clean hex-grid presentation, unambiguous color palette, and minimalist UI keep focus on the puzzle.

---

## High-Level Gameplay Loop

```
Explore Grid → Identify Colored Hex
              ↓
          Collect (Eat) Hex into Hotbar
              ↓
          Navigate to Empty Location
              ↓
          Place Hex from Hotbar
              ↓
        (Repeat, refining spatial patterns)
```

### Meta-Progression (Potential)
- Unlock new palettes or grid sizes
- Challenge modes with specific pattern goals
- Timed or move-limited puzzles

---

## World & Setting

### Environment
- **Hexagonal Grid**: A finite disk of hexagonal cells (default radius: 15 cells).
- **Color Palette**: 8 distinct hues arranged in a cyclical spectrum (e.g., warm oranges → cool purples).
- **Empty Cells**: Traversable spaces where the player can place collected tiles.
- **Colored Cells**: Pre-placed or player-placed tiles that can be collected or repositioned.

### Visual Style
- Flat, pastel color scheme with subtle borders
- Minimal animations (smooth movements, gentle flickers)
- No clutter: all UI elements are contextual and unobtrusive

---

## Player Character: The Turtle Protagonist

### Role
The turtle serves as both the player's avatar and a navigation element:
- **Navigator**: Moves across the grid one hex at a time.
- **Collector**: Can "eat" colored hexes into its hotbar inventory.
- **Explorer**: Guides the player through the hexagonal world.

### Movement Modes
1. **Focus-Based Navigation**  
   - The turtle "faces" a direction; the adjacent hex in that direction is the **focus hex**.
   - Arrow keys move the focus (turtle follows to keep it adjacent).
   - This design makes the target of actions (collect, place) visually clear.

2. **Drag Mode (Mobile/Alternative)**  
   - The turtle and focus move together as a unit.
   - Simplifies touch controls.

3. **Auto-Move**  
   - Click/tap a distant cell; the turtle pathfinds to position itself so the focus lands on the target.

---

## Core Mechanics

### 1. Collecting Hexes (Eat)
- **Action**: Press the context key (Space / ACT button) while the focus is on a **colored hex** in the **world grid**.
- **Effect**: The hex is removed from the world and placed into the **hotbar** (the closest empty slot).
- **Inventory Limit**: The hotbar has **6 slots**. If all slots are occupied, collecting a new hex **swaps** it with the selected hotbar slot (the old hex is placed back into the world at the focus).

### 2. Placing Hexes (Transfer)
- **Action**: Press the context key while the focus is on an **empty hex** in the world and the selected hotbar slot contains a hex.
- **Effect**: The hex from the hotbar is placed into the world at the focus.

### 3. Hotbar Management
- **Selection**: Cycle through hotbar slots (with Q/E keys or UI buttons).
- **Central Slot**: Currently unused; may be reserved for future mechanics (e.g., a "special tile").
- **Visual Feedback**: The selected slot is highlighted.

### 4. Dual Grids: World & Inventory
- **World Grid**: The main play area (finite hex disk).
- **Inventory Grid**: A separate, smaller hex grid accessible via a toggle (Tab key / UI button).
- **Purpose**: Long-term storage for hexes not actively used. Players can transfer hexes between the world, hotbar, and inventory.
- **Current State**: Partially implemented; mechanics under refinement.

---

## Goals & Progression

### Current State
- **Open-Ended**: No hard win/lose; the game is a sandbox focused on experimentation and pattern-building.

### Potential Extensions
- **Tutorial Objectives**: Step-by-step goals that teach movement, collection, and placement.
- **Pattern Challenges**: Curated tasks like "build a line of 3" or "fill a ring" without numeric metrics.
- **Timed Sessions**: Optional time-limited modes focused on completing objectives.

---

## User Interface

### HUD Elements
1. **HexiMap** (World/Inventory Grid): The main canvas showing the hex grid and the turtle.
2. **Hotbar**: 6 slots displayed as a row of small hexes at the bottom center.
3. **Palette Cluster**: A circular arrangement of colored hexes (one per palette color) for palette reference and hover feedback.
4. **Settings Button**: Access controls info, volume, language toggle.
5. **Wiki/HexiPedia Button**: In-game reference for mechanics (under development).

### Control Schemes
- **Desktop**: Temporarily disabled; mobile UI is shown on all devices.
- **Mobile**: Swipe to move focus, tap ACT button, on-screen hotbar selection, tap to toggle grids.

### Accessibility
- High-contrast mode (planned)
- Alternative color palettes for colorblind players (planned)
- Scalable UI elements (responsive to window size)

---

## Tutorial & Onboarding

### Tutorial System
A multi-level guided experience teaching core mechanics step-by-step:
1. **Level 1: Movement**  
   Goal: Visit 3 target cells using the focus.  
   *Teaches: Basic navigation, focus concept.*

2. **Level 2: Collecting** (Placeholder)  
   Goal: Collect your first colored hex into the hotbar.  
   *Teaches: Eat mechanic.*

3. **Level 3: Placing** (Placeholder)  
   Goal: Place a hex from the hotbar into an empty cell.  
   *Teaches: Transfer mechanic.*

4. **Level 4: Building Patterns** (Placeholder)  
   Goal: Create a simple 3-hex pattern (line or triangle).  
   *Teaches: Strategic placement and spatial planning.*

### Tutorial Features
- **Overlay UI**: Semi-transparent guide showing objective, hint, and progress.
- **Target Highlight**: Specific cells are visually marked for the player to visit or manipulate.
- **Progressive Unlock**: Hotbar and inventory are hidden in early levels to reduce cognitive load.
- **Skip Option**: Players can exit the tutorial at any time.

---

## Audio & Aesthetics

### Sound Design
- **Ambient**: Soft, organic background tones (optional).
- **SFX**:
  - Gentle "pop" when collecting a hex.
  - Soft "chime" when placing a hex.
  - Subtle "whoosh" for turtle movement.
- **Volume Control**: Global volume slider in settings.

### Visual Aesthetics
- **Color Palette**: Warm-to-cool gradient (oranges → purples) to visually encode color distance.
- **Animation**: Minimal; turtle and focus move smoothly with ~100ms transitions.
- **Particle Effects**: Optional sparkles or glows when key actions succeed.

---

## Technical Architecture

### Game Loop (Tick-Based)
- **Fixed Logic Tick**: 12 ticks per second (83.33ms per tick).
- **Decoupled Rendering**: Visual frame rate (30/60 FPS) is independent of logic ticks.
- **State Immutability**: All game state updates are pure functions; no side effects in logic layer.

### Key Modules
1. **pureLogic.ts**: Core game rules (movement, collection, placement, inventory management).
2. **Game.tsx**: React root component; event handlers, UI orchestration.
3. **GameField.tsx**: Canvas rendering; input dispatch to logic layer.
4. **tutorialState.ts / tutorialLevels.ts**: Tutorial system state and level definitions.
5. **audioManager.ts**: Sound playback wrapper (HTML5 Audio API).

### Platform
- **Target**: Web browsers (HTML5 canvas, React + TypeScript).
- **Build Tool**: Vite (fast dev server, optimized production builds).
- **Deployment**: Static hosting (Itch.io, GitHub Pages, Yandex Games).

---

## Design Rationale & Challenges

### Why Hexagons?
- **Spatial Richness**: Six neighbors per cell (vs. four in square grids) enable more nuanced adjacency patterns.
- **Visual Appeal**: Hex grids feel organic, reminiscent of honeycombs and natural tessellations.
- **Navigation Simplicity**: Axial coordinates (q, r) cleanly handle movement and distance calculations.

### Why the Turtle?
- **Thematic Fit**: Turtles connote patience, exploration, and gradual progress — aligning with the game's calm tone.
- **Symbolic Element**: The turtle serves as a gentle guide through the hexagonal world.
- **Narrative Potential**: Future updates could explore the turtle's journey or habitat restoration themes.

### Key Design Challenges
1. **Inventory Overload**  
   *Problem*: Managing six hotbar slots + a separate inventory grid can overwhelm new players.  
   *Solution*: Tutorial gradually introduces these systems; inventory can be disabled in early levels.

2. **Feedback Clarity**  
   *Problem*: Goals can feel vague without clear feedback on progress.  
   *Solution*: Real-time visual cues and lightweight objective trackers.

3. **Endgame Definition**  
   *Problem*: Open-ended sandbox can feel aimless without clear goals.  
   *Solution*: Introduce optional time limits, challenge levels, or pattern-completion objectives.

4. **Mobile Controls**  
   *Problem*: Touch input for hex-grid navigation is less precise than keyboard.  
   *Solution*: Auto-move (tap distant cell) + drag mode + enlarged touch targets.

---

## Future Expansion Ideas

### New Mechanics
- **Color Mixing**: Placing adjacent hexes of complementary colors creates a third color.
- **Locked Hexes**: Hexes that require specific conditions to collect.
- **Obstacles**: Non-traversable cells (rocks, water) that constrain movement paths.
- **Power-Ups**: Temporary abilities (double inventory, color wildcard, teleport).

### Content Additions
- **Level Packs**: Curated puzzles with specific pattern goals or move limits.
- **Daily Challenges**: Procedurally generated grids with completion time or objective rankings.
- **Seasonal Palettes**: New color schemes tied to themes (autumn, ocean, neon).

### Multiplayer (Aspirational)
- **Asynchronous**: Share custom puzzles; compete for fastest completion or cleanest layouts.
- **Turn-Based**: Two turtles on the same grid; collaborative pattern-building.

### Narrative Layer (Optional)
- **Story Mode**: The turtle journeys across different biomes (forest, desert, tundra), each with unique palette and mechanics.
- **Environmental Themes**: Restore a corrupted hex-world by placing colors in harmony.

---

## Success Metrics

### Player Engagement
- **Session Length**: Target 5–10 minutes per play session.
- **Retention**: 50%+ return rate within 7 days (for web platforms with analytics).
- **Completion**: 70%+ of players complete at least Tutorial Level 1.

### Quality Indicators
- **Bug Reports**: <5 critical bugs per 1000 plays.
- **Usability Feedback**: 80%+ positive sentiment on controls and clarity.
- **Accessibility**: Support for colorblind modes and keyboard-only navigation.

### Business Goals (If Applicable)
- **Web Traffic**: 10k unique players within 3 months of launch.
- **Platform Integration**: Successful deployment on Itch.io and Yandex Games.
- **Community**: Active Discord or forum with user-created content (e.g., custom level codes).

---

## Competitive Landscape

### Similar Games
- **Dorfromantik** (hex-based tile placement, serene aesthetic)
- **Hoplite** (hex-grid roguelike with strategic movement)
- **Hexcells** (hex-grid logic puzzles)
- **Mini Metro / Mini Motorways** (minimalist puzzle design, calm gameplay)

### Unique Selling Points
1. **Simple Yet Deep**: Straightforward mechanics that enable complex strategic planning.
2. **Inventory Management**: The hotbar + dual-grid system adds a resource-management layer.
3. **Open-Ended Sandbox**: No strict "solve this puzzle" pressure; players define their own goals.

---

## Conclusion

**HexiGame** is a thoughtful, accessible puzzle experience that emphasizes spatial reasoning, strategic resource management, and emergent pattern discovery. Its minimalist presentation and calm pacing position it as a meditative counterpoint to action-heavy games, while its hex-grid mechanics offer depth for players seeking optimization challenges.

The modular technical architecture and clear separation of logic/rendering ensure the game can scale with new mechanics, content, and platforms. Tutorial scaffolding and accessibility features lower the barrier to entry, while objectives provide direction without relying on numeric totals.

This document serves as the foundational design reference for ongoing development, ensuring all contributors share a unified vision of HexiGame's core identity and long-term potential.

---

**Document Prepared By:** AI Game Design Agent  
**For Discussion With:** Game designers, developers, and stakeholders  
**Next Steps:** Review, iterate on objective design, refine tutorial flow, plan Level 2–4 implementations.
