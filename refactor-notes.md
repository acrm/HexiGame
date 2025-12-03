# HexiGame UI/Logic Refactor Notes

> Этот файл фиксирует решения и шаги рефакторинга, чтобы его можно было воспроизвести после отката.

## 1. Цель рефакторинга

- Разделить код на три слоя:
  - **gameLogic** — чистая доменная логика игры (без React и побочек).
  - **appLogic** — сессия, редьюсер, view model для UI.
  - **ui** — React-компоненты и хуки.
- Убрать монолитную `pureLogic` и старые хуки, заменить их новой архитектурой.
- Перенести все React-компоненты в пространство `src/ui`.

## 2. Структура после рефакторинга

Планируемая целевая структура `src/`:

- `gameLogic/`
  - `params.ts` — параметры игры (`GameParams`, `DefaultGameParams`, `mulberry32`).
  - `types.ts`, `board.ts`, `capture.ts`, `selectors.ts` и др. — чистая логика.
- `appLogic/`
  - `sessionTypes.ts` — состояние сессии и meta (в т.ч. `lastCursor`, `releaseTarget`, флаги action-mode, charging/releasing и т.п.).
  - `sessionReducer.ts` — редьюсер команд (таймер, тики, движение курсора, черепашка, захват, релиз и т.д.).
  - `viewModel.ts` — `buildGameViewModel(state: GameSessionState): GameViewModel`.
- `ui/`
  - `hooks/`
    - `useGameSession.ts` — инициализирует редьюсер, создаёт `GameViewModel`, пробрасывает `dispatchCommand` и `params`.
    - `useKeyboardInput.ts` — вешает обработчики клавиатуры и маппит их в `GameCommand`.
  - `components/`
    - `Game.tsx` — корневой компонент игры, использует хуки и UI-компоненты.
    - `GameField.tsx` — React-обёртка вокруг канваса с полем и мобильным управлением.
    - `ControlsInfoDesktop.tsx`, `ControlsInfoMobile.tsx` — блоки подсказок.
    - `PaletteCluster.tsx` — ромбовидный кластер палитры.
  - корневые UI-файлы:
    - `Game.css` — стили игрового экрана.
    - `GameField.tsx`, `ControlsInfo*.tsx`, `PaletteCluster.tsx` — может быть вынесены и на этот уровень (в зависимости от финального решения по структуре).
- Корень `src/`:
  - `ui/index.tsx` — точка входа React-приложения.
  - `index.tsx` — либо заглушка, либо перенаправление (для старых путей).

## 3. Удалённый/устаревший код

В ходе рефакторинга было принято решение **избавиться** от следующих сущностей (они больше не должны использоваться в целевой архитектуре):

- `src/logic/pureLogic.ts` — старый монолитный движок игры на чистых функциях.
- `src/hooks/useGameEngine.ts`, `src/hooks/useGameInput.ts` — старые хуки, обёртки вокруг `pureLogic`.
- Вся папка `src/components` — старые React-компоненты и стили, которые изначально задумывались к переносу в `src/ui`, а потом к удалению.

## 4. Новые ключевые элементы

### 4.1. `GameViewModel`

- Находится в `src/appLogic/viewModel.ts`.
- Описывает все данные, нужные UI:
  - `tick`, `remainingSeconds`.
  - `isInventory` (активное поле: мир или инвентарь).
  - `cursor`, `protagonist` (позиция и направление черепашки).
  - `carriedAnchor` — переносимый шестиугольник.
  - `hoverWorldColorIndex`, `hoverInventoryColorIndex`.
  - `captureChancePercent: number | null` — вероятность захвата под курсором.
  - `isCarryFlickerOn` — нужен для мерцания переносимого гекса.
  - `paletteCounts: Record<string, number>` — статистика съеденных цветов.
  - `worldCells`, `inventoryCells` — плоские массивы для отрисовки поля.
  - `isInCooldown`, `isCharging`, `isReleasing`, `isActionMode` — флаги режима захвата/релиза.

