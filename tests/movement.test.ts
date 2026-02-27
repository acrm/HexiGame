/**
 * movement.test.ts — тесты перемещения фокуса и протагониста.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFacade,
  emptyParams,
  DIR_UP,
  DIR_DOWN,
  DIR_UP_RIGHT,
  DIR_DOWN_LEFT,
  DIR_UP_LEFT,
  DIR_DOWN_RIGHT,
} from './facade/testHelpers.js';
import type { GameTestFacade } from './facade/GameTestFacade.js';

describe('Движение фокуса по delta', () => {
  let g: GameTestFacade;

  beforeEach(() => {
    g = createFacade(emptyParams);
  });

  it('фокус перемещается вниз (dq=0, dr=+1) от текущей позиции', () => {
    // Начальный фокус: (0, -1) — прямо перед протагонистом (направление UP)
    const before = g.getFocusPosition();
    // Смещаем фокус по одному из 6 направлений
    g.moveFocusDelta(0, 1); // down
    const after = g.getFocusPosition();
    // Фокус должен измениться
    expect(after).not.toEqual(before);
  });

  it('moveFocusDelta игнорирует не-смежный delta', () => {
    const before = g.getFocusPosition();
    // (2, 0) — не единичный hex-шаг
    g.moveFocusDelta(2, 0);
    expect(g.getFocusPosition()).toEqual(before);
  });

  it('moveFocusDirection меняет направление взгляда', () => {
    g.moveFocusDirection(DIR_DOWN);
    expect(g.getFacingDirection()).toBe(DIR_DOWN);
  });

  it('moveFocusDirection нормализует dir > 5', () => {
    g.moveFocusDirection(6); // 6 % 6 = 0 = UP
    expect(g.getFacingDirection()).toBe(DIR_UP);
  });

  it('moveFocusDirection нормализует отрицательный dir', () => {
    g.moveFocusDirection(-1); // должен стать 5 (UP_LEFT)
    expect(g.getFacingDirection()).toBe(DIR_UP_LEFT);
  });

  it('фокус всегда смежен с протагонистом после обычного движения', () => {
    for (const dir of [DIR_UP, DIR_DOWN, DIR_UP_RIGHT, DIR_DOWN_LEFT, DIR_UP_LEFT, DIR_DOWN_RIGHT]) {
      g.moveFocusDirection(dir);
      const prot = g.getProtagonistPosition();
      const focus = g.getFocusPosition();
      // hex-distance должна быть равна 1
      const dist = (Math.abs(focus.q - prot.q) + Math.abs(focus.r - prot.r) +
        Math.abs((-focus.q - focus.r) - (-prot.q - prot.r))) / 2;
      expect(dist).toBe(1);
    }
  });
});

describe('Авто-движение к цели', () => {
  it('moveToTarget активирует авто-движение', () => {
    const g = createFacade(emptyParams);
    g.moveToTarget({ q: 3, r: 0 });
    expect(g.isAutoMoving()).toBe(true);
  });

  it('после достаточного числа тиков протагонист приближается к цели', () => {
    const g = createFacade(emptyParams);
    // Стартуем из (0,0), идём к (3, 0)
    g.moveToTarget({ q: 3, r: 0 });
    // Каждые 2 тика = 1 шаг, 3 шага = 6 тиков + запас
    g.tick(20);
    expect(g.isAutoMoving()).toBe(false);
  });

  it('moveToTarget за пределами сетки игнорируется', () => {
    const g = createFacade({ ...emptyParams, gridRadius: 3 });
    g.moveToTarget({ q: 10, r: 10 }); // outside radius=3
    expect(g.isAutoMoving()).toBe(false);
  });

  it('протагонист остаётся на месте без авто-движения при тиках', () => {
    const g = createFacade(emptyParams);
    const before = g.getProtagonistPosition();
    g.tick(10);
    // Без autoMove протагонист не движется
    expect(g.getProtagonistPosition()).toEqual(before);
  });
});

describe('Поворот направления взгляда', () => {
  it('все 6 направлений корректно устанавливаются', () => {
    const g = createFacade(emptyParams);
    for (let d = 0; d < 6; d++) {
      g.moveFocusDirection(d);
      expect(g.getFacingDirection()).toBe(d);
    }
  });
});
