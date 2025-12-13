# Test Plan & Infrastructure

## Overview

This document defines the testing strategy for HexiGame architecture refactoring. All tests are written BEFORE implementation (TDD approach) and will initially fail, serving as executable specifications.

## Test Framework Selection

**Recommended**: Vitest
- Fast, Vite-native testing
- Jest-compatible API
- TypeScript support out-of-box
- Excellent DX with watch mode

**Dependencies to add**:
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

## Test Structure

```
tests/
├── unit/
│   ├── domain/
│   │   ├── game-logic/
│   │   │   ├── game-engine.test.ts
│   │   │   ├── game-rules.test.ts
│   │   │   ├── game-clock.test.ts
│   │   │   └── state-transitions.test.ts
│   │   └── grid/
│   │       ├── axial-math.test.ts
│   │       ├── hex-path.test.ts
│   │       ├── grid-operations.test.ts
│   │       └── hex-geometry.test.ts
│   ├── application/
│   │   ├── state-machine/
│   │   │   ├── game-state-machine.test.ts
│   │   │   └── mode-handlers.test.ts
│   │   └── commands/
│   │       ├── command-queue.test.ts
│   │       ├── command-processor.test.ts
│   │       └── concrete-commands.test.ts
│   └── infrastructure/
│       ├── input/
│       │   ├── keyboard-input.test.ts
│       │   ├── touch-input.test.ts
│       │   └── input-manager.test.ts
│       ├── rendering/
│       │   ├── canvas-renderer.test.ts
│       │   └── render-layers.test.ts
│       └── config/
│           ├── config-manager.test.ts
│           └── config-validator.test.ts
└── integration/
    ├── flows/
    │   ├── capture-flow.test.ts
    │   ├── movement-flow.test.ts
    │   ├── inventory-flow.test.ts
    │   └── release-flow.test.ts
    └── scenarios/
        ├── complete-game.test.ts
        └── edge-cases.test.ts
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual modules in isolation

**Characteristics**:
- No dependencies on other modules (use mocks)
- Fast execution (<1ms per test)
- High code coverage (>80%)
- Test one concept per test

**Example Structure**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/domain/game-logic/game-engine';

describe('GameEngine', () => {
  describe('tick', () => {
    it('increments tick counter by 1', () => {
      // Arrange
      const state = createTestState({ tick: 0 });
      const engine = new GameEngine();
      
      // Act
      const newState = engine.tick(state, DefaultParams);
      
      // Assert
      expect(newState.tick).toBe(1);
    });
    
    it('preserves other state when incrementing tick', () => {
      // Test immutability
    });
  });
});
```

### 2. Integration Tests

**Purpose**: Test module interactions and workflows

**Characteristics**:
- Real implementations (minimal mocking)
- Test complete user flows
- Moderate execution time
- Focus on interaction correctness

**Example Structure**:
```typescript
describe('Capture Flow', () => {
  it('completes full capture: charge → roll → success → carry', () => {
    // Arrange: state with protagonist adjacent to colored hex
    // Act: execute complete flow
    // Assert: hex is captured and carried
  });
});
```

### 3. Property-Based Tests

**Purpose**: Test invariants across many inputs

**Characteristics**:
- Generate random inputs
- Test properties that must always hold
- Find edge cases automatically

**Example**:
```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.integer({ min: 0, max: 100 })])(
  'capture chance never exceeds 100%',
  (colorIndex) => {
    const chance = GameRules.calculateCaptureChance(colorIndex, params);
    return chance >= 0 && chance <= 100;
  }
);
```

## Test Helpers

### Test Data Builders

Create reusable state builders:

```typescript
// tests/helpers/builders.ts
export function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    tick: 0,
    remainingSeconds: 300,
    cursor: { q: 0, r: 0 },
    protagonist: { q: 0, r: 0 },
    facingDirIndex: 0,
    grid: createEmptyGrid(5),
    inventoryGrid: createEmptyGrid(5),
    activeField: 'world',
    capturedCell: null,
    captureCooldownTicksRemaining: 0,
    captureChargeStartTick: null,
    flash: null,
    isActionMode: false,
    isReleasing: false,
    ...overrides,
  };
}

export function createTestParams(overrides: Partial<GameParams> = {}): GameParams {
  return {
    ...DefaultParams,
    ...overrides,
  };
}

export function createTestGrid(
  radius: number,
  cells: Array<{ q: number; r: number; colorIndex: number | null }>
): HexGrid {
  const grid = GridOperations.createEmpty(radius);
  return GridOperations.setCells(grid, cells);
}
```

### Test Matchers

Custom assertions:

