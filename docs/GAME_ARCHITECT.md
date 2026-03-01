# HexiGame — Architecture & Refactoring Strategy

**Document Version:** 1.1  
**Last Updated:** March 1, 2026  
**Focus:** Current architecture analysis, technical debt, and improvement roadmap

---

## Executive Summary

HexiGame представляет собой React-приложение с чистой функциональной логикой игры. Текущая архитектура работоспособна, но имеет проблемы масштабируемости:

- **Монолитные файлы**: `pureLogic.ts` (876 строк), `GameField.tsx` (841 строк), `Game.tsx` (780 строк)
- **Размытые границы**: Логика смешана с визуализацией и управлением состоянием
- **Техдолг**: Начатый, но незавершённый рефакторинг (см. `refactor-notes.md`)

Общий объём кодовой базы: **~5450 строк TypeScript/TSX**.

**Ключевая рекомендация**: Завершить трёхслойную архитектуру (`gameLogic` → `appLogic` → `ui`), разбив монолиты на домены.

---

## 1. Current Architecture

### 1.1. File Structure Overview

```
src/
├── logic/
│   └── pureLogic.ts              # 876 строк — монолитная игровая логика
├── components/
│   ├── Game.tsx                  # 780 строк — корневой React-компонент
│   ├── GameField.tsx             # 841 строк —Canvas рендеринг + input handling
│   ├── Hotbar.tsx                # 232 строк
│   ├── Settings.tsx              # 184 строк
│   ├── TemplateRenderer.ts       # 154 строк
│   └── [10+ других компонентов]
├── templates/
│   ├── templateLibrary.ts        # 363 строк — библиотека шаблонов
│   ├── templateLogic.ts          # 240 строк — валидация шаблонов
│   └── templateTypes.ts          # 96 строк
├── tutorial/
│   ├── tutorialLevels.ts         # 109 строк
│   └── tutorialState.ts          # 104 строк
├── audio/
│   └── audioManager.ts           # 190 строк
├── appLogic/
│   ├── integration.ts            # Интеграция с платформами
│   ├── integration.yandex.ts
│   └── integration.null.ts
└── ui/
    ├── i18n.ts                   # 152 строк — локализация
    └── colorScheme.ts            # 44 строк
```

### 1.2. Architecture Layers (Current State)

#### Layer 1: Pure Game Logic (`pureLogic.ts`)
**Ответственность:**
- Определение типов (`GameState`, `Params`, `Cell`, `Grid`)
- Чистые функции игровой логики (движение, захват, перенос)
- Tick-based симуляция (12 ticks/sec)
- Интеграция с модульными системами (templates, tutorial)

**Проблемы:**
- ❌ **Монолит**: 876 строк в одном файле; сложно навигировать
- ❌ **Размытые границы**: Смешаны низкоуровневые utils (hexToPixel) и бизнес-логика
- ❌ **Нет разделения доменов**: Capture, Movement, Inventory, Tutorial — всё в одном месте
- ❌ **Слабая типизация событий**: Нет явной Event/Command модели

#### Layer 2: React Integration (`Game.tsx`, `GameField.tsx`)
**Ответственность:**
- Управление состоянием (useState, useEffect)
- Input обработка (клавиатура, тач)
- Вызов функций из `pureLogic.ts`
- Рендеринг Canvas и UI

**Проблемы:**
- ❌ **Раздутые компоненты**: 780–841 строк на компонент
- ❌ **Смешивание MVC**: Рендеринг, управление и логика в одном файле
- ❌ **Дублирование**: Canvas-рендеринг дублирует логику из `pureLogic` (например, hex positioning)
- ❌ **Сложный useEffect**: Множество зависимостей, побочные эффекты

#### Layer 3: Modular Systems (templates, tutorial, audio)
**Ответственность:**
- Расширения игровой логики (шаблоны построек, туториал)
- Аудиосистема
- Интеграция с платформами (Yandex Games)

**Сильные стороны:**
- ✅ **Хорошая модульность**: templates/ и tutorial/ отделены от core
- ✅ **Чистый API**: `templateLogic.ts` экспортирует явные функции
- ✅ **Type Safety**: Используются TypeScript интерфейсы

**Проблемы:**
- ⚠️ **Тесная связь с pureLogic.ts**: Системы импортируют монолит напрямую
- ⚠️ **Нет dependency injection**: Сложно тестировать изолированно

---

## 2. Technical Debt Analysis

### 2.1. Code Metrics

| Файл | Строк | Экспортов | Ответственность |
|------|-------|-----------|-----------------|
| `pureLogic.ts` | 876 | ~50+ функций/типов | Вся игровая логика |
| `GameField.tsx` | 841 | 1 компонент | Canvas + input + визуализация |
| `Game.tsx` | 780 | 1 компонент | Root UI + state management |
| `templateLibrary.ts` | 363 | 8 шаблонов | Контент (можно разделить) |
| `Hotbar.tsx` | 232 | 1 компонент | Инвентарь UI |

**Красные флаги:**
- Файлы >500 строк трудно поддерживать
- Один файл с 50+ экспортами нарушает SRP (Single Responsibility Principle)

### 2.2. Dependency Graph Issues

```
Game.tsx
  ├─→ pureLogic.ts (876 строк, весь модуль)
  ├─→ templateLogic.ts → pureLogic.ts
  ├─→ tutorialState.ts → pureLogic.ts
  └─→ audioManager.ts

GameField.tsx
  ├─→ pureLogic.ts (дублирует типы и хелперы)
  └─→ TemplateRenderer.ts → templateLogic.ts → pureLogic.ts
```

**Проблемы:**
- **Circular dependencies**: Риск циклических зависимостей при добавлении новых систем
- **Tight coupling**: Невозможно использовать templateLogic без pureLogic
- **Bundle size**: Весь `pureLogic.ts` загружается даже для простых сценариев

### 2.3. Testability

