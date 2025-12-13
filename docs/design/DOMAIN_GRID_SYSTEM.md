# Domain Layer - Grid System Module

## Module Overview

**Package**: `src/domain/grid`  
**Responsibility**: Hexagonal grid mathematics and data structures  
**Dependencies**: None (pure mathematics)  
**Dependents**: Game Logic Module, Rendering Module

## Design Principles

1. **Pure Mathematics**: All operations are pure mathematical functions
2. **Immutability**: Grid data structures never modified in place
3. **Performance**: O(1) lookups, efficient algorithms
4. **Coordinate System**: Axial coordinates (q, r) as primary representation
5. **Generic**: Usable for any hex-grid based game

## Data Structures

### Axial
Primary coordinate system for hex positions.

```typescript
interface Axial {
  readonly q: number;  // Column coordinate
  readonly r: number;  // Row coordinate
}

// Derived: s = -q - r (cube coordinate constraint)
```

### Cell
Individual hex cell in grid.

```typescript
interface Cell {
  readonly q: number;
  readonly r: number;
  readonly colorIndex: number | null;
}
```

### HexGrid
Immutable grid data structure.

```typescript
interface HexGrid {
  readonly radius: number;
  readonly cells: ReadonlyMap<string, Cell>;
}
```

### Direction
Hex directions (0-5 clockwise from up).

```typescript
enum HexDirection {
  UP = 0,          // (0, -1)
  UP_RIGHT = 1,    // (1, -1)
  DOWN_RIGHT = 2,  // (1, 0)
  DOWN = 3,        // (0, 1)
  DOWN_LEFT = 4,   // (-1, 1)
  UP_LEFT = 5,     // (-1, 0)
}

const DIRECTION_VECTORS: ReadonlyArray<Axial> = [
  { q: 0, r: -1 },   // UP
  { q: 1, r: -1 },   // UP_RIGHT
  { q: 1, r: 0 },    // DOWN_RIGHT
  { q: 0, r: 1 },    // DOWN
  { q: -1, r: 1 },   // DOWN_LEFT
  { q: -1, r: 0 },   // UP_LEFT
];
```

## Public Interface

### AxialMath
Coordinate arithmetic and conversions.

```typescript
class AxialMath {
  /**
   * Add two axial coordinates.
   */
  static add(a: Axial, b: Axial): Axial;
  
  /**
   * Subtract two axial coordinates.
   */
  static subtract(a: Axial, b: Axial): Axial;
  
  /**
   * Multiply axial coordinate by scalar.
   */
  static scale(coord: Axial, factor: number): Axial;
  
  /**
   * Check equality of two coordinates.
   */
  static equals(a: Axial, b: Axial): boolean;
  
  /**
   * Calculate Manhattan distance between two hexes.
   */
  static distance(a: Axial, b: Axial): number;
  
  /**
   * Get neighbor in given direction.
   */
  static neighbor(coord: Axial, direction: HexDirection): Axial;
  
  /**
   * Get all 6 neighbors.
   */
  static neighbors(coord: Axial): Axial[];
  
  /**
   * Check if coordinate is within disk radius.
   */
  static inRadius(coord: Axial, radius: number): boolean;
  
  /**
   * Convert axial to cube coordinates.
   */
  static toCube(coord: Axial): { q: number; r: number; s: number };
  
  /**
   * Convert to string key for Map storage.
   */
  static toKey(coord: Axial): string;
  
  /**
   * Parse string key back to coordinate.
   */
  static fromKey(key: string): Axial;
  
  /**
   * Rotate coordinate around origin.
   */
  static rotate(coord: Axial, steps: number): Axial;
  
  /**
   * Reflect coordinate across axis.
   */
  static reflect(coord: Axial, axis: 'q' | 'r' | 's'): Axial;
}
```

### HexPath
Pathfinding and line algorithms.

```typescript
class HexPath {
  /**
   * Find shortest path between two hexes.
   * Returns null if no path exists.
   */
  static findPath(
    from: Axial,
    to: Axial,
    isBlocked: (coord: Axial) => boolean,
    maxDistance?: number
  ): Axial[] | null;
  
  /**
   * Get all hexes in straight line between two points.
   */
  static line(from: Axial, to: Axial): Axial[];
  
  /**
   * Get all hexes within range.
   */
  static range(center: Axial, radius: number): Axial[];
  
  /**
   * Get ring of hexes at exact distance.
   */
  static ring(center: Axial, radius: number): Axial[];
  
  /**
   * Get spiral of hexes starting from center.
   */
  static spiral(center: Axial, radius: number): Axial[];
  
  /**
   * Check if path exists between two hexes.
   */
  static hasPath(
    from: Axial,
    to: Axial,
    isBlocked: (coord: Axial) => boolean
  ): boolean;
  
  /**
   * Get direction from one hex to adjacent hex.
   * Returns null if not adjacent.
   */
  static getDirection(from: Axial, to: Axial): HexDirection | null;
}
```

### GridOperations
Grid creation and manipulation.