```typescript
// tests/helpers/matchers.ts
expect.extend({
  toBeAdjacentTo(received: Axial, expected: Axial) {
    const distance = AxialMath.distance(received, expected);
    const pass = distance === 1;
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be adjacent to ${expected}`
        : `Expected ${received} to be adjacent to ${expected}`,
    };
  },
  
  toBeInBounds(received: Axial, radius: number) {
    const pass = AxialMath.inRadius(received, radius);
    return {
      pass,
      message: () => pass
        ? `Expected ${received} to be out of bounds (radius ${radius})`
        : `Expected ${received} to be in bounds (radius ${radius})`,
    };
  },
});
```

## Test Coverage Goals

| Module | Target Coverage |
|--------|----------------|
| Domain/Game Logic | 95% |
| Domain/Grid System | 95% |
| Application/State Machine | 90% |
| Application/Commands | 90% |
| Infrastructure/Input | 80% |
| Infrastructure/Rendering | 70% |
| Infrastructure/Config | 90% |

## Running Tests

### Commands

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:unit": "vitest tests/unit",
    "test:integration": "vitest tests/integration",
    "test:watch": "vitest --watch"
  }
}
```

### Watch Mode

During development, run `npm run test:watch` to:
- Re-run tests on file changes
- See failures immediately
- Focus on specific test files

### Coverage Reports

Generate coverage with `npm run test:coverage`:
- HTML report: `coverage/index.html`
- Console summary
- Fail CI if below threshold

## Mocking Strategy

### When to Mock

- External dependencies (DOM, fetch, localStorage)
- Slow operations (rendering, file I/O)
- Non-deterministic sources (Date.now, Math.random)

### When NOT to Mock

- Pure functions (domain logic)
- Simple value objects
- Within same layer (unit test real implementations)

### Mock Examples

```typescript
// Mock RNG for deterministic tests
const mockRng = vi.fn(() => 0.5);

// Mock canvas context
const mockCtx = {
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  // ... other methods
};

// Mock timer
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
```

## Test-Driven Development Process

### Red-Green-Refactor

1. **Red**: Write failing test
   - Test describes expected behavior
   - Run test, verify it fails
   
2. **Green**: Write minimal code to pass
   - Implement just enough to make test pass
   - Run test, verify it passes
   
3. **Refactor**: Improve code quality
   - Optimize, clean up, extract
   - Run tests, verify still passing

### Test First Benefits

- Tests serve as specifications
- Forces thinking about API design
- Prevents over-engineering
- Documentation via examples
- Regression safety

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Documentation Tests

Code examples in documentation should be testable:

```typescript
// Extract examples from markdown
// Run as tests to ensure docs stay accurate
describe('Documentation Examples', () => {
  it('ARCHITECTURE.md example 1 works', () => {
    // Copy-paste example from docs
    // Verify it executes correctly
  });
});
```

## Performance Tests

Track performance regressions:

```typescript
import { bench } from 'vitest';

bench('GameEngine.tick() performance', () => {
  const state = createTestState();
  engine.tick(state, params);
}, {
  iterations: 1000,
  time: 1000,
});
```

## Test Naming Convention

```
describe('[ClassName]', () => {
  describe('[methodName]', () => {
    it('[expected behavior] when [condition]', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

Examples:
- ✅ `it('returns true when coordinates are equal')`
- ✅ `it('throws error when grid is out of bounds')`
- ✅ `it('preserves immutability when updating cell')`
- ❌ `it('works')`
- ❌ `it('test case 1')`

## Test Data Management

### Fixtures

Store complex test data in fixtures:

```typescript
// tests/fixtures/game-states.ts
export const stateWithCapturedHex: GameState = { /* ... */ };
export const stateInCooldown: GameState = { /* ... */ };
export const stateCharging: GameState = { /* ... */ };
```

### Factories

Generate variations:

```typescript
// tests/factories/state-factory.ts
export class StateFactory {
  static withCooldown(ticks: number): GameState {
    return createTestState({
      captureCooldownTicksRemaining: ticks,
    });
  }
  
  static withCarriedHex(position: Axial): GameState {
    return createTestState({
      capturedCell: position,
    });
  }
}
```

## Assertions Best Practices

### Be Specific

```typescript
// ❌ Too broad
expect(newState).not.toBe(state);

// ✅ Specific
expect(newState.tick).toBe(state.tick + 1);
expect(newState.cursor).toEqual(state.cursor);
```

### Test One Thing

```typescript
// ❌ Testing multiple things
it('tick updates state correctly', () => {
  expect(newState.tick).toBe(1);
  expect(newState.cooldown).toBe(0);
  expect(newState.flash).toBeNull();
});

// ✅ Separate tests
it('increments tick by 1');
it('decrements cooldown by 1 when active');
it('clears flash after duration');
```

## Next Steps

1. Install test dependencies
2. Set up vitest configuration
3. Create test helpers and utilities
4. Write unit tests for each module
5. Write integration tests for flows
6. Run tests (all should fail)
7. Use failing tests as implementation guide
