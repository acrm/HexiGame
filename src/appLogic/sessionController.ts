/**
 * sessionController — Game session lifecycle orchestration.
 *
 * Responsibilities:
 *  - Tick loop management (start/stop/pause)
 *  - Automatic persistence after state changes
 *  - Integration with sessionReducer
 *  - RNG instance management
 *
 * Extracted from ui/hooks/useGameSession.ts (2026-03-07).
 */

import type { GameState, RNG } from '../gameLogic/core/types';
import type { Params } from '../gameLogic/core/params';
import { DefaultParams, mulberry32 } from '../gameLogic/core/params';
import { createInitialState } from '../gameLogic/core/grid';
import { sessionReducer, type GameCommand } from './sessionReducer';
import {
  restoreGameState, saveSession, clearSession, type SessionState,
  appendSessionAction, loadSessionLog, initSessionLog, saveSessionLog,
} from './sessionRepository';

// ─── Session Controller ────────────────────────────────────────────────────────

export interface SessionControllerOptions {
  params?: Partial<Params>;
  seed?: number;
  /** Called whenever gameState changes (for React setState or similar) */
  onStateChange: (state: GameState) => void;
  /** Current mobile tab for session metadata */
  getMobileTab?: () => string | undefined;
  /** Returns active session ID for action log (null = not in session) */
  getSessionId?: () => string | null;
}

export interface SessionController {
  /** Get the current game state */
  getState: () => GameState;
  /** Dispatch a command to update game state */
  dispatch: (command: GameCommand) => void;
  /** Start the tick loop */
  start: () => void;
  /** Stop the tick loop */
  stop: () => void;
  /** Pause/unpause the tick loop */
  setPaused: (paused: boolean) => void;
  /** Returns current pause state */
  getIsPaused: () => boolean;
  /** Reset session to fresh state and clear localStorage */
  resetSession: () => void;
  /** Reload session state from localStorage into the running controller */
  reloadSessionFromStorage: () => void;
  /** Enable/disable automatic persistence */
  enablePersistence: (enabled: boolean) => void;
  /** Initialize action log for a new/continued session */
  initLog: (sessionId: string) => void;
  /** Replay session log up to targetTick and pause there */
  seekToTick: (sessionId: string, targetTick: number) => void;
}

export function createSessionController(options: SessionControllerOptions): SessionController {
  const { onStateChange, getMobileTab, getSessionId } = options;
  const params: Params = { ...DefaultParams, ...(options.params ?? {}) };
  const activeSeed: number = options.seed ?? Date.now();
  const createRng = (): RNG => mulberry32(activeSeed);
  let rng: RNG = createRng();

  let currentState: GameState = createInitialState(params, rng);
  let tickIntervalId: ReturnType<typeof setInterval> | null = null;
  let isPaused = false;
  let persistenceEnabled = false;

  // ─── State update ────────────────────────────────────────────────────────────

  function setState(newState: GameState): void {
    currentState = newState;
    onStateChange(newState);
    if (persistenceEnabled) {
      const mobileTab = getMobileTab?.();
      saveSession(newState, mobileTab ? { mobileTab } : undefined);
    }
  }

  // ─── Command dispatch ────────────────────────────────────────────────────────

  function dispatch(command: GameCommand): void {
    const nextState = sessionReducer(currentState, params, command);
    // Log user actions (not TICK) to the session log
    if (command.type !== 'TICK' && persistenceEnabled) {
      const sessionId = getSessionId?.();
      if (sessionId) {
        appendSessionAction(sessionId, {
          tick: currentState.tick,
          wallTime: Date.now(),
          command,
        });
      }
    }
    setState(nextState);
  }

  // ─── Tick loop ───────────────────────────────────────────────────────────────

  function start(): void {
    if (tickIntervalId !== null) return;
    const intervalMs = 1000 / params.GameTickRate;
    tickIntervalId = setInterval(() => {
      if (!isPaused) {
        dispatch({ type: 'TICK', rng });
      }
    }, intervalMs);
  }

  function stop(): void {
    if (tickIntervalId !== null) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  }

  function setPaused(paused: boolean): void {
    isPaused = paused;
  }

  function getIsPaused(): boolean {
    return isPaused;
  }

  // ─── Session log ─────────────────────────────────────────────────────────────

  function initLog(sessionId: string): void {
    initSessionLog(sessionId, activeSeed, currentState.tick);
  }

  /** Replay all logged actions up to targetTick, pausing there. */
  function seekToTick(sessionId: string, targetTick: number): void {
    const log = loadSessionLog(sessionId);
    if (!log) return;

    // Replay from seed
    const replayRng = mulberry32(log.seed);
    let state = createInitialState(params, replayRng);

    // Group entries by tick for fast lookup
    const entriesByTick = new Map<number, GameCommand[]>();
    for (const entry of log.entries) {
      if (!entriesByTick.has(entry.tick)) entriesByTick.set(entry.tick, []);
      entriesByTick.get(entry.tick)!.push(entry.command);
    }

    const clampedTarget = Math.max(log.startTick, Math.min(targetTick, currentState.tick));
    for (let t = log.startTick; t < clampedTarget; t++) {
      const cmds = entriesByTick.get(t);
      if (cmds) {
        for (const cmd of cmds) {
          state = sessionReducer(state, params, cmd);
        }
      }
      state = sessionReducer(state, params, { type: 'TICK', rng: replayRng });
    }
    // Apply user commands at targetTick without advancing time
    const targetCmds = entriesByTick.get(clampedTarget);
    if (targetCmds) {
      for (const cmd of targetCmds) {
        state = sessionReducer(state, params, cmd);
      }
    }

    currentState = state;
    isPaused = true;
    onStateChange(state);
    // Persist sought state
    if (persistenceEnabled) {
      const mobileTab = getMobileTab?.();
      saveSession(state, mobileTab ? { mobileTab } : undefined);
    }
  }

  // ─── Session reset ───────────────────────────────────────────────────────────

  function resetSession(): void {
    clearSession();
    rng = createRng();
    const fresh = createInitialState(params, rng);
    setState(fresh);
  }

  function reloadSessionFromStorage(): void {
    rng = createRng();
    const fresh = createInitialState(params, rng);
    const restored = restoreGameState(fresh);
    setState(restored);
  }

  // ─── Persistence control ─────────────────────────────────────────────────────

  function enablePersistence(enabled: boolean): void {
    persistenceEnabled = enabled;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    getState: () => currentState,
    dispatch,
    start,
    stop,
    setPaused,
    getIsPaused,
    resetSession,
    reloadSessionFromStorage,
    enablePersistence,
    initLog,
    seekToTick,
  };
}

// ─── React-friendly factory ────────────────────────────────────────────────────

/**
 * Initialize game state from localStorage or create fresh state.
 * Use this helper at component mount time.
 */
export function initializeGameState(params: Params, rng: RNG): GameState {
  const fresh = createInitialState(params, rng);
  return restoreGameState(fresh);
}
