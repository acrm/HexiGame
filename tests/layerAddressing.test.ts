import { describe, expect, it } from 'vitest';

import { DefaultParams, createInitialState } from '../src/gameLogic';
import { updateCells } from '../src/gameLogic/core/grid';
import { sessionReducer } from '../src/appLogic/sessionReducer';
import type { GameState } from '../src/gameLogic/core/types';

function emptyWorldParams() {
  return {
    ...DefaultParams,
    InitialColorProbability: 0,
  };
}

describe('Layer addressing domain invariants', () => {
  it('switch 0 -> +1, move one step, switch back => x3 projection on layer 0', () => {
    const params = emptyWorldParams();
    let state = createInitialState(params, () => 0.99);

    state = sessionReducer(state, params, { type: 'SWITCH_LAYER', delta: 1 });
    expect(state.activeLayerIndex).toBe(1);
    expect(state.protagonist).toEqual({ q: 0, r: 0 });

    state = sessionReducer(state, params, { type: 'TICK', rng: () => 0.99 });

    state = sessionReducer(state, params, { type: 'START_DRAG' });
    state = sessionReducer(state, params, { type: 'DRAG_MOVE', dq: 0, dr: 1 });
    state = sessionReducer(state, params, { type: 'END_DRAG' });

    expect(state.activeLayerIndex).toBe(1);
    expect(state.protagonist).toEqual({ q: 0, r: 1 });

    state = sessionReducer(state, params, { type: 'SWITCH_LAYER', delta: -1 });

    expect(state.activeLayerIndex).toBe(0);
    expect(state.protagonist).toEqual({ q: 0, r: 3 });
  });

  it('non-base layer grid is normalized to walkable cells on switch (legacy safety)', () => {
    const params = emptyWorldParams();
    const base = createInitialState(params, () => 0.99);
    const layer1WithLegacyColors = updateCells(new Map(), [
      { q: 0, r: 0, colorIndex: 2 },
      { q: 1, r: -1, colorIndex: 5 },
    ]);

    const seededState: GameState = {
      ...base,
      activeLayerIndex: 0,
      layerGrids: {
        ...(base.layerGrids ?? {}),
        1: layer1WithLegacyColors,
      },
    };

    const switched = sessionReducer(seededState, params, { type: 'SWITCH_LAYER', delta: 1 });

    expect(switched.activeLayerIndex).toBe(1);
    for (const cell of switched.grid.values()) {
      expect(cell.colorIndex).toBeNull();
    }
  });
});
