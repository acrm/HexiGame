# Hexi — Hexagonal Color Puzzle Game

A minimalist puzzle game where you navigate a hexagonal grid, capture colored tiles, and arrange them into pleasing spatial patterns.

## About the Game

**Hexi** is a browser-based puzzle game that challenges your strategic thinking and color matching skills. Navigate a beautiful hexagonal grid, capture colored tiles, and plan placements within a focused session.

### Key Features

- 🎨 **Unique Color Mechanics**: Capture tiles based on color distance from your base color, with varying success rates
- 🎲 **Risk & Reward**: Harder-to-capture colors have lower success chances
- ⏱️ **Time Challenge**: 5-minute sessions test your decision-making speed
- 🖼️ **Clean Minimalist Design**: Focus on gameplay without distractions
- 🎮 **Mobile Touch Controls**: Touch-first interface with drag-to-move navigation and context actions on the on-screen control ring
- 🌐 **English & Russian**: Language selector on the start screen — switch instantly without reload
- 💾 **Session Continuity**: Return to an unfinished session or start fresh — the choice is yours

### How to Play

**Mobile (touch)**
1. **Navigate** by touching a reachable hex; you can drag your finger to preview focus and release to commit movement
2. **Use the center action button** (`SPAWN` / `DROP`) to perform the context action on the focused cell
3. **Use the 6-slot ring** around the center button to transfer colors (`EAT` / `PUT` / `SWAP` hints appear by context)
4. **Refine** your layout by moving colors between cells and hotbar slots
5. **Strategy**: Tiles closer to your base color are easier to capture

### Gameplay Mechanics

- **Capture Chance**: Decreases by 20% for each color step away from your base (orange)
- **Movement**: While carrying a tile, you can only move to empty cells
- **Cooldown**: Failed capture attempts trigger a 3-second cooldown

### Perfect For

- Puzzle game enthusiasts
- Fans of hexagonal grid games
- Anyone looking for a quick strategic challenge
- Players who enjoy risk/reward mechanics

## Technical Details

- **Platform**: Mobile web browser (HTML5)
- **Engine**: Built with React + TypeScript + Vite
- **Controls**: Touch only (mobile release)
- **Languages**: English, Russian
- **Requirements**: Modern web browser with JavaScript enabled
- **No Installation Required**: Play directly in your browser

## Development

This game is an indie project focused on exploring hexagonal grid mechanics and color-based puzzle design. Regular updates add new features and refinements based on community feedback.

---

**Current Version**: see build-notes.md  
**Last Updated**: March 2026

*No ads, no in-app purchases, no third-party tracking — just pure puzzle gameplay.*
