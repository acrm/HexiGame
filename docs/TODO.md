# TODO

## Recently Completed (2026-03-19)

- [x] Intro-modal для заданий туториала с запуском первого задания через 2 секунды после стартовой анимации и анимацией полета в виджет заданий
- [x] Детерминированный 6-шаговый туториал: навигация, сбор цветов, откапывание, убежище, инь-янь, радужная фигура
- [x] Цветные гексы сделаны непроходимыми для черепашки с поиском достижимого маршрута до цели
- [x] Недоступная цель в мире подсвечивается красной рамкой и сопровождается звуковым сигналом

## Gameplay Backlog

- [ ] Раздельный деплой стабильной версии и текущей, с возможностью просматривать все предыдущие публичные версии
- [ ] Иерархичный редактор гексагоновых структур
- [ ] Недостающие гексы в инвентаре
- [ ] Нестабильные гексы в мире
- [ ] Бесконечный мир
- [ ] Черепашка-антагонист
- [ ] Стихийные препятствия
- [ ] Таймер уровня
- [ ] Стартовая страница

## Architecture Backlog (2026-03-07)

- [x] Вынести `useGameSession` из `ui/hooks` в `appLogic/sessionController` + `sessionRepository`
- [x] Убрать дублирование `integration.init()` / `onGameReady()` (единая точка orchestration)
- [x] Разделить `GameField.tsx` на renderer/input/viewport модули
- [x] Вынести tutorial flow orchestration из `Game.tsx` в `appLogic/tutorialFlow`
- [x] Перевести audio lifecycle на appLogic-порт (audioController + audioDriver)

## Decomposition Candidates (2026-03-07 audit)

- [x] Вынести аудио lifecycle/effects из `src/ui/components/Game.tsx` в отдельный `ui/hooks/useGameAudio.ts`
- [x] Вынести canvas render-loop из `src/ui/components/GameField/GameField.tsx` в `ui/components/GameField/useCanvasRenderer.ts`
- [x] Разделить JSX-слой `src/ui/components/Game.tsx` на контейнеры (`GameMobileTabs`, `GameOverlays`, `GamePanels`) без изменения UX