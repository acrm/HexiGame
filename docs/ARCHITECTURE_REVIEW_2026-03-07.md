# HexiGame — Актуальный архитектурный обзор

**Дата:** 2026-03-07  
**Версия кода:** 2026w10-0.37

---

## 1) Executive Summary

Проект находится в рабочем состоянии с уже выделенными слоями `gameLogic` / `appLogic` / `ui`, и архитектура стала заметно чище после переноса части orchestration из UI в `appLogic`.

Текущее распределение кода (TS/TSX):

- `src/ui`: **4363** строк
- `src/appLogic`: **955** строк
- `src/gameLogic`: **1006** строк
- `src/templates`: **698** строк
- `src/tutorial`: **215** строк
- Всего `src`: **7541** строк

**Вывод:** переход к трёхслойной схеме успешно идёт, но UI всё ещё перегружен крупными orchestration/renderer-файлами.

---

## 2) Текущая структура слоёв

```text
src/
├── gameLogic/
│   ├── core/      # типы, params, grid, tick
│   └── systems/   # movement, inventory, capture, template
├── appLogic/
│   ├── sessionReducer.ts
│   ├── viewModel.ts
│   ├── appShellReducer.ts
│   ├── sessionHistory.ts
│   ├── userSettings.ts
│   └── integration.*.ts
├── ui/
│   ├── components/
│   ├── hooks/
│   ├── i18n.ts
│   └── colorScheme.ts
├── templates/
├── tutorial/
└── audio/
```

### Роли слоёв

- `gameLogic`: чистая доменная логика (без React)
- `appLogic`: команды/состояния уровня приложения, storage-адаптеры и platform integration
- `ui`: визуализация, обработка пользовательского ввода, wiring

---

## 3) Что уже сделано правильно

1. **Командная модель состояния игры**
   - `sessionReducer` стал стабильной точкой входа для изменений `GameState`.

2. **Рост appLogic-слоя**
   - Вынесены отдельные модули:
     - `appShellReducer` (guest/settings/tab/pause/session meta)
     - `sessionHistory` (история сессий + persistence)
     - `userSettings` (настройки + persistence)

3. **Изоляция доменных подсистем**
   - `gameLogic/systems/*` разделяет movement/inventory/capture/template.

4. **Тестовый каркас и регрессии**
   - Полный suite стабилен: **129/129**
   - Отдельные тесты на appLogic-модули уже есть (`appShellReducer`, `sessionHistory`, `userSettings`).

5. **Платформенная интеграция через alias**
   - В `vite.config.mts` используется build-time alias `integration.impl`.

---

## 4) Архитектурные узкие места (по факту кода)

### 4.1 Крупнейшие файлы

- `src/ui/components/GameField/GameField.tsx` — **766** строк
- `src/ui/components/Game.tsx` — **685** строк
- `src/templates/templateLibrary.ts` — **370** строк
- `src/ui/hooks/useGameSession.ts` — **264** строки
- `src/audio/audioManager.ts` — **254** строки

### 4.2 Coupling и ответственность

1. **`GameField.tsx`**
   - Смешаны canvas-рендеринг, touch/mouse input, hotbar hit-testing, tutorial overlays.
   - Это главный UI-монолит на сегодня.

2. **`Game.tsx`**
   - Значительно лучше после рефакторинга, но остаётся тяжёлым orchestration-компонентом:
     - tutorial flow
     - gameplay lifecycle
     - audio lifecycle
     - связь между `appShell`, `sessionReducer`, `settings`.

3. **`useGameSession.ts`**
   - Находится в `ui/hooks`, но содержит сериализацию и `localStorage` сессионного состояния.
   - По ответственности ближе к `appLogic` (session repository/controller).

4. **Дублирование инициализации integration**
   - `integration.init()` и `onGameReady()` вызываются в `src/index.tsx` и в `Game.tsx`.
   - Это создаёт риск двойной инициализации side-effects.

5. **Persistence всё ещё частично в UI**
   - Использования `localStorage` по файлам:
     - `src/ui/components/Game.tsx`: 11
     - `src/ui/hooks/useGameSession.ts`: 9
     - `src/ui/i18n.ts`: 2
     - `src/audio/audioManager.ts`: 2
     - `src/appLogic/integration.yandex.ts`: 2

---

## 5) Готовность к смене UI-технологии

**Текущая оценка:** средняя (≈ 6.5/10).

Плюсы для миграции:
- Домен (`gameLogic`) уже выделен
- Есть app-level reducer pattern
- Есть тестовый фасад и регрессии

Ограничители:
- Сессионный persistence/controller пока в `ui/hooks/useGameSession.ts`
- Сильная зависимость canvas-рендера и input orchestration в `GameField.tsx`
- Часть жизненного цикла платформы/аудио всё ещё управляется в React-компоненте

---

## 6) Рекомендованный roadmap (архитектурный)

### P0 (следующий шаг)

1. Вынести `useGameSession` в `appLogic/sessionController` + `sessionRepository`
   - UI оставляет только подписку/диспетчеризацию.

2. Убрать двойную инициализацию integration
   - Оставить единый orchestration entrypoint.

### P1

3. Разделить `GameField.tsx`:
   - `renderWorldLayer`
   - `renderHudLayer`
   - `usePointerInput` / `useTouchInput`
   - `useGameFieldViewport`

4. Вынести tutorial flow orchestration из `Game.tsx` в `appLogic/tutorialFlow`.

### P2

5. Перевести `audioManager` на порт/адаптер в `appLogic` (UI только отправляет intents).
6. Сделать unified storage adapter (browser/in-memory) для unit/integration тестов.

---

## 7) Контрольные критерии архитектуры

Считать слой `ui` «тонким», когда одновременно выполнены пункты:

- В `ui` отсутствует бизнес-логика, связанная с persistence/recovery.
- `Game.tsx` не управляет жизненным циклом gameplay/platform напрямую.
- `GameField.tsx` состоит из composable renderer/input модулей.
- Все сценарии app-level поведения тестируются через `appLogic` без React.

---

## 8) Короткий итог

Архитектурный вектор выбран верно и уже даёт эффект: `appLogic` расширен, UI-слой стал чище, regressions покрыты тестами. Главная оставшаяся задача — завершить перенос session/audio/tutorial orchestration из React-слоя в `appLogic` и разрезать `GameField.tsx` на явные модули.
