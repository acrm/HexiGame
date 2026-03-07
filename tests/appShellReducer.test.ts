import { describe, expect, it } from 'vitest';
import {
  appShellReducer,
  createInitialAppShellState,
} from '../src/appLogic/appShellReducer';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('appShellReducer', () => {
  it('initial state uses hexipedia when tutorial was not started', () => {
    const storage = createStorage();
    const state = createInitialAppShellState(storage);

    expect(state.mobileTab).toBe('hexipedia');
    expect(state.trackSessionHistory).toBe(true);
    expect(state.guestStarted).toBe(false);
  });

  it('initial state uses heximap when tutorial was started', () => {
    const storage = createStorage({ 'hexigame.tutorial.started': '1' });
    const state = createInitialAppShellState(storage);

    expect(state.mobileTab).toBe('heximap');
  });

  it('open/close settings keeps paused before guest start', () => {
    const storage = createStorage();
    const initial = createInitialAppShellState(storage);
    const opened = appShellReducer(initial, { type: 'OPEN_SETTINGS' });
    const closed = appShellReducer(opened, { type: 'CLOSE_SETTINGS', documentHidden: false });

    expect(opened.isPaused).toBe(true);
    expect(closed.isPaused).toBe(true);
  });

  it('close settings unpauses after guest start', () => {
    const storage = createStorage();
    const initial = createInitialAppShellState(storage);
    const opened = appShellReducer(initial, { type: 'OPEN_SETTINGS' });
    const started = appShellReducer(opened, { type: 'GUEST_STARTED' });
    const closed = appShellReducer(started, { type: 'CLOSE_SETTINGS', documentHidden: false });

    expect(closed.guestStarted).toBe(true);
    expect(closed.isPaused).toBe(false);
  });

  it('switching tab updates inventory flag', () => {
    const storage = createStorage();
    const initial = createInitialAppShellState(storage);
    const hexilab = appShellReducer(initial, { type: 'SET_MOBILE_TAB', tab: 'hexilab' });
    const heximap = appShellReducer(hexilab, { type: 'SET_MOBILE_TAB', tab: 'heximap' });

    expect(hexilab.isInventory).toBe(true);
    expect(heximap.isInventory).toBe(false);
  });
});