**Текущее состояние:**
- ✅ Чистые функции в `pureLogic.ts` легко тестируются
- ❌ Нет unit-тестов (отсутствует `tests/` директория)
- ❌ Невозможно тестировать компоненты без mock всего `pureLogic`

### 2.4. Extensibility

**Сценарий:** Добавить новую механику "Цветовое смешивание"

Требуется изменить:
1. `pureLogic.ts` — добавить логику смешивания цветов
2. `Game.tsx` — добавить обработку новых событий
3. `GameField.tsx` — добавить визуализацию процесса смешивания
4. Возможно `templateLogic.ts` — для поддержки смешанных цветов в шаблонах

**Проблема:** Изменения размазаны по 4+ большим файлам без чёткой локализации.

---

## 3. Planned Refactoring (From `refactor-notes.md`)

### 3.1. Target Architecture

Трёхслойная архитектура:

```
src/
├── gameLogic/          # Чистая доменная логика (без React, без побочек)
│   ├── params.ts
│   ├── types.ts
│   ├── board.ts       # Сетка гексов
│   ├── capture.ts     # Механика захвата
│   ├── movement.ts    # Движение курсора/черепашки
│   ├── inventory.ts   # Hotbar + инвентарь
│   └── selectors.ts   # Вычисляемые значения
├── appLogic/           # Session управление + ViewModel
│   ├── sessionTypes.ts
│   ├── sessionReducer.ts  # Редьюсер команд (таймер, тики, движение)
│   └── viewModel.ts       # buildGameViewModel(state) → GameViewModel
└── ui/                 # React UI
    ├── hooks/
    │   ├── useGameSession.ts
    │   └── useKeyboardInput.ts
    └── components/
        ├── Game.tsx
        ├── GameField.tsx
        └── [остальные компоненты]
```

### 3.2. Benefits

**Разделение ответственности:**
- `gameLogic/` — тестируемая, переиспользуемая логика
- `appLogic/` — редьюсер с командами (легко логировать, replay)
- `ui/` — чистая презентация, минимум логики

**Улучшенная тестируемость:**
- Unit-тесты для `gameLogic/` (чистые функции)
- Integration-тесты для `sessionReducer` (проверка команд)
- Component-тесты для UI (моки ViewModel)

**Масштабируемость:**
- Новые механики добавляются как отдельные модули в `gameLogic/`
- UI расширяется через новые компоненты без изменения логики

### 3.3. Current Blocker

**Проблема:** Рефакторинг начат (`refactor-notes.md` описывает план), но **не завершён**.

- Старые файлы (`pureLogic.ts`, `Game.tsx`, `GameField.tsx`) всё ещё используются
- Новая структура `gameLogic/`, `appLogic/` не создана
- Риск конфликтов при параллельной разработке features

---

## 4. Improvement Proposals

### 4.1. Priority 1: Complete The Three-Layer Refactor

**Goal:** Завершить переход к архитектуре `gameLogic` → `appLogic` → `ui`.

**Steps:**

1. **Create `gameLogic/` modules** (Split `pureLogic.ts`):
   ```
   gameLogic/
   ├── core/
   │   ├── types.ts          # Базовые типы (Axial, Cell, Grid)
   │   ├── grid.ts           # Утилиты сетки (keyOf, getCell, generateGrid)
   │   └── params.ts         # Параметры и константы
   ├── systems/
   │   ├── movement.ts       # Движение protagonist/focus
   │   ├── capture.ts        # Захват цветов (вероятность, cooldown)
   │   ├── inventory.ts      # Hotbar + инвентарная сетка
   │   └── template.ts       # Интеграция Build Templates
   └── selectors.ts          # Derived values (capture chance, flicker state)
   ```

2. **Create `appLogic/sessionReducer.ts`**:
   - Определить `GameCommand` union type:
     ```typescript
     type GameCommand =
       | { type: 'TICK' }
       | { type: 'MOVE_CURSOR_DELTA'; dir: number }
       | { type: 'MOVE_CURSOR_TO'; target: Axial }
       | { type: 'ACTION_PRESSED' }
       | { type: 'ACTION_RELEASED' }
       | { type: 'TOGGLE_INVENTORY' }
       | { type: 'EAT_REQUESTED' };
     ```
   - Реализовать редьюсер, вызывающий функции из `gameLogic/`

3. **Create `appLogic/viewModel.ts`**:
   - Функция `buildGameViewModel(state: GameSessionState): GameViewModel`
   - ViewModel содержит **только** данные для UI (без логики)

4. **Refactor `ui/components/Game.tsx`**:
   - Использовать `useGameSession` хук
   - Убрать прямые вызовы `pureLogic.ts`
   - Рендерить на основе `GameViewModel`

5. **Deprecate old files**:
   - Удалить `src/logic/pureLogic.ts` после миграции всех функций
   - Удалить старые хуки из `src/hooks/` (если они существуют)

**Estimated Effort:** 2–3 refactoring sessions (~8–12 часов)

---

### 4.2. Priority 2: Split Large Components

**Target:** Разбить `GameField.tsx` (841 строк) и `Game.tsx` (780 строк).

#### 4.2.1. GameField.tsx → Multiple Files

```
ui/components/GameField/
├── GameField.tsx          # 100–150 строк — координация рендеринга
├── CanvasRenderer.ts      # Canvas-слой, draw functions
├── HexRenderer.ts         # drawHex, drawEdgeHighlight, hexToPixel
├── InputHandler.ts        # Touch/mouse handlers
└── types.ts               # Local types
```

**Benefits:**
- Каждый файл <200 строк
- Упрощённое тестирование рендеринга
- Переиспользование HexRenderer в других местах

#### 4.2.2. Game.tsx → Composition

```
ui/components/
├── Game.tsx               # 150–200 строк — композиция layout
├── GameHUD.tsx            # Верхняя панель (время, палитра)
├── GameControls.tsx       # Мобильные/десктопные контроллы
└── GameSessionProvider.tsx # Context для GameViewModel
```

**Benefits:**
- Более лёгкий рефакторинг UI
- Возможность A/B тестирования разных layouts

