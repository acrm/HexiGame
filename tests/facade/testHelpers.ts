/**
 * testHelpers.ts — общие утилиты для тестов HexiGame.
 *
 * Экспортирует:
 *  - createFacade()   — создаёт инициализированный адаптер
 *  - emptyParams      — параметры для детерминированных тестов (нет цветов на старте)
 *  - denseParams      — параметры с полным заполнением цветами
 *  - DIR_*            — константы индексов направлений
 */

import { PureLogicAdapter } from './PureLogicAdapter.js';
import type { FacadeParams, GameTestFacade } from './GameTestFacade.js';

// ── Direction constants ──────────────────────────────────────────────────────
// Matches axialDirections order in pureLogic.ts:
// 0: up (0,-1), 1: up-right (+1,-1), 2: down-right (+1,0)
// 3: down (0,+1), 4: down-left (-1,+1), 5: up-left (-1,0)
export const DIR_UP = 0;
export const DIR_UP_RIGHT = 1;
export const DIR_DOWN_RIGHT = 2;
export const DIR_DOWN = 3;
export const DIR_DOWN_LEFT = 4;
export const DIR_UP_LEFT = 5;

// ── Preset parameter sets ────────────────────────────────────────────────────

/** Пустая сетка: никаких цветов при старте. */
export const emptyParams: FacadeParams = {
  initialColorProbability: 0,
  gridRadius: 5,
  timerInitialSeconds: 300,
};

/** Плотная сетка: все ячейки заполнены цветами. */
export const denseParams: FacadeParams = {
  initialColorProbability: 1,
  gridRadius: 5,
  timerInitialSeconds: 300,
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Создаёт и инициализирует адаптер фасада.
 * @param params   Дополнительные параметры (объединяются с emptyParams по умолчанию).
 * @param seed     Seed для детерминированного RNG (по умолчанию 42).
 */
export function createFacade(params: FacadeParams = emptyParams, seed = 42): GameTestFacade {
  const facade = new PureLogicAdapter();
  facade.init(params, seed);
  return facade;
}