### 4.2. `useGameSession`

- Находится в `src/ui/hooks/useGameSession.ts`.
- Отвечает за:
  - Инициализацию состояния сессии, включая параметры (`GameParams`) и seed.
  - Запуск тиков (game-loop) с частотой `tickRate`.
  - Применение редьюсера `sessionReducer` на каждую команду/тик.
  - Возврат `viewModel`, `params`, `dispatchCommand` в UI.

### 4.3. `useKeyboardInput`

- Находится в `src/ui/hooks/useKeyboardInput.ts`.
- Навешивает глобальные слушатели на `window` / `document`.
- Преобразует события клавиатуры в команды типа:
  - `MoveCursorDelta`, `MoveCursorTo`.
  - `ToggleInventory`.
  - `ActionPressed` / `ActionReleased`.
  - `EatRequested`.

### 4.4. Новый `Game` в `src/ui/components/Game.tsx`

- Подключает `Game.css`.
- Использует `useGameSession` и `useKeyboardInput`.
- Считает derived-поля для HUD:
  - `chance` из `viewModel.captureChancePercent`.
  - `hoverColorIndex` из `viewModel` (разные для мира и инвентаря).
  - `eatenCounts` из `viewModel.paletteCounts`.
  - Определяет `antagonistIndex` исходя из длины палитры.
- Рендерит:
  - Верхнюю панель с `PaletteCluster` и кнопкой `i` на мобиле.
  - Блок подсказок `ControlsDesktop` (на десктопе).
  - Мобильный попап `ControlsMobile`.
  - `GameField` с колбэками, подключёнными к dispatch команд.

## 5. Перенос компонентов в `ui`

План по переносу был такой:

1. **Скопировать** реализацию из старых файлов `src/components/*` в новые пути:
   - `src/ui/Game.css` ← `src/components/Game.css`.
   - `src/ui/ControlsInfoDesktop.tsx` ← `src/components/ControlsInfoDesktop.tsx`.
   - `src/ui/ControlsInfoMobile.tsx` ← `src/components/ControlsInfoMobile.tsx`.
   - `src/ui/PaletteCluster.tsx` ← `src/components/PaletteCluster.tsx`.
   - `src/ui/GameField.tsx` ← `src/components/GameField.tsx`.

2. В новых файлах **исправить пути импортов** на новые слои:
   - Всё, что ссылалось на старый `../logic/*` или `../pureLogic`, заменить на `../gameLogic/*` / `../appLogic/*` / `../ui/hooks/*` в соответствии с новой архитектурой.
   - Убедиться, что типы (`GameParams`, `GameViewModel`) берутся из `gameLogic/params` и `appLogic/viewModel`.

3. На переходный период можно было держать:
   - В `src/ui/components` маленькие файлы-обёртки `export { default } from '../PaletteCluster';` и т.п.
   - А уже потом, после успешного переноса и проверки, удалить `src/components`.

## 6. Что пошло не так

### 6.1. Удаление `src/components` раньше, чем полный перенос

- Папка `src/components` была удалена **до** того, как все её реализации (особенно `GameField`) были перенесены в `src/ui`.
- Вместо немедленного копирования старого `GameField` была создана упрощённая версия `src/ui/GameField.tsx`, которая:
  - Рисовала только сетку и точки.
  - Не рисовала черепашку и курсор в прежнем виде.
  - Содержала упрощённые обработчики кликов (например, `onSetCursor(0, 0)`).
- Аналогично для `ControlsInfo*` и `PaletteCluster` изначально были сделаны упрощённые варианты, а не прямые копии старых.

### 6.2. Runtime-ошибки и регрессии

- Из-за того, что `viewModel.captureChancePercent` может быть `null`, а компоненты временами ожидали всегда `number` и делали `chance.toFixed(0)`, возникала ошибка `Cannot read properties of null (reading 'toFixed')`.
- Визуальные регрессии:
  - Пропали: черепашка, сложный курсор с режимами, инвентарный режим как в старой версии.
  - Панели управления стали проще из-за временных реализаций.