---

### 4.3. Priority 3: Introduce Event Bus / Command Pattern

**Problem:** Сейчас события (audio, analytics, platform integration) разбросаны по компонентам через `useEffect`.

**Solution:** Centralized event system.

```typescript
// appLogic/eventBus.ts
type GameEvent =
  | { type: 'CAPTURE_SUCCESS'; colorIndex: number }
  | { type: 'CAPTURE_FAILURE' }
  | { type: 'TEMPLATE_COMPLETED'; templateId: string }
  | { type: 'TUTORIAL_LEVEL_COMPLETE'; levelId: string };

class EventBus {
  private listeners: Map<string, Array<(event: GameEvent) => void>> = new Map();
  
  subscribe(eventType: string, handler: (event: GameEvent) => void) { ... }
  publish(event: GameEvent) { ... }
}
```

**Integration Points:**
- `sessionReducer` публикует события после изменений состояния
- `audioManager` подписывается на `CAPTURE_SUCCESS`, играет звук
- `integration.yandex.ts` подписывается на события для аналитики

**Benefits:**
- Decoupling: UI не знает об audio/analytics
- Testability: Mock EventBus для тестов
- Extensibility: Новые системы подписываются без изменения core

---

### 4.4. Priority 4: Add Testing Infrastructure

**Current State:** Нет тестов, нет тестовых фреймворков.

**Recommendations:**

1. **Setup Vitest**:
   ```bash
   npm install -D vitest @vitest/ui jsdom @testing-library/react
   ```

2. **Create test structure**:
   ```
   src/
   ├── gameLogic/
   │   ├── capture.ts
   │   └── capture.test.ts    # Unit-тесты
   ├── appLogic/
   │   ├── sessionReducer.ts
   │   └── sessionReducer.test.ts  # Reducer тесты
   └── ui/components/
       ├── Game.tsx
       └── Game.test.tsx      # Component тесты
   ```

3. **Priority test coverage**:
   - ✅ `gameLogic/capture.ts` — критическая логика вероятности
   - ✅ `gameLogic/movement.ts` — edge-cases (выход за границы, autoMove)
   - ✅ `sessionReducer.ts` — проверка state transitions
   - ⚠️ UI тесты второстепенны (snapshot-тесты для начала)

**Estimated Effort:** 1–2 сессии на setup + ongoing для новых features

---

### 4.5. Priority 5: Improve Developer Experience

#### 4.5.1. Code Documentation

**Add JSDoc для публичных API:**

```typescript
/**
 * Вычисляет вероятность успешного захвата цветного гекса.
 * @param targetColorIndex - Индекс цвета в палитре
 * @param playerBaseColorIndex - Базовый цвет игрока
 * @param params - Параметры игры
 * @returns Процент вероятности (0–100)
 */
export function calculateCaptureChance(
  targetColorIndex: number,
  playerBaseColorIndex: number,
  params: Params
): number { ... }
```

#### 4.5.2. Type-Safe Configuration

**Проблема:** `DefaultParams` объявлен как литерал, легко сломать.

**Solution:** Zod schema для валидации:

```typescript
import { z } from 'zod';

const ParamsSchema = z.object({
  GridRadius: z.number().int().min(5).max(30),
  InitialColorProbability: z.number().min(0).max(1),
  ColorPalette: z.array(z.string().regex(/^#[0-9A-F]{6}/i)).min(4).max(16),
  // ...
});

export type Params = z.infer<typeof ParamsSchema>;
export const DefaultParams = ParamsSchema.parse({ ... });
```

**Benefits:**
- Runtime валидация параметров (для mod поддержки)
- Auto-generated types
- Документация через schema

#### 4.5.3. Better Error Handling

**Current:** Silent failures (например, `getCell` возвращает `undefined`, но не логирует).

**Proposal:**

```typescript
// gameLogic/core/errors.ts
export class GameLogicError extends Error {
  constructor(message: string) {
    super(`[GameLogic] ${message}`);
  }
}

export class InvalidMoveError extends GameLogicError { ... }
export class InvalidCaptureError extends GameLogicError { ... }

// Usage:
if (!cell) {
  throw new InvalidMoveError(`Cell at (${q}, ${r}) does not exist`);
}
```

**Benefits:**
- Явные ошибки вместо `undefined`
- Упрощённая отладка
- Лучшие сообщения для игроков (через try/catch в UI)

---

## 5. Long-Term Vision

### 5.1. Modding Support

**Goal:** Позволить сообществу создавать:
- Кастомные палитры
- Новые Build Templates
- Tutorial уровни
- Модификации правил (ChanceBasePercent, CaptureHoldDuration)

**Requirements:**
- ✅ **Separation of content and logic**: Уже частично есть (templateLibrary.ts)
- ⚠️ **Schema validation**: Нужен Zod для проверки модов
- ❌ **Mod loader**: Нет системы загрузки JSON/YAML конфигов

**Roadmap:**
1. Экспортировать схемы (`BuildTemplate`, `TutorialLevel`, `Params`)
2. Создать `src/modding/modLoader.ts` для динамической загрузки
3. Добавить UI для включения/отключения модов

### 5.2. Performance Optimization

**Current State:**
- Canvas рендеринг происходит на каждом кадре (30–60 FPS)
- Logic tick = 12 ticks/sec → визуал может отстать

**Optimizations:**

1. **Offscreen Canvas**:
   ```typescript
   const offscreen = new OffscreenCanvas(width, height);
   const ctx = offscreen.getContext('2d');
   // Рендеринг в фоне, потом transferToImageBitmap()
   ```

2. **Dirty Region Tracking**:
   - Перерисовывать только изменённые гексы
   - `diffGameState(prev, current)` → список изменённых cells

3. **Web Workers для логики**:
   - Запускать `sessionReducer` в Worker
   - Передавать команды через `postMessage`
   - UI получает готовый ViewModel

