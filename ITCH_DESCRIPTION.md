# Hexi — Hexagonal Color Puzzle Game

A minimalist puzzle game where you navigate a hexagonal grid, capturing colored tiles and strategically placing them to score points.

## About the Game

**Hexi** is a browser-based puzzle game that challenges your strategic thinking and color matching skills. Navigate a beautiful hexagonal grid, capture colored tiles, and create scoring combinations within a time limit.

### Key Features

- 🎨 **Unique Color Mechanics**: Capture tiles based on color distance from your base color, with varying success rates
- 🎲 **Risk & Reward**: Harder-to-capture colors yield higher scores
- ⏱️ **Time Challenge**: 5-minute sessions test your decision-making speed
- 🖼️ **Clean Minimalist Design**: Focus on gameplay without distractions
- 🎮 **Simple Controls**: Just arrow keys and spacebar

### How to Play

1. **Move** using arrow keys to navigate the hexagonal grid
2. **Capture** colored tiles by holding Space for 0.5 seconds
3. **Place** captured tiles into empty cells for scoring opportunities
4. **Score** by creating adjacent clusters of matching colors
5. **Strategy**: Tiles closer to your base color are easier to capture but score less

### Gameplay Mechanics

- **Capture Chance**: Decreases by 20% for each color step away from your base (orange)
- **Scoring System**: 
  - Base score: 1 point per adjacent tile of the same color
  - Color multiplier: Higher for colors further from your base
  - Final score = base × multiplier

- **Movement**: While carrying a tile, you can only move to empty cells
- **Cooldown**: Failed capture attempts trigger a 3-second cooldown

### Perfect For

- Puzzle game enthusiasts
- Fans of hexagonal grid games
- Anyone looking for a quick strategic challenge
- Players who enjoy risk/reward mechanics

## Technical Details

- **Platform**: Web browser (HTML5)
- **Engine**: Built with React + TypeScript + Vite
- **Controls**: Keyboard only
- **Requirements**: Modern web browser with JavaScript enabled
- **No Installation Required**: Play directly in your browser

## Development

This game is an indie project focused on exploring hexagonal grid mechanics and color-based puzzle design. Regular updates add new features and refinements based on community feedback.

---

**Current Version**: 2025w51-0.20  
**Last Updated**: December 2025

*No ads, no in-app purchases, no third-party tracking — just pure puzzle gameplay.*
