# TODO

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

- [ ] Вынести `useGameSession` из `ui/hooks` в `appLogic/sessionController` + `sessionRepository`
- [ ] Убрать дублирование `integration.init()` / `onGameReady()` (единая точка orchestration)
- [ ] Разделить `GameField.tsx` на renderer/input/viewport модули
- [ ] Вынести tutorial flow orchestration из `Game.tsx` в `appLogic/tutorialFlow`
- [ ] Перевести audio lifecycle на appLogic-порт (UI только отправляет intents)