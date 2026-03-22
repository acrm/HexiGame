import { describe, expect, it } from 'vitest';
import {
  addSessionToHistory,
  clearActiveSessionMeta,
  clearSessionHistory,
  createNewSessionHistoryRecord,
  deleteSessionHistoryRecord,
  formatGameTime,
  loadActiveSessionMeta,
  loadSessionHistory,
  saveActiveSessionMeta,
  saveSessionHistoryRecord,
} from '../src/appLogic/sessionHistory';

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

describe('sessionHistory', () => {
  it('formats ticks to mm:ss', () => {
    expect(formatGameTime(0)).toBe('0:00');
    expect(formatGameTime(12)).toBe('0:01');
    expect(formatGameTime(12 * 62)).toBe('1:02');
  });

  it('creates a new session record', () => {
    const session = createNewSessionHistoryRecord(123, 0.123456);

    expect(session.id.startsWith('session_123_')).toBe(true);
    expect(session.gameTicks).toBe(0);
    expect(session.gameTime).toBe('0:00');
  });

  it('adds and updates records', () => {
    const storage = createStorage();
    const session = createNewSessionHistoryRecord(1, 0.5);

    const added = addSessionToHistory(storage, session);
    expect(added).toHaveLength(1);

    const updated = saveSessionHistoryRecord(storage, session.id, 120, 12, 20, 10_000);
    expect(updated).toHaveLength(1);
    expect(updated[0].gameTicks).toBe(120);
    expect(updated[0].gameTime).toBe('0:10');

    const loaded = loadSessionHistory(storage);
    expect(loaded[0].id).toBe(session.id);
    expect(loaded[0].gameTicks).toBe(120);
  });

  it('deletes and clears records', () => {
    const storage = createStorage();
    const a = createNewSessionHistoryRecord(1, 0.1);
    const b = createNewSessionHistoryRecord(2, 0.2);

    addSessionToHistory(storage, a);
    addSessionToHistory(storage, b);

    const afterDelete = deleteSessionHistoryRecord(storage, a.id);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(b.id);

    const afterClear = clearSessionHistory(storage);
    expect(afterClear).toEqual([]);
    expect(loadSessionHistory(storage)).toEqual([]);
  });

  it('saves and restores active session metadata', () => {
    const storage = createStorage();

    saveActiveSessionMeta(storage, { id: 'session_abc', startTick: 42 });

    expect(loadActiveSessionMeta(storage)).toEqual({ id: 'session_abc', startTick: 42 });
  });

  it('clears active session metadata', () => {
    const storage = createStorage({
      'hexigame.session.active.id': 'session_abc',
      'hexigame.session.active.startTick': '42',
    });

    clearActiveSessionMeta(storage);

    expect(loadActiveSessionMeta(storage)).toBeNull();
  });
});