**Estimated Performance Gain:**
- Canvas: 30–50% меньше draw calls
- Logic: Разгрузка main thread → стабильный FPS

### 5.3. Multi-Platform Support

**Current:** Web-only (HTML5 Canvas + React).

**Future Targets:**
- **Mobile Apps**: React Native (переиспользовать `gameLogic/` и `appLogic/`)
- **Desktop**: Electron / Tauri
- **Console**: Экспорт логики в C++ через Emscripten (амбициозный план)

**Key Requirement:** Полное разделение `gameLogic` от платформозависимых частей (Canvas, DOM events).

---

## 6. Migration Strategy

### 6.1. Test Facade Pattern (Recommended)

**Problem Statement:**

При масштабном рефакторинге возникает **диlemma тестирования**:

- **Без тестов**: Рефакторинг может сломать функциональность незаметно
- **С тестами на текущую реализацию**: Придётся переписывать тесты при изменении интерфейсов
- **Переписывание тестов**: Риск внести ошибки в саму логику тестов

**Proposed Solution: Test Facade Pattern**

```
┌─────────────────────────────────────┐
│  Tests (Stable, Implementation-     │
│  Agnostic)                          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  Test Facade (Stable Public API)    │
│  - execCommand(cmd)                 │
│  - getGameState()                   │
│  - assertInvariant(condition)       │
└──────────────┬──────────────────────┘
               │ (Internal adapter layer)
               ↓
┌─────────────────────────────────────┐
│  Current Implementation             │
│  (pureLogic.ts, Game.tsx, etc.)     │
│  ← Can be freely refactored         │
└─────────────────────────────────────┘
```

#### 6.1.1. Facade Design

**Core Concept:** Фасад предоставляет **стабильный API для тестов**, который не зависит от внутренней реализации.

**Example Implementation:**

```typescript
// tests/facade/GameTestFacade.ts

/**
 * Test Facade для HexiGame.
 * Скрывает детали реализации (pureLogic, React components),
 * предоставляя высокоуровневый API для тестов.
 */
export class GameTestFacade {
  private state: GameState;
  private params: Params;
  private rng: RNG;

  constructor(config?: Partial<TestConfig>) {
    this.params = { ...DefaultParams, ...config?.params };
    this.rng = config?.seed 
      ? mulberry32(config.seed) 
      : mulberry32(12345); // Детерминированный seed для тестов
    this.state = createInitialState(this.params, this.rng);
  }

  // === Command API (Input) ===
  
  /** Переместить курсор/протагониста */
  move(direction: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right'): void {
    const dirMap = {
      'up': 0, 'up-right': 1, 'right': 2,
      'down': 3, 'down-left': 4, 'left': 5
    };
    this.state = attemptMoveByDeltaOnActive(this.state, dirMap[direction], this.params);
  }

  /** Переместить в конкретную клетку */
  moveTo(q: number, r: number): void {
    this.state = attemptMoveTo(this.state, { q, r }, this.params);
  }

  /** Нажать Space (захват/сброс) */
  pressSpace(): void {
    this.state = performContextAction(this.state, this.params, this.rng);
  }

  /** Удержание Space (для захвата) */
  holdSpace(ticks: number): void {
    // Эмуляция удержания через несколько тиков
    for (let i = 0; i < ticks; i++) {
      this.state = logicTick(this.state, this.params, this.rng);
    }
    this.pressSpace();
  }

  /** Съесть гекс в hotbar */
  eat(): void {
    this.state = eatToHotbar(this.state, this.params);
  }

  /** Продвинуть время на N тиков */
  tick(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.state = logicTick(this.state, this.params, this.rng);
    }
  }

  /** Активировать шаблон */
  activateTemplate(templateId: string): void {
    this.state = activateTemplate(this.state, templateId);
  }

  // === Query API (Output) ===

  /** Получить позицию курсора */
  getCursorPosition(): { q: number; r: number } {
    return { ...this.state.focus };
  }

  /** Получить позицию протагониста */
  getProtagonistPosition(): { q: number; r: number } {
    return { ...this.state.protagonist };
  }

  /** Получить цвет клетки */
  getCellColor(q: number, r: number): number | null {
    const cell = getCell(this.state.grid, { q, r });
    return cell?.colorIndex ?? null;
  }

  /** Проверить, переносится ли гекс */
  isCarrying(): boolean {
    return hoveredCellActive(this.state, this.params)?.isCarrying ?? false;
  }

  /** Получить содержимое hotbar */
  getHotbar(): Array<number | null> {
    return [...this.state.hotbarSlots];
  }

  /** Получить шанс захвата текущей клетки */
  getCaptureChance(): number | null {
    const hovered = hoveredCellActive(this.state, this.params);
    return hovered?.captureChancePercent ?? null;
  }

  /** Проверить завершение шаблона */
  isTemplateCompleted(templateId: string): boolean {
    return this.state.completedTemplates?.has(templateId) ?? false;
  }

  /** Проверить завершение уровня туториала */
  isTutorialLevelCompleted(levelId: string): boolean {
    return this.state.tutorialCompletedLevelIds?.has(levelId) ?? false;
  }

  // === Assertion Helpers ===

  /** Проверить инвариант: сумма гексов сохраняется */
  assertColorConservation(): void {
    // Подсчёт всех гексов в мире + hotbar + inventory
    const worldColors = Array.from(this.state.grid.values())
      .filter(c => c.colorIndex !== null).length;
    const hotbarColors = this.state.hotbarSlots.filter(c => c !== null).length;
    const invColors = Array.from(this.state.inventoryGrid.values())
      .filter(c => c.colorIndex !== null).length;
    
    const total = worldColors + hotbarColors + invColors;
    
    // Инвариант должен быть неизменным (в играх без генерации)
    if (!this.initialColorCount) {
      this.initialColorCount = total;
    } else if (this.initialColorCount !== total) {
      throw new Error(
        `Color conservation violated: initial=${this.initialColorCount}, current=${total}`
      );
    }
  }

  private initialColorCount?: number;

  // === Internal State (for advanced tests) ===

  /** Получить полное состояние (для snapshot тестов) */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Установить состояние (для setup сложных сценариев) */
  setState(state: GameState): void {
    this.state = state;
  }
}

// Конфигурация для тестов
interface TestConfig {
  params?: Partial<Params>;
  seed?: number;
  initialState?: GameState;
}
```

#### 6.1.2. Test Examples

**Example 1: Movement Test**

```typescript
// tests/game/movement.test.ts
import { describe, it, expect } from 'vitest';
import { GameTestFacade } from '../facade/GameTestFacade';

describe('Movement System', () => {
  it('should move protagonist in specified direction', () => {
    const game = new GameTestFacade({ seed: 42 });
    
    const initialPos = game.getProtagonistPosition();
    
    game.move('up');
    
    const newPos = game.getProtagonistPosition();
    expect(newPos.q).toBe(initialPos.q);
    expect(newPos.r).toBe(initialPos.r - 1);
  });

  it('should not move outside grid bounds', () => {
    const game = new GameTestFacade({ 
      seed: 42,
      params: { GridRadius: 5 }
    });
    
    // Двигаться к краю
    for (let i = 0; i < 10; i++) {
      game.move('up');
    }
    
    const pos = game.getProtagonistPosition();
    const s = -pos.q - pos.r;
    expect(Math.abs(pos.q)).toBeLessThanOrEqual(5);
    expect(Math.abs(pos.r)).toBeLessThanOrEqual(5);
    expect(Math.abs(s)).toBeLessThanOrEqual(5);
  });
});
```

**Example 2: Capture Mechanics Test**

```typescript
// tests/game/capture.test.ts
describe('Capture System', () => {
  it('should capture colored hex with 100% chance at base color', () => {
    const game = new GameTestFacade({ seed: 123 });
    
    // Найти гекс с базовым цветом (PlayerBaseColorIndex = 0)
    // Переместиться к нему
    game.moveTo(2, 1); // Предположим, там есть цвет #0
    
    // Захват: удержание Space
    game.holdSpace(6); // CaptureHoldDurationTicks = 6
    
    expect(game.isCarrying()).toBe(true);
    expect(game.getCellColor(2, 1)).toBe(null); // Клетка теперь пустая
  });

  it('should respect capture cooldown after failure', () => {
    const game = new GameTestFacade({ seed: 999 }); // Seed с гарантированным failure
    
    game.moveTo(3, 2); // Далёкий цвет (низкий шанс)
    game.holdSpace(6);
    
    expect(game.isCarrying()).toBe(false); // Неудача
    
    // Попытка сразу снова → должна быть заблокирована
    game.holdSpace(6);
    expect(game.isCarrying()).toBe(false);
    
    // Подождать cooldown (36 тиков)
    game.tick(36);
    game.holdSpace(6);
    // Теперь попытка должна быть обработана (может снова провалиться, но не игнорироваться)
  });
});
```

**Example 3: Build Template Test**

```typescript
// tests/game/templates.test.ts
describe('Build Template System', () => {
  it('should complete Simple Ring template', () => {
    const game = new GameTestFacade({ seed: 555 });
    
    game.activateTemplate('ring_r1');
    
    // Разместить 7 гексов одного цвета в форме кольца
    // (детальная логика зависит от реализации - это пример высокоуровневого теста)
    
    // Проверить завершение
    expect(game.isTemplateCompleted('ring_r1')).toBe(true);
  });
});
```

**Example 4: Invariant Test**

```typescript
// tests/game/invariants.test.ts
describe('Game Invariants', () => {
  it('should preserve total hex count during gameplay', () => {
    const game = new GameTestFacade({ seed: 777 });
    
    // Базовый подсчёт
    game.assertColorConservation(); // Устанавливает начальное значение
    
    // Выполнить серию операций
    game.eat();
    game.assertColorConservation();
    
    game.move('down');
    game.pressSpace(); // Положить гекс
    game.assertColorConservation();
    
    game.tick(100); // Прошло время
    game.assertColorConservation(); // Должно остаться неизменным
  });
});
```

#### 6.1.3. Facade Advantages ✅

1. **Stable Test API**
   - Тесты не ломаются при рефакторинге внутренностей
   - Фасад адаптируется к новой реализации, тесты остаются неизменными

2. **Implementation Agnostic**
   - Тесты описывают **что делает игра**, а не **как**
   - Можно переписать `pureLogic.ts` → `gameLogic/`, фасад останется прежним

3. **Clear Test Intent**
   - `game.move('up')` понятнее, чем `attemptMoveByDeltaOnActive(state, 0, params)`
   - Тесты читаются как спецификация поведения

4. **Deterministic Testing**
   - Фиксированный seed → воспроизводимые результаты
   - Нет зависимости от времени/random (если seed контролируется)

5. **Easy Setup**
   - Helpers для сложных сценариев (например, `setupGridWithPattern()`)
   - Меньше boilerplate в тестах

6. **Refactoring Safety Net**
   - Фасад выступает как "контракт" игры
   - Если тесты проходят → функциональность сохранена

#### 6.1.4. Facade Disadvantages ⚠️

1. **Extra Abstraction Layer**
   - Дополнительный код для поддержки (`GameTestFacade` ~200–300 строк)
   - Нужно обновлять фасад при добавлении новых фич

2. **Hidden Implementation Details**
   - Тесты не видят low-level проблемы (например, inefficient внутренние циклы)
   - Нужны дополнительные unit-тесты для внутренних модулей

3. **Learning Curve**
   - Новые разработчики должны понять и фасад, и реальную реализацию
   - Риск "двойной истины" (фасад != реальный код)

4. **Maintenance Overhead**
   - Если фасад сломался, все тесты падают
   - Нужна дисциплина: обновлять фасад синхронно с API

5. **Partial Coverage**
   - Фасад может не покрывать все edge-cases (например, прямой доступ к `GameState.tick`)
   - Требует design решений: что экспонировать, а что скрыть

6. **False Sense of Security**
   - Тесты могут проходить, но фасад содержит баги в адаптере
   - Нужны тесты на сам фасад (мета-тесты)

#### 6.1.5. Mitigation Strategies

**Для недостатков 1–2 (Overhead):**
- Генерировать фасад частично через code generation (например, из TypeScript типов)
- Использовать adapter pattern только для часто меняющихся частей

**Для недостатка 3 (Learning Curve):**
- Документировать фасад с примерами (живая документация через тесты)
- CI pipeline проверяет sync между фасадом и реализацией

**Для недостатка 4 (Maintenance):**
- Type-safe фасад: TypeScript гарантирует совместимость
- Regression tests: тестировать фасад отдельно

**Для недостатка 6 (False Security):**
- **Golden Tests**: Записать output текущей реализации, сравнивать после рефакторинга
- **Property-Based Testing**: QuickCheck-style тесты на инварианты

#### 6.1.6. Implementation Roadmap

**Phase 1: Design Facade API (Week 1)**
- [ ] Определить публичный API фасада (commands + queries)
- [ ] Написать TypeScript интерфейс `IGameTestFacade`
- [ ] Создать stub implementation (все методы — `throw new Error('Not implemented')`)

**Phase 2: Implement Facade Adapter (Week 2)**
- [ ] Реализовать адаптер для текущей `pureLogic.ts`
- [ ] Написать smoke test: проверить базовые сценарии
- [ ] Зафиксировать golden snapshots (сериализованные GameState после операций)

**Phase 3: Write Comprehensive Tests (Week 3)**
- [ ] Movement tests (~10 сценариев)
- [ ] Capture tests (~15 сценариев, включая probabilities)
- [ ] Inventory/Hotbar tests (~8 сценариев)
- [ ] Template tests (~6 шаблонов × 2 сценария)
- [ ] Tutorial tests (~4 уровня)
- [ ] Invariant tests (~5 глобальных правил)

**Phase 4: Refactor with Confidence (Weeks 4–6)**
- [ ] Начать рефакторинг `pureLogic.ts` → `gameLogic/`
- [ ] **Не трогать тесты**, только адаптировать фасад внутри
- [ ] После каждого модуля: запускать `npm test`, проверять golden snapshots
- [ ] Если тест упал → либо фасад неправильно адаптирован, либо регрессия

**Phase 5: Cleanup (Week 7)**
- [ ] Удалить старый `pureLogic.ts`
- [ ] Упростить фасад (убрать временные adapters)
- [ ] Финальная проверка: все тесты проходят, coverage >70%

### 6.2. Incremental Approach

**Не переписывать всё сразу** — риск сломать рабочую версию.

**Preferred Strategy:** Test Facade + Feature-by-feature migration.

#### Step 1: Create Test Facade
```
src/
├── logic/
│   └── pureLogic.ts          # Текущая реализация
├── components/
│   └── Game.tsx
└── tests/
    └── facade/
        └── GameTestFacade.ts # Стабильный тестовый API
```

**Actions:**
- Спроектировать фасад API (commands, queries, assertions)
- Реализовать adapter для текущей `pureLogic.ts`
- Написать smoke tests для проверки фасада

#### Step 2: Write Comprehensive Tests
```
tests/
├── facade/
│   ├── GameTestFacade.ts
│   └── GameTestFacade.test.ts  # Тесты на сам фасад
├── game/
│   ├── movement.test.ts
│   ├── capture.test.ts
│   ├── inventory.test.ts
│   ├── templates.test.ts
│   └── tutorial.test.ts
└── snapshots/
    └── golden/                 # Golden snapshots для регрессий
```

**Coverage Target:** 70%+ критической логики (movement, capture, inventory).

#### Step 3: Dual Architecture (Временно)
```
src/
├── logic/
│   └── pureLogic.ts          # Старая логика (deprecated)
├── gameLogic/                 # Новая логика (рефакторинг)
│   ├── core/
│   ├── systems/
│   └── ...
└── tests/
    └── facade/
        └── GameTestFacade.ts # Адаптирован к gameLogic/ внутри
```

**Process:**
1. Рефакторить модуль (например, `movement.ts`)
2. Обновить **только фасад** (заменить импорты `pureLogic` → `gameLogic`)
3. Запустить тесты → если проходят, продолжить
4. Если упали → либо баг в рефакторинге, либо баг в фасаде

#### Step 4: Progressive Migration Per System

**Module-by-Module:**
- ✅ Week 1: `gameLogic/core/` (types, grid utils)
- ✅ Week 2: `gameLogic/systems/movement.ts`
- ✅ Week 3: `gameLogic/systems/capture.ts`
- ✅ Week 4: `gameLogic/systems/inventory.ts`
- ✅ Week 5: `gameLogic/systems/template.ts`
- ✅ Week 6: `appLogic/sessionReducer.ts`

**Key Principle:** Тесты НЕ меняются, только фасад адаптируется.

#### Step 5: Complete Migration
- Удалить `pureLogic.ts` (все функции мигрированы)
- Упростить фасад (убрать adapter overheads)
- Финальная проверка: все тесты зелёные, coverage report

**Total Timeline:** 6–7 недель при неполной занятости (2–3 часа/день).

### 6.3. Risk Mitigation with Test Facade

**Risks:**

1. **Breaking Changes**: Новые механики несовместимы с сохранёнными сессиями.
   - *Solution*: Версионирование `GameState`, миграции. Тесты покрывают backward compatibility.

2. **Performance Regression**: Новая архитектура медленнее.
   - *Solution*: Benchmarks до/после. Фасад позволяет легко сравнивать производительность (A/B testing).

3. **Scope Creep**: Рефакторинг затягивается, feature development останавливается.
   - *Solution*: Time-box для каждой фазы. Фасад позволяет рефакторить параллельно с разработкой (тесты защищают от регрессий).

4. **Facade Becomes Obsolete**: Фасад устарел после завершения рефакторинга.
   - *Solution*: Оставить фасад как **основной тестовый API**. Он ценен не только для миграции, но и для будущих рефакторингов.

5. **Facade Contains Bugs**: Адаптер в фасаде содержит ошибки, скрывающие реальные проблемы.
   - *Solution*: **Golden Tests**. Записать snapshots текущей реализации, сравнивать после каждогоизменения.

**Golden Testing Strategy:**

```typescript
// tests/golden/golden.test.ts
import { readFileSync, writeFileSync } from 'fs';
import { GameTestFacade } from '../facade/GameTestFacade';

describe('Golden Tests (Regression Prevention)', () => {
  it('should produce identical state after standard scenario', () => {
    const game = new GameTestFacade({ seed: 42 });
    
    // Выполнить фиксированный сценарий
    game.move('up');
    game.move('right');
    game.eat();
    game.tick(10);
    
    const finalState = game.getState();
    const serialized = JSON.stringify(finalState, null, 2);
    
    // При первом запуске: записать golden snapshot
    const goldenPath = './tests/snapshots/golden/standard-scenario.json';
    if (!fs.existsSync(goldenPath)) {
      writeFileSync(goldenPath, serialized);
      console.warn('Golden snapshot created. Review and commit it.');
      return;
    }
    
    // При последующих запусках: сравнить с golden
    const golden = readFileSync(goldenPath, 'utf-8');
    expect(serialized).toBe(golden);
  });
});
```

**Benefits:**
- Любое отклонение в поведении → тест падает
- Ревью diff'а показывает, что изменилось
- Защита от "тихих" регрессий (например, изменение вероятности захвата)

### 6.4. Comparison: Test Facade vs Direct Testing

| Критерий | Test Facade | Direct Testing |
|----------|-------------|----------------|
| **Стабильность тестов** | ✅ Высокая (API не меняется) | ❌ Низкая (тесты ломаются при рефакторинге) |
| **Читаемость** | ✅ `game.move('up')` | ⚠️ `attemptMoveByDeltaOnActive(s, 0, p)` |
| **Изоляция от деталей** | ✅ Тесты не знают о `pureLogic.ts` | ❌ Тесты завязаны на конкретные функции |
| **Overhead** | ⚠️ +300 строк фасада | ✅ Нет дополнительного кода |
| **Поддержка** | ⚠️ Нужно синхронизировать с API | ✅ Тесты напрямую вызывают код |
| **Рефакторинг-friendly** | ✅ Максимальная защита | ❌ Тесты блокируют рефакторинг |
| **Edge-case coverage** | ⚠️ Зависит от дизайна фасада | ✅ Прямой доступ ко всем деталям |

**Recommendation:**  
**Hybrid Approach** — использовать фасад для **integration tests** (сценарии игры), но оставить **unit tests** для критических модулей (capture probability, grid algorithms).

```
tests/
├── integration/           # Через GameTestFacade
│   ├── gameplay.test.ts
│   └── templates.test.ts
└── unit/                  # Прямые тесты
    ├── capture.test.ts    # Тестируют captureChance() напрямую
    └── grid.test.ts       # Тестируют hexToPixel(), axialDistance()
```

---

## 7. Test Facade: Conclusion & Recommendation

### 7.1. Verdict

**Test Facade Pattern — оптимальная стратегия для HexiGame** по следующим причинам:

✅ **Защита от регрессий**: Текущая функциональность фиксируется тестами **до** рефакторинга  
✅ **Стабильность**: Тесты не ломаются при изменении внутренней реализации  
✅ **Документация**: Фасад служит живой спецификацией игровой логики  
✅ **Parallel Development**: Можно добавлять новые фичи, пока идёт рефакторинг  
✅ **Long-Term Value**: Фасад остаётся полезным после завершения миграции

⚠️ **Trade-offs**:
- Требует дисциплины (синхронизация фасада с API)
- Overhead ~300 строк кода
- Риск "двойной истины" (фасад vs реальность)

**Mitigation**: Golden tests + hybrid approach (facade для integration, прямые тесты для unit).

### 7.2. Recommended Timeline

**Оптимистичный сценарий** (2–3 часа/день):

| Неделя | Milestone | Deliverable | Статус |
|--------|-----------|-------------|--------|
| 1 | Design Facade API | `GameTestFacade.ts` (interface + stub) | ✅ Готово |
| 2 | Implement Adapter | Facade работает с текущим `pureLogic.ts` | ✅ Готово |
| 3 | Write Tests | 40+ тестов (movement, capture, inventory, templates) | ✅ Готово (96 тестов) |
| 4 | Golden Snapshots | 10 golden scenarios, regression baseline | ✅ Готово (`tests/golden/`) |
| 5–6 | Refactor Core | `gameLogic/core/`, `systems/movement`, `systems/capture` | ✅ Готово |
| 7 | Refactor Advanced | `systems/inventory`, `systems/template` | ✅ Готово |
| 8 | Session Layer | `appLogic/sessionReducer.ts`, `viewModel.ts` | ✅ Готово |
| 9 | UI Integration | `ui/components/Game.tsx` uses new architecture | ⏳ Следующий |
| 10 | Cleanup | Delete `pureLogic.ts`, simplify facade, final tests | ⏳ Следующий |

**Pessimistic сценарий** (+50% time): 15 недель (~4 месяца).

### 7.3. Success Criteria

Рефакторинг считается завершённым, когда:

- ✅ Все тесты проходят (100% pass rate)
- ✅ Coverage ≥ 70% для `gameLogic/`
- ✅ Golden tests показывают 100% соответствие
- ✅ Производительность не ухудшилась (benchmark)
- ✅ `pureLogic.ts` удалён из кодовой базы
- ✅ Новые фичи добавляются через новую архитектуру
- ✅ Документация обновлена (GAME_LOGIC.md ссылается на `gameLogic/`)

---

## 8. Actionable Next Steps

### Completed (Phases 1–8) ✅

1. **Review `refactor-notes.md`** ✅
2. **Create `docs/GAME_ARCHITECT.md`** ✅ (этот документ)
3. **Test Facade Strategy** ✅ — выбрана Facade-First

**Weeks 1–2: Test Facade**
- [x] Создать `tests/facade/GameTestFacade.ts` (interface)
- [x] Реализовать `PureLogicAdapter.ts` для `pureLogic.ts`
- [x] Создать `AppTestFacade.ts` + `AppLogicAdapter.ts` (app-level)
- [x] Setup Vitest + test infrastructure

**Weeks 3–4: Comprehensive Testing**
- [x] Smoke tests (13 сценариев)
- [x] Movement tests (11 сценариев)
- [x] Inventory/Hotbar tests (12 сценариев)
- [x] Invariant tests (14 сценариев)
- [x] App-logic tests (46 сценариев: keyboard, settings, mobile)
- [x] Golden snapshot tests (10 сценариев: `tests/golden/golden.test.ts`)
- [x] **Итого**: 106 тестов, все проходят ✅

**Weeks 5–7: Core Refactoring**
- [x] Create `src/gameLogic/core/types.ts` (Axial, Cell, Grid, GameState)
- [x] Create `src/gameLogic/core/grid.ts` (grid helpers, pathfinding)
- [x] Create `src/gameLogic/core/params.ts` (Params, DefaultParams)
- [x] Create `src/gameLogic/core/tick.ts` (game loop)
- [x] Create `src/gameLogic/systems/movement.ts`
- [x] Create `src/gameLogic/systems/capture.ts`
- [x] Create `src/gameLogic/systems/inventory.ts`
- [x] Create `src/gameLogic/systems/template.ts`
- [x] Create `src/gameLogic/index.ts` (barrel re-exports)
- [x] Update `src/logic/pureLogic.ts` → re-exports from `gameLogic/` (backwards compat)
- [x] Update facade adapter → imports from `gameLogic/` directly
- [x] Verify: все 106 тестов проходят ✅

**Week 8: Session Layer**
- [x] Create `src/appLogic/sessionReducer.ts` (GameCommand + sessionReducer)
- [x] Create `src/appLogic/viewModel.ts` (GameViewModel + buildGameViewModel)

### Next Steps (Phases 9–10)

**Week 9: UI Integration**
- [x] Create `src/ui/hooks/useGameSession.ts` (useReducer + sessionReducer + tick loop + session persistence)
- [x] Create `src/ui/hooks/useKeyboardInput.ts` (keyboard → GameCommand dispatch)
- [x] Extend `src/appLogic/sessionReducer.ts` with full command set (drag, hotbar, template, tutorial)
- [x] Update `src/components/Game.tsx`: removed 150+ lines of inline logic, uses hooks
- [x] All 106 tests still pass ✅

**Week 10: Cleanup**
- [ ] Delete `src/logic/pureLogic.ts` 🎉
- [ ] Simplify facade adapter (no more pureLogic dependency)
- [ ] Final test run: 100% pass, coverage ≥ 70%

### Post-Refactoring (Week 11+)

- [ ] Performance profiling: compare old vs new
- [ ] Add EventBus для audio/analytics (Priority 3)
- [ ] Add Zod schemas для Params (Priority 5)
- [ ] Update GAME_LOGIC.md (ссылки на `gameLogic/`)
- [ ] Write modding guide (`docs/MODDING.md`)

---

## 9. Conclusion

HexiGame имеет **солидный фундамент** с чистой функциональной логикой и модульными системами. Основные проблемы — **монолитные файлы** и **незавершённый рефакторинг**.

**Ключевые решения:**

1. ✅ **Test Facade Pattern** — защищает от регрессий при рефакторинге
2. ✅ **Hybrid Testing** — Integration tests (facade) + Unit tests (прямые)
3. ✅ **Golden Snapshots** — фиксируют текущее поведение для сравнения
4. ✅ **Incremental Migration** — модуль за модулем, тесты как safety net

**Стратегия рефакторинга:**

- **Phase 1** (Weeks 1–2): Создать Test Facade, написать тесты на текущую реализацию
- **Phase 2** (Weeks 3–4): Comprehensive test coverage (40+ тестов)
- **Phase 3** (Weeks 5–10): Пошаговый рефакторинг с адаптацией фасада
- **Phase 4** (Week 11+): Cleanup, performance optimization, новые фичи

**Почему Test Facade оптимален для HexiGame:**

✅ **Большой монолит** (`pureLogic.ts` 876 строк) → фасад скрывает сложность  
✅ **Незавершённый рефакторинг** → тесты защищают от повторного отката  
✅ **Функциональный код** → легко тестировать через фасад (pure functions)  
✅ **Долгосрочная ценность** → фасад остаётся как тестовый API навсегда  

**Альтернативная стратегия** (если нет времени на фасад):

- Написать прямые unit-tests на критические функции (`captureChance`, `attemptMove`)
- Разбить `pureLogic.ts` на модули постепенно
- Переписывать тесты по мере рефакторинга

**⚠️ Риски альтернативы**:
- Тесты придётся переписывать многократно
- Высокий риск внести баги в тесты при переписывании
- Нет гарантии, что поведение не изменилось

**Рекомендация автора документа:**  
**Test Facade First** → потратить 2 недели на фасад и тесты, потом 6–8 недель на безопасный рефакторинг с полной уверенностью в стабильности.

**Альтернатива** (без фасада) → 3–4 недели рефакторинга, но с риском регрессий и необходимостью ручного тестирования каждого изменения.

**ROI Test Facade**: 2 недели investment → экономия 4–6 недель на debugging + долгосрочная ценность (~300 строк reusable тестового API).

---

**Document Prepared By:** AI Architecture Agent  
**For Review By:** Lead Developer, Technical Stakeholders  
**Next Action:** Approve Test Facade strategy → Start Week 1 (Design Facade API)  
**Updated:** February 27, 2026 — Added comprehensive Test Facade analysis
