import { describe, expect, it } from 'vitest';

import { DefaultParams, createInitialState, updateWorldViewCenter } from '../src/gameLogic';
import type { GameState } from '../src/gameLogic/core/types';

function noColorParams() {
  return {
    ...DefaultParams,
    InitialColorProbability: 0,
  };
}

describe('Camera behavior', () => {
  it('keeps camera static while drag movement is active', () => {
    const params = noColorParams();
    const base = createInitialState(params, () => 0.99);

    const state: GameState = {
      ...base,
      tick: 10,
      worldViewCenter: { q: 0, r: 0 },
      focus: { q: 4, r: 0 },
      isDragging: true,
    };

    const next = updateWorldViewCenter(state, params);
    expect(next.worldViewCenter).toEqual({ q: 0, r: 0 });
  });

  it('keeps camera static while auto-move is in progress', () => {
    const params = noColorParams();
    const base = createInitialState(params, () => 0.99);

    const state: GameState = {
      ...base,
      tick: 10,
      protagonist: { q: 0, r: 0 },
      worldViewCenter: { q: 0, r: 0 },
      focus: { q: 5, r: 0 },
      autoFocusTarget: { q: 5, r: 0 },
      isDragging: false,
    };

    const next = updateWorldViewCenter(state, params);
    expect(next.worldViewCenter).toEqual({ q: 0, r: 0 });
  });

  it('recenters toward focus one cell per tick after movement stops', () => {
    const params = noColorParams();
    const base = createInitialState(params, () => 0.99);

    let state: GameState = {
      ...base,
      tick: 1,
      protagonist: { q: 0, r: 0 },
      focus: { q: 3, r: 0 },
      worldViewCenter: { q: 0, r: 0 },
      cameraLastMoveTick: 0,
      isDragging: false,
      autoFocusTarget: null,
    };

    state = updateWorldViewCenter(state, params);
    expect(state.worldViewCenter).toEqual({ q: 1, r: 0 });

    state = updateWorldViewCenter({ ...state, tick: 2 }, params);
    expect(state.worldViewCenter).toEqual({ q: 2, r: 0 });

    state = updateWorldViewCenter({ ...state, tick: 3 }, params);
    expect(state.worldViewCenter).toEqual({ q: 3, r: 0 });
  });
});
