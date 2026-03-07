export interface StorageReader {
  getItem: (key: string) => string | null;
}

export interface StorageWriter {
  setItem: (key: string, value: string) => void;
}

export type StorageLike = StorageReader & StorageWriter;

export const SESSION_HISTORY_KEY = 'hexigame.session.history';
export const TRACK_SESSION_HISTORY_KEY = 'hexigame.trackSessionHistory';

const DEFAULT_TICKS_PER_SECOND = 12;
const DEFAULT_HISTORY_LIMIT = 20;

export type SessionHistoryRecord = {
  id: string;
  startTime: number;
  endTime: number;
  gameTicks: number;
  gameTime: string;
};

export function formatGameTime(ticks: number, ticksPerSecond = DEFAULT_TICKS_PER_SECOND): string {
  const seconds = Math.floor(ticks / ticksPerSecond);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function createNewSessionHistoryRecord(now = Date.now(), randomValue = Math.random()): SessionHistoryRecord {
  const sessionId = `session_${now}_${randomValue.toString(36).slice(2, 11)}`;
  return {
    id: sessionId,
    startTime: now,
    endTime: now,
    gameTicks: 0,
    gameTime: '0:00',
  };
}

function parseSessionHistory(raw: string | null): SessionHistoryRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is SessionHistoryRecord => {
      return !!record
        && typeof record === 'object'
        && typeof (record as SessionHistoryRecord).id === 'string'
        && typeof (record as SessionHistoryRecord).startTime === 'number'
        && typeof (record as SessionHistoryRecord).endTime === 'number'
        && typeof (record as SessionHistoryRecord).gameTicks === 'number'
        && typeof (record as SessionHistoryRecord).gameTime === 'string';
    });
  } catch {
    return [];
  }
}

function persistSessionHistory(storage: StorageWriter, history: SessionHistoryRecord[]): void {
  storage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
}

function clampSessionHistory(history: SessionHistoryRecord[], maxRecords: number): SessionHistoryRecord[] {
  if (history.length <= maxRecords) return history;
  return history.slice(0, maxRecords);
}

export function loadSessionHistory(storage: StorageReader): SessionHistoryRecord[] {
  return parseSessionHistory(storage.getItem(SESSION_HISTORY_KEY));
}

export function loadTrackSessionHistoryPreference(storage: StorageReader, fallback = true): boolean {
  const saved = storage.getItem(TRACK_SESSION_HISTORY_KEY);
  if (saved === null) return fallback;
  return saved === 'true';
}

export function saveTrackSessionHistoryPreference(storage: StorageWriter, enabled: boolean): void {
  storage.setItem(TRACK_SESSION_HISTORY_KEY, String(enabled));
}

export function addSessionToHistory(
  storage: StorageLike,
  session: SessionHistoryRecord,
  maxRecords = DEFAULT_HISTORY_LIMIT,
): SessionHistoryRecord[] {
  const history = loadSessionHistory(storage);
  history.unshift(session);
  const next = clampSessionHistory(history, maxRecords);
  persistSessionHistory(storage, next);
  return next;
}

export function saveSessionHistoryRecord(
  storage: StorageLike,
  sessionId: string,
  ticks: number,
  ticksPerSecond = DEFAULT_TICKS_PER_SECOND,
  maxRecords = DEFAULT_HISTORY_LIMIT,
  now = Date.now(),
): SessionHistoryRecord[] {
  const history = loadSessionHistory(storage);
  const existingIndex = history.findIndex((record) => record.id === sessionId);

  if (existingIndex !== -1) {
    history[existingIndex] = {
      ...history[existingIndex],
      endTime: now,
      gameTicks: ticks,
      gameTime: formatGameTime(ticks, ticksPerSecond),
    };
  } else {
    history.unshift({
      id: sessionId,
      startTime: now - ((ticks * 1000) / ticksPerSecond),
      endTime: now,
      gameTicks: ticks,
      gameTime: formatGameTime(ticks, ticksPerSecond),
    });
  }

  const next = clampSessionHistory(history, maxRecords);
  persistSessionHistory(storage, next);
  return next;
}

export function deleteSessionHistoryRecord(
  storage: StorageLike,
  recordId: string,
): SessionHistoryRecord[] {
  const history = loadSessionHistory(storage);
  const next = history.filter((record) => record.id !== recordId);
  persistSessionHistory(storage, next);
  return next;
}

export function clearSessionHistory(storage: StorageWriter): SessionHistoryRecord[] {
  const next: SessionHistoryRecord[] = [];
  persistSessionHistory(storage, next);
  return next;
}
