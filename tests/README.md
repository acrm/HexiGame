# HexiGame Tests

This directory contains the complete test suite for HexiGame's refactored architecture.

## 🎯 Purpose

These tests are written **before implementation** following Test-Driven Development (TDD) principles. They serve as:

- **Executable specifications** - Define what the code should do
- **Documentation** - Show how to use each module
- **Quality gates** - Ensure implementation meets requirements
- **Regression protection** - Catch bugs when refactoring

## 📊 Current Status

**All tests are currently failing** - this is expected and correct!

```
Test Files: 4
Tests: 103 (103 failing, 0 passing)
```

These failures are intentional. Each failing test describes functionality that doesn't exist yet.

## 📁 Structure

```
tests/
├── setup.ts                    # Global test configuration
├── helpers/                    # Test utilities
│   └── builders.ts            # State and data builders
├── unit/                      # Unit tests (isolated modules)
│   ├── domain/
│   │   ├── game-logic/
│   │   │   └── game-engine.test.ts      # 34 tests
│   │   └── grid/
│   │       └── axial-math.test.ts       # 44 tests
│   ├── application/
│   │   ├── state-machine/               # (to be added)
│   │   └── commands/                    # (to be added)
│   └── infrastructure/
│       ├── input/                       # (to be added)
│       ├── rendering/                   # (to be added)
│       └── config/                      # (to be added)
└── integration/               # Integration tests (module interaction)
    └── flows/
        ├── capture-flow.test.ts         # 9 tests
        └── movement-flow.test.ts        # 7 tests
```

## 🧪 Test Types

### Unit Tests (94 tests)

Test individual modules in isolation.

**Domain/Game Logic** (`game-engine.test.ts`):
- Tick updates (timers, cooldowns, flash effects)
- Capture eligibility validation
- Capture execution (success/failure)
- Movement validation and execution
- Drop mechanics
- Action mode state management

**Domain/Grid System** (`axial-math.test.ts`):
- Axial coordinate arithmetic
- Distance calculations
- Neighbor and range operations
- Pathfinding (lines, rings, spirals)
- Grid creation and manipulation

### Integration Tests (9 tests)

Test module interactions and complete workflows.

**Capture Flow** (`capture-flow.test.ts`):
- Complete successful capture sequence
- Failed capture with cooldown
- Early charge cancellation
- Cooldown expiration
- Flash effect lifecycle

**Movement Flow** (`movement-flow.test.ts`):
- Protagonist movement
- Hex transportation while carrying
- Movement restrictions (blocked by colored hex)
- Field toggling (world ↔ inventory)
- Eat to inventory

## 🛠️ Running Tests

```bash
# Run all tests (shows 103 failures)
npm test

# Run specific test file
npm test game-engine.test.ts

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Visual UI
npm run test:ui
```

## 📝 Test Anatomy

Each test follows the Arrange-Act-Assert pattern:

```typescript
it('increments tick counter by 1', () => {
  // Currently fails with: expect(true).toBe(false)
  // This forces the test to fail until implemented
  
  // ARRANGE: Create test state
  // const state = createTestState({ tick: 0 });
  // const engine = new GameEngine();
  
  // ACT: Execute function
  // const newState = engine.tick(state, params);
  
  // ASSERT: Verify behavior
  // expect(newState.tick).toBe(1);
});
```

## 🔧 Test Helpers

### Builders (`helpers/builders.ts`)

Create test data easily:

```typescript
// Create minimal game state
const state = createTestState();

// Create state with specific values
const state = createTestState({ 
  tick: 10, 
  protagonist: { q: 5, r: 5 } 
});

// Use factories for common scenarios
const state = StateFactory.withCarriedHex({ q: 1, r: 1 });
const state = StateFactory.withCooldown(10);
const state = StateFactory.adjacentToColoredHex(2);

// Create test grids
const grid = createEmptyTestGrid(5);
const grid = createTestGrid(5, [
  { q: 0, r: 0, colorIndex: 1 },
  { q: 1, r: 0, colorIndex: 2 },
]);

// Mock RNG for deterministic tests
const mockRng = createFixedRng(0.5);
const mockRng = createMockRng([0.3, 0.7, 0.5]); // Returns values in sequence
```

### Custom Matchers (`setup.ts`)

Hex-specific assertions:

```typescript
expect(protagonist).toBeAdjacentTo(cursor);
expect(position).toBeInRadius(5);
```

## 📖 Writing Tests

### Test Naming Convention

```
describe('[ClassName]', () => {
  describe('[methodName]', () => {
    it('[expected behavior] when [condition]', () => {
      // Test code
    });
  });
});
```

Examples:
- ✅ `it('returns true when coordinates are equal')`
- ✅ `it('increments tick by 1 each call')`
- ✅ `it('preserves immutability when updating state')`

### Best Practices

1. **One assertion per test** (usually)
2. **Test behavior, not implementation**
3. **Use descriptive names**
4. **Keep tests independent**
5. **Use test helpers to reduce boilerplate**

## 🎓 Learning from Tests

Tests are documentation! To understand how a module works:

1. Read the test file
2. Look at test names (they describe behavior)
3. Read the commented-out test code (shows usage)
4. See what inputs produce what outputs

Example: To learn about capture mechanics, read `capture-flow.test.ts`.

## 🚀 TDD Workflow

When implementing a module:

1. **Red**: Run tests, see them fail
   ```bash
   npm test game-engine.test.ts
   ```

2. **Green**: Implement just enough to pass
   - Uncomment test code
   - Create the module
   - Make the test pass

3. **Refactor**: Improve code quality
   - Tests still pass
   - Code is cleaner

4. **Repeat**: Move to next test

## 🔍 Test Coverage Goals

| Module | Target |
|--------|--------|
| Domain/Game Logic | 95% |
| Domain/Grid System | 95% |
| Application/State Machine | 90% |
| Application/Commands | 90% |
| Infrastructure/Input | 80% |
| Infrastructure/Rendering | 70% |
| Infrastructure/Config | 90% |

## 📚 References

- [Test Plan](../docs/TEST_PLAN.md) - Detailed testing strategy
- [Architecture](../docs/ARCHITECTURE.md) - System architecture
- Design documents in `docs/design/` - Module specifications

## ❓ FAQ

**Q: Why are all tests failing?**  
A: They're specifications written before implementation. They define what needs to be built.

**Q: Can I run just one test?**  
A: Yes! `npm test -- game-engine.test.ts -t "increments tick"`

**Q: How do I add new tests?**  
A: Follow the existing pattern. Add to appropriate test file or create new one.

**Q: Should I modify existing tests?**  
A: Only if requirements change. Tests are specifications.

**Q: What if a test is wrong?**  
A: Fix it! Tests are living documentation.

## 🎯 Next Steps

1. Pick a module to implement (start with Domain/Grid System)
2. Read its test file
3. Read its design document
4. Implement to make tests pass
5. Celebrate! 🎉

---

**Remember**: Failing tests are not bugs - they're your roadmap to success!
