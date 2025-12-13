# Refactoring Notes for HexiGame

## Current State Analysis

The HexiGame codebase has evolved through 47+ incremental versions, accumulating functionality in a prototype-oriented manner. The current architecture mixes concerns across layers, particularly in the Game.tsx and GameField.tsx components which handle logic, rendering, and input in tandem.

## Key Issues Identified

### 1. Separation of Concerns
- **Problem**: Game.tsx (260 lines) and GameField.tsx (754 lines) combine state management, input handling, and rendering logic
- **Impact**: Difficult to test, maintain, and extend independently
- **Recommended Solution**: Strict separation into distinct layers following clean architecture principles

### 2. State Management
- **Problem**: Game state is managed via React hooks with imperative updates scattered across event handlers
- **Impact**: State transitions are implicit, making debugging and reasoning about game flow difficult
- **Recommended Solution**: Explicit state machine with defined states and transitions

### 3. Input Handling Complexity
- **Problem**: Input handling (keyboard, touch, joystick) is intertwined with game logic
- **Impact**: Platform-specific code duplicates logic; difficult to add new input methods
- **Recommended Solution**: Abstract input layer with command pattern

### 4. Rendering Coupling
- **Problem**: Canvas rendering logic in GameField.tsx is tightly coupled to game state structure
- **Impact**: Cannot easily switch rendering backends or add visual effects
- **Recommended Solution**: Renderer interface with pluggable implementations

### 5. Testing Infrastructure
- **Problem**: No unit or integration tests exist
- **Impact**: Refactoring is risky; regressions are undetectable
- **Recommended Solution**: Comprehensive test suite with clear test boundaries

### 6. Configuration Management
- **Problem**: Parameters (DefaultParams) are scattered and some hardcoded values remain
- **Impact**: Difficulty tuning game feel; impossible to A/B test variations
- **Recommended Solution**: Centralized configuration with validation and presets

### 7. Module Boundaries
- **Problem**: Logic module (pureLogic.ts) exports 40+ functions with unclear responsibilities
- **Impact**: Unclear API surface; difficult to understand what's "core" vs "helper"
- **Recommended Solution**: Organize into focused sub-modules with clear interfaces

## Proposed Refactoring Strategy

### Phase 1: Define Architecture & Write Tests
1. Document high-level architecture (layers, modules, data flow)
2. Define interfaces for each module
3. Write comprehensive unit tests for each module (TDD - tests first)
4. Write integration tests for key user flows
5. **DO NOT implement yet** - tests should fail, documenting expected behavior

### Phase 2: Extract Core Modules (Future)
1. Extract pure game logic kernel (state transitions, rules)
2. Extract grid/hex mathematics into standalone module
3. Extract input command system
4. Extract rendering system

### Phase 3: Implement Clean Interfaces (Future)
1. Refactor Game.tsx to be pure orchestrator
2. Implement state machine for game modes
3. Implement command pattern for inputs
4. Implement renderer interface

### Phase 4: Quality & Polish (Future)
1. Add error boundaries and validation
2. Add performance monitoring
3. Add developer tools (state inspector, time travel)

## Target Architecture Principles

1. **Pure Core**: Game logic should be pure functions (already mostly achieved in pureLogic.ts)
2. **Testability**: Every module should be independently testable
3. **Explicit State**: State transitions should be explicit and traceable
4. **Dependency Inversion**: High-level modules should not depend on low-level details
5. **Single Responsibility**: Each module should have one clear purpose
6. **Open/Closed**: Easy to extend (new game modes, inputs) without modifying existing code

## Success Criteria

- [ ] Complete architecture documentation exists
- [ ] Every module has a design document with interface specifications
- [ ] Unit test suite covers all modules (tests currently failing)
- [ ] Integration test suite covers key user flows (tests currently failing)
- [ ] No code changes to implementation (Phase 1 only)
- [ ] Tests clearly document expected behavior for future implementation

## Notes

- Current codebase version: 25w48-0.47
- Primary language: TypeScript + React
- Build tool: Vite
- Current test framework: None (to be selected during implementation)
