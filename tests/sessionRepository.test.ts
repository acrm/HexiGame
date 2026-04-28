import { describe, expect, it } from 'vitest';
import {
  saveSession,
  restoreGameState,
} from '../src/appLogic/sessionRepository';
import { createInitialState, DefaultParams } from '../src/gameLogic';
import { updateCells } from '../src/gameLogic/core/grid';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const emptyParams = { ...DefaultParams, InitialColorProbability: 0 };

describe('sessionRepository — multi-layer persistence', () => {
  it('saves and restores activeLayerIndex', () => {
    const storage = createStorage({ 'hexigame.guest.started': '1' });
    const state = {
      ...createInitialState(emptyParams, () => 0),
      activeLayerIndex: 2,
    };

    saveSession(state, undefined, storage);
    const restored = restoreGameState(createInitialState(emptyParams, () => 0), storage);

    expect(restored.activeLayerIndex).toBe(2);
  });

  it('saves and restores layerGrids', () => {
    const storage = createStorage({ 'hexigame.guest.started': '1' });
    const layer1Grid = updateCells(new Map(), [
      { q: 1, r: 0, colorIndex: null },
      { q: 2, r: -1, colorIndex: null },
    ]);
    const state = {
      ...createInitialState(emptyParams, () => 0),
      activeLayerIndex: 1,
      layerGrids: { 0: layer1Grid },
    };

    saveSession(state, undefined, storage);
    const restored = restoreGameState(createInitialState(emptyParams, () => 0), storage);

    expect(restored.layerGrids).toBeDefined();
    expect(restored.layerGrids![0]).toBeDefined();
    expect(restored.layerGrids![0].size).toBe(2);
    expect(restored.layerGrids![0].get('1,0')).toEqual({ q: 1, r: 0, colorIndex: null });
  });

  it('restores empty layerGrids correctly when saved with no layer entries', () => {
    const storage = createStorage({ 'hexigame.guest.started': '1' });
    // createInitialState sets layerGrids: {} (empty object, no entries for other layers)
    const state = createInitialState(emptyParams, () => 0);
    expect(Object.keys(state.layerGrids!)).toHaveLength(0);

    saveSession(state, undefined, storage);
    const fallback = createInitialState(emptyParams, () => 0);
    const restored = restoreGameState(fallback, storage);

    // Empty layerGrids is round-tripped as an empty object
    expect(restored.layerGrids).toBeDefined();
    expect(Object.keys(restored.layerGrids!)).toHaveLength(0);
  });

  it('does not persist guest-started flag when not set', () => {
    const storage = createStorage(); // no hexigame.guest.started
    const state = {
      ...createInitialState(emptyParams, () => 0),
      activeLayerIndex: 2,
    };

    saveSession(state, undefined, storage);
    const fallback = createInitialState(emptyParams, () => 0);
    const restored = restoreGameState(fallback, storage);

    // Without guest started flag, restoreGameState returns fallback
    expect(restored.activeLayerIndex).toBe(fallback.activeLayerIndex);
  });
});
