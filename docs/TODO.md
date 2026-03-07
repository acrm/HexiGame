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

- [x] Вынести `useGameSession` из `ui/hooks` в `appLogic/sessionController` + `sessionRepository`
- [x] Убрать дублирование `integration.init()` / `onGameReady()` (единая точка orchestration)
- [x] Разделить `GameField.tsx` на renderer/input/viewport модули
- [x] Вынести tutorial flow orchestration из `Game.tsx` в `appLogic/tutorialFlow`
- [x] Перевести audio lifecycle на appLogic-порт (audioController + audioDriver)