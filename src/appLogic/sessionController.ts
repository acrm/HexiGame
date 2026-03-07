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
import { restoreGameState, saveSession, clearSession, type SessionState } from './sessionRepository';

// ─── Session Controller ────────────────────────────────────────────────────────

export interface SessionControllerOptions {
  params?: Partial<Params>;
  seed?: number;
  /** Called whenever gameState changes (for React setState or similar) */
  onStateChange: (state: GameState) => void;
  /** Current mobile tab for session metadata */
  getMobileTab?: () => string | undefined;
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
  /** Reset session to fresh state and clear localStorage */
  resetSession: () => void;
  /** Enable/disable automatic persistence */
  enablePersistence: (enabled: boolean) => void;
}

export function createSessionController(options: SessionControllerOptions): SessionController {
  const { onStateChange, getMobileTab } = options;
  const params: Params = { ...DefaultParams, ...(options.params ?? {}) };
  const rng: RNG = mulberry32(options.seed ?? Date.now());

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

  // ─── Session reset ───────────────────────────────────────────────────────────

  function resetSession(): void {
    clearSession();
    const fresh = createInitialState(params, rng);
    setState(fresh);
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
    resetSession,
    enablePersistence,
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