```typescript
class GridOperations {
  /**
   * Create empty grid with given radius.
   */
  static createEmpty(radius: number): HexGrid;
  
  /**
   * Create grid with random colors.
   */
  static createRandom(
    radius: number,
    colorProbability: number,
    paletteSize: number,
    rng: () => number
  ): HexGrid;
  
  /**
   * Get cell at coordinate.
   */
  static getCell(grid: HexGrid, coord: Axial): Cell | undefined;
  
  /**
   * Set cell at coordinate (returns new grid).
   */
  static setCell(grid: HexGrid, cell: Cell): HexGrid;
  
  /**
   * Update multiple cells (returns new grid).
   */
  static setCells(grid: HexGrid, cells: Cell[]): HexGrid;
  
  /**
   * Remove color from cell.
   */
  static clearCell(grid: HexGrid, coord: Axial): HexGrid;
  
  /**
   * Get all cells with given color.
   */
  static getCellsByColor(grid: HexGrid, colorIndex: number): Cell[];
  
  /**
   * Count cells with each color.
   */
  static countColors(grid: HexGrid): Map<number, number>;
  
  /**
   * Get all neighbors of coordinate that exist in grid.
   */
  static getNeighbors(grid: HexGrid, coord: Axial): Cell[];
  
  /**
   * Get all empty cells.
   */
  static getEmptyCells(grid: HexGrid): Cell[];
  
  /**
   * Get all colored cells.
   */
  static getColoredCells(grid: HexGrid): Cell[];
  
  /**
   * Clone grid.
   */
  static clone(grid: HexGrid): HexGrid;
  
  /**
   * Get all cells as array.
   */
  static toArray(grid: HexGrid): Cell[];
}
```

### HexGeometry
Screen-space conversions and rendering helpers.

```typescript
class HexGeometry {
  /**
   * Convert axial to pixel coordinates (pointy-top).
   */
  static axialToPixel(
    coord: Axial,
    hexSize: number
  ): { x: number; y: number };
  
  /**
   * Convert pixel to axial coordinates (pointy-top).
   */
  static pixelToAxial(
    x: number,
    y: number,
    hexSize: number
  ): Axial;
  
  /**
   * Get hex corner positions (pointy-top).
   */
  static corners(
    coord: Axial,
    hexSize: number
  ): Array<{ x: number; y: number }>;
  
  /**
   * Get hex edge midpoints.
   */
  static edgeMidpoints(
    coord: Axial,
    hexSize: number
  ): Array<{ x: number; y: number }>;
  
  /**
   * Get hex center pixel position.
   */
  static center(
    coord: Axial,
    hexSize: number
  ): { x: number; y: number };
  
  /**
   * Calculate bounding box for grid.
   */
  static boundingBox(
    grid: HexGrid,
    hexSize: number
  ): { minX: number; minY: number; maxX: number; maxY: number };
}
```

## Implementation Details

### Coordinate System

Using **axial coordinates** (q, r):
- q: column (increases right)
- r: row (increases down-right)
- s: derived as -q-r (cube coordinate constraint)

Advantages:
- 2D storage (vs 3D cube)
- Easy neighbor calculation
- Standard in hex grid literature

### Distance Calculation

```
distance(a, b) = (|a.q - b.q| + |a.r - b.r| + |a.s - b.s|) / 2
where s = -q - r
```

### Neighbor Calculation

```
neighbor(coord, direction) = coord + DIRECTION_VECTORS[direction]
```

### Grid Storage

Use `Map<string, Cell>` where key is `"q,r"`:
- O(1) lookup
- Easy iteration
- Immutable updates via new Map

### Pathfinding Algorithm

Use A* with hex distance as heuristic:
1. Priority queue ordered by f = g + h
2. g = steps from start
3. h = hex distance to goal
4. Neighbors filtered by blocking predicate

## Performance Considerations

- Coordinate operations: O(1)
- Distance calculation: O(1)
- Grid lookup: O(1) via Map
- Pathfinding: O(V log V) where V = cells in range
- Range calculation: O(R²) where R = radius
- Avoid allocations in hot paths

## Testing Requirements

### Unit Tests

1. **AxialMath Tests**:
   - Addition/subtraction commutative
   - Distance symmetric
   - Neighbors all at distance 1
   - Rotation preserves distance from origin
   - inRadius works for all disk cells

2. **HexPath Tests**:
   - Straight line between neighbors
   - Path exists between reachable cells
   - No path when blocked
   - Range includes all cells within radius
   - Ring has correct size (6*radius for radius>0)
   - Spiral visits all cells exactly once

3. **GridOperations Tests**:
   - Create grid has correct cell count: 1 + 3*R*(R+1)
   - Get/Set maintains immutability
   - setCells updates all specified cells
   - Color counts accurate
   - Empty grid has no colored cells

4. **HexGeometry Tests**:
   - Pixel conversion round-trips correctly
   - Corners form regular hexagon
   - Center is average of corners
   - Bounding box contains all cells

### Property-Based Tests

1. Coordinate operations preserve cube constraint (q+r+s=0)
2. Distance is always non-negative
3. Distance to self is 0
4. Distance symmetric: d(a,b) = d(b,a)
5. Triangle inequality: d(a,c) ≤ d(a,b) + d(b,c)
6. Neighbors all adjacent (distance 1)
7. All cells in range satisfy distance check

## Mathematical Properties

### Cube Coordinate Constraint
For any valid hex: `q + r + s = 0`

### Distance Formula
```
distance(a, b) = max(|a.q - b.q|, |a.r - b.r|, |a.s - b.s|)
```

### Number of Cells in Radius R
```
cellCount(R) = 1 + 3 * R * (R + 1)
```

### Ring Size at Radius R
```
ringSize(0) = 1
ringSize(R) = 6 * R  for R > 0
```

## Dependencies

None - pure mathematics module.

## Exports

- `AxialMath` class
- `HexPath` class
- `GridOperations` class
- `HexGeometry` class
- `Axial` interface
- `Cell` interface
- `HexGrid` interface
- `HexDirection` enum
- `DIRECTION_VECTORS` constant

## Future Extensions

1. **Flat-top orientation**: Support both pointy and flat
2. **Offset coordinates**: Convert to/from offset coords
3. **Field of view**: Calculate visible hexes
4. **Procedural generation**: Noise-based terrain
5. **Hex algebra**: General linear combinations
6. **Flooding algorithms**: Connected components
