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
  it('initial state uses map when tutorial was not started', () => {
    const storage = createStorage();
    const state = createInitialAppShellState(storage);

    expect(state.mobileTab).toBe('map');
    expect(state.trackSessionHistory).toBe(true);
    expect(state.guestStarted).toBe(false);
  });

  it('initial state uses map when tutorial was started', () => {
    const storage = createStorage({ 'hexigame.tutorial.started': '1' });
    const state = createInitialAppShellState(storage);

    expect(state.mobileTab).toBe('map');
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
    const lab = appShellReducer(initial, { type: 'SET_MOBILE_TAB', tab: 'lab' });
    const map = appShellReducer(lab, { type: 'SET_MOBILE_TAB', tab: 'map' });

    expect(lab.isInventory).toBe(true);
    expect(map.isInventory).toBe(false);
  });

  it('restores active session identity when guest session already started', () => {
    const storage = createStorage({
      'hexigame.guest.started': '1',
      'hexigame.session.state': JSON.stringify({ gameState: { cells: [], cursor: { q: 0, r: 0 } } }),
      'hexigame.session.active.id': 'session_abc',
      'hexigame.session.active.startTick': '128',
    });

    const state = createInitialAppShellState(storage);

    expect(state.guestStarted).toBe(false);  // always false until user acts on start screen
    expect(state.resumeAvailable).toBe(true); // session exists → Continue/Restart offered
    expect(state.currentSessionId).toBe('session_abc');
    expect(state.currentSessionStartTick).toBe(128);
    expect(state.lastSessionSaveTick).toBe(128);
  });

  it('falls back to latest session history record when active metadata is missing', () => {
    const storage = createStorage({
      'hexigame.guest.started': '1',
      'hexigame.session.state': JSON.stringify({ gameState: { cells: [], cursor: { q: 0, r: 0 } } }),
      'hexigame.session.history': JSON.stringify([
        {
          id: 'session_latest',
          startTime: 100,
          endTime: 200,
          gameTicks: 24,
          gameTime: '0:02',
        },
      ]),
    });

    const state = createInitialAppShellState(storage);

    expect(state.resumeAvailable).toBe(true);
    expect(state.currentSessionId).toBe('session_latest');
    expect(state.currentSessionStartTick).toBe(24);
  });
});