### 6.3. Частичный откат вручную

- В какой-то момент старые компоненты были вручную вытащены из предыдущего коммита с помощью:
  ```bash
  git show HEAD^:src/components/PaletteCluster.tsx > src/ui/PaletteCluster.tsx
  ```
  и аналогичных команд (планировалось то же для `GameField` и других).
- Это правильная стратегия для восстановления старого визуала, но её нужно довести до конца **последовательно**.

## 7. Рекомендованный сценарий повторного рефакторинга

Если ты сейчас откатываешь изменения и хочешь повторить рефакторинг аккуратно, вот рекомендуемый порядок:

1. **Шаг 1: Ввести новую архитектуру (logic/app/ui)**
   - Добавить `gameLogic/*`, `appLogic/*`, `ui/hooks/*`, `ui/components/Game.tsx`, не трогая `src/components`.
   - Настроить `useGameSession`, `useKeyboardInput`, `buildGameViewModel`.
   - В `src/index.tsx` переключить рендер на `ui/components/Game.tsx`, но сам `Game` пока может использовать старые компоненты через реэкспорт.

2. **Шаг 2: Обвязки вокруг старых компонентов**
   - В `src/ui/components` создать файлы-обёртки:
     - `ControlsInfoDesktop.tsx`: `export { default } from '../../components/ControlsInfoDesktop';`
     - `ControlsInfoMobile.tsx`: `export { default } from '../../components/ControlsInfoMobile';`
     - `PaletteCluster.tsx`: `export { default } from '../../components/PaletteCluster';`
     - `GameField.tsx`: `export { default } from '../../components/GameField';`
   - Убедиться, что новый `Game` использует эти обёртки, а древний `Game` больше нигде не импортируется.

3. **Шаг 3: Перенос реализаций из `components` в `ui`**
   - Копировать файлы из старых путей в `src/ui/*.tsx`:
     ```bash
     cp src/components/Game.css src/ui/Game.css
     cp src/components/ControlsInfoDesktop.tsx src/ui/ControlsInfoDesktop.tsx
     cp src/components/ControlsInfoMobile.tsx src/ui/ControlsInfoMobile.tsx
     cp src/components/PaletteCluster.tsx src/ui/PaletteCluster.tsx
     cp src/components/GameField.tsx src/ui/GameField.tsx
     ```
   - Внутри этих новых файлов поправить только импорты (на `../gameLogic/*`, `../appLogic/*` и т.п.).
   - Обёртки в `src/ui/components/*` переключить на `../ControlsInfoDesktop` и т.п., а не на `../../components/...`.

4. **Шаг 4: Убедиться, что всё визуально совпадает**
   - Пройтись по игре руками:
     - Черепашка, курсор, переходы между World/Inventory.
     - Панель палитры (diamond-кластер) и подсказки.
     - Touch-управление на мобильной вёрстке.

5. **Шаг 5: Только после этого удалять `src/components`**
   - Убедиться `grep`-ом, что ничего больше не импортирует из `src/components`.
   - Удалить папку:
     ```bash
     rm -rf src/components
     ```

6. **Шаг 6: Очистка**
   - Удалить старую `src/logic/pureLogic.ts` и неиспользуемые хуки из `src/hooks/*`.
   - При желании — привести `src/index.tsx` к аккуратному виду (либо прокидывать на `ui/index.tsx`, либо сразу рендерить `Game` оттуда).

## 8. Вывод

- Мы оказались в текущей ситуации, потому что **компоненты из `src/components` были удалены до того, как их реализация 1:1 была перенесена в `src/ui`**.
- В процессе я создал упрощённые версии некоторых компонентов, что привело к визуальным регрессиям.
- Для точного восстановления нужно брать полный код старых компонентов из истории гита и класть его в `src/ui/*` с минимальными правками импортов.

Этот файл можно использовать как чек-лист, чтобы повторить рефакторинг после отката и не потерять визуальное поведение игры.