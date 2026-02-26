# HexiGame — Architecture & Refactoring Strategy

**Document Version:** 1.0  
**Last Updated:** February 26, 2026  
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

### 6.1. Incremental Approach

**Не переписывать всё сразу** — риск сломать рабочую версию.

**Preferred Strategy:** Feature-by-feature migration.

#### Step 1: Dual Architecture (Временно)
```
src/
├── logic/
│   └── pureLogic.ts          # Старая логика (deprecated, но работает)
├── gameLogic/                 # Новая логика (постепенно заполняется)
│   ├── core/
│   ├── systems/
│   └── ...
├── components/
│   └── Game.tsx              # Использует СТАРУЮ логику
└── ui/components/
    └── GameNew.tsx           # Использует НОВУЮ логику (для тестирования)
```

#### Step 2: Feature Toggles
```typescript
// src/config.ts
export const USE_NEW_ARCHITECTURE = import.meta.env.VITE_NEW_ARCH === 'true';

// ui/index.tsx
const GameComponent = USE_NEW_ARCHITECTURE ? GameNew : Game;
```

#### Step 3: Parallel Testing
- Запускать старую и новую версии параллельно
- Сравнивать состояния (snapshot тесты)
- Когда новая версия 100% совместима → удалить старую

#### Step 4: Complete Migration
- Удалить `pureLogic.ts`, старые хуки
- Переименовать `ui/components/GameNew.tsx` → `Game.tsx`
- Обновить документацию

**Total Timeline:** 3–4 недели при неполной занятости (2–3 часа/день).

### 6.2. Risk Mitigation

**Risks:**

1. **Breaking Changes**: Новые механики несовместимы с сохранёнными сессиями.
   - *Solution*: Версионирование `GameState`, миграции.

2. **Performance Regression**: Новая архитектура медленнее.
   - *Solution*: Benchmarks до/после, профилирование.

3. **Scope Creep**: Рефакторинг затягивается, feature development останавливается.
   - *Solution*: Time-box для каждой фазы, приоритизация Priority 1 задач.

---

## 7. Actionable Next Steps

### Immediate (This Week)

1. **Review `refactor-notes.md`** ✅ (уже сделано в этом документе)
2. **Create `docs/GAME_ARCHITECT.md`** ✅ (этот документ)
3. **Decide**: Завершить рефакторинг ИЛИ заморозить и развивать на текущей базе?
   - Если **Завершить**: Начать с Priority 1, Step 1 (создать `gameLogic/core/`)
   - Если **Заморозить**: Удалить `refactor-notes.md`, документировать текущую архитектуру как финальную

### Short-Term (Next 2 Weeks)

**Option A: Complete Refactor Route**
- [ ] Implement `gameLogic/core/` (types, grid, params)
- [ ] Migrate movement system to `gameLogic/systems/movement.ts`
- [ ] Create `appLogic/sessionReducer.ts` stub
- [ ] Test dual architecture with feature toggle

**Option B: Improve Current Architecture**
- [ ] Split `GameField.tsx` на 3 файла (Renderer, InputHandler, Component)
- [ ] Extract `Game.tsx` HUD в отдельный компонент
- [ ] Add JSDoc для ключевых функций `pureLogic.ts`
- [ ] Setup Vitest, написать первые тесты для capture logic

### Mid-Term (Next Month)

- [ ] Implement EventBus для audio/analytics
- [ ] Add Zod schemas для Params и Build Templates
- [ ] Create modding guide (`docs/MODDING.md`)
- [ ] Performance profiling: измерить baseline FPS

### Long-Term (Next Quarter)

- [ ] Complete migration to three-layer architecture
- [ ] Achieve 70%+ test coverage
- [ ] Mobile app prototype (React Native)
- [ ] Community mod contest (если modding готов)

---

## 8. Conclusion

HexiGame имеет **солидный фундамент** с чистой функциональной логикой и модульными системами. Основные проблемы — **монолитные файлы** и **незавершённый рефакторинг**.

**Ключевые решения:**

1. **Завершить трёхслойную архитектуру** — критично для масштабируемости.
2. **Разбить большие файлы** — улучшит поддерживаемость.
3. **Добавить тесты** — защитит от регрессий при рефакторинге.
4. **Внедрить EventBus** — упростит интеграцию новых систем.

**Выбор стратегии зависит от приоритетов:**
- **Если важна скорость разработки новых фич** → Option B (улучшить текущую архитектуру, отложить большой рефакторинг).
- **Если важна долгосрочная поддержка** → Option A (завершить рефакторинг сейчас, потом развивать на чистой базе).

Рекомендация автора документа: **Option A** (завершить рефакторинг), т.к. `refactor-notes.md` уже описывает plan, и откладывание приведёт к углублению техдолга.

---

**Document Prepared By:** AI Architecture Agent  
**For Review By:** Lead Developer, Technical Stakeholders  
**Next Action:** Обсудить выбор стратегии (Option A vs Option B), утвердить roadmap
