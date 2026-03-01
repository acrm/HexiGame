/**
 * useGameSession — React hook that manages the game state lifecycle.
 *
 * Responsibilities:
 *  - Initialises GameState from localStorage or fresh seed
 *  - Runs the tick loop (setInterval at GameTickRate)
 *  - Persists state to localStorage on every change
 *  - Exposes `gameState` and `dispatch(GameCommand)` to callers
 *
 * Phase 9 deliverable (UI Integration).
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { GameState } from '../../gameLogic/core/types';
import type { Params } from '../../gameLogic/core/params';
import type { RNG } from '../../gameLogic/core/types';
import { mulberry32, DefaultParams } from '../../gameLogic/core/params';
import { createInitialState } from '../../gameLogic/core/grid';
import { sessionReducer, type GameCommand } from '../../appLogic/sessionReducer';

// ─── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'hexigame.session.state';

type SerializedCell = { q: number; r: number; colorIndex: number | null };
type SerializedActiveTemplate = {
  templateId: string;
  anchoredAt: { q: number; r: number; baseColorIndex: number; rotation: number } | null;
  hasErrors: boolean;
  filledCells: string[];
  completedAtTick?: number;
};
type SerializedTutorialProgress = {
  visitedTargetKeys: string[];
  startTick: number;
  completedAtTick?: number;
};
type SerializedGameState = Partial<{
  tick: number;
  remainingSeconds: number;
  focus: { q: number; r: number };
  protagonist: { q: number; r: number };
  flash: { type: 'success' | 'failure'; startedTick: number } | null;
  grid: SerializedCell[];
  inventoryGrid: SerializedCell[];
  activeField: 'world' | 'inventory';
  hotbarSlots: Array<number | null>;
  selectedHotbarIndex: number;
  facingDirIndex: number;
  isDragging: boolean;
  autoMoveTarget: { q: number; r: number } | null;
  autoMoveTicksRemaining: number;
  autoFocusTarget: { q: number; r: number } | null;
  worldViewCenter: { q: number; r: number };
  activeTemplate: SerializedActiveTemplate | null;
  completedTemplates: string[];
  tutorialLevelId: string | null;
  tutorialProgress: SerializedTutorialProgress;
  tutorialInteractionMode: 'desktop' | 'mobile';
  tutorialCompletedLevelIds: string[];
}>;
type SessionState = { gameState: SerializedGameState; ui?: { mobileTab?: string } };

function serializeGrid(grid: Map<string, { q: number; r: number; colorIndex: number | null }>): SerializedCell[] {
  return Array.from(grid.values()).map(c => ({ q: c.q, r: c.r, colorIndex: c.colorIndex }));
}

function deserializeGrid(cells: SerializedCell[] | undefined): Map<string, { q: number; r: number; colorIndex: number | null }> | undefined {
  if (!cells) return undefined;
  const m = new Map<string, { q: number; r: number; colorIndex: number | null }>();
  for (const c of cells) m.set(`${c.q},${c.r}`, c);
  return m;
}

function serializeState(state: GameState): SerializedGameState {
  return {
    tick: state.tick,
    remainingSeconds: state.remainingSeconds,
    focus: state.focus,
    protagonist: state.protagonist,
    flash: state.flash,
    grid: serializeGrid(state.grid),
    inventoryGrid: serializeGrid(state.inventoryGrid),
    activeField: state.activeField,
    hotbarSlots: state.hotbarSlots,
    selectedHotbarIndex: state.selectedHotbarIndex,
    facingDirIndex: state.facingDirIndex,
    isDragging: state.isDragging,
    autoMoveTarget: state.autoMoveTarget,
    autoMoveTicksRemaining: state.autoMoveTicksRemaining,
    autoFocusTarget: state.autoFocusTarget,
    worldViewCenter: state.worldViewCenter,
    activeTemplate: state.activeTemplate
      ? {
          templateId: state.activeTemplate.templateId,
          anchoredAt: state.activeTemplate.anchoredAt,
          hasErrors: state.activeTemplate.hasErrors,
          filledCells: Array.from(state.activeTemplate.filledCells),
          completedAtTick: state.activeTemplate.completedAtTick,
        }
      : (state.activeTemplate ?? null),
    completedTemplates: Array.from(state.completedTemplates ?? []),
    tutorialLevelId: state.tutorialLevelId ?? null,
    tutorialProgress: state.tutorialProgress
      ? {
          visitedTargetKeys: Array.from(state.tutorialProgress.visitedTargetKeys),
          startTick: state.tutorialProgress.startTick,
          completedAtTick: state.tutorialProgress.completedAtTick,
        }
      : undefined,
    tutorialInteractionMode: state.tutorialInteractionMode,
    tutorialCompletedLevelIds: Array.from(state.tutorialCompletedLevelIds ?? []),
  };
}

function deserializeState(s: SerializedGameState, fallback: GameState): GameState {
  const grid = deserializeGrid(s.grid) ?? fallback.grid;
  const inventoryGrid = deserializeGrid(s.inventoryGrid) ?? fallback.inventoryGrid;
  const activeTemplate = s.activeTemplate === undefined
    ? fallback.activeTemplate
    : s.activeTemplate
      ? { ...s.activeTemplate, filledCells: new Set(s.activeTemplate.filledCells ?? []) }
      : null;
  return {
    ...fallback,
    tick: s.tick ?? fallback.tick,
    remainingSeconds: s.remainingSeconds ?? fallback.remainingSeconds,
    focus: s.focus ?? fallback.focus,
    protagonist: s.protagonist ?? fallback.protagonist,
    flash: s.flash ?? fallback.flash,
    grid,
    inventoryGrid,
    activeField: s.activeField ?? fallback.activeField,
    hotbarSlots: s.hotbarSlots ?? fallback.hotbarSlots,
    selectedHotbarIndex: s.selectedHotbarIndex ?? fallback.selectedHotbarIndex,
    facingDirIndex: s.facingDirIndex ?? fallback.facingDirIndex,
    isDragging: s.isDragging ?? fallback.isDragging,
    autoMoveTarget: s.autoMoveTarget ?? fallback.autoMoveTarget,
    autoMoveTicksRemaining: s.autoMoveTicksRemaining ?? fallback.autoMoveTicksRemaining,
    autoFocusTarget: s.autoFocusTarget ?? fallback.autoFocusTarget,
    worldViewCenter: s.worldViewCenter ?? fallback.worldViewCenter,
    activeTemplate,
    completedTemplates: new Set(s.completedTemplates ?? Array.from(fallback.completedTemplates ?? [])),
    tutorialLevelId: s.tutorialLevelId ?? fallback.tutorialLevelId,
    tutorialProgress: s.tutorialProgress
      ? {
          visitedTargetKeys: new Set(s.tutorialProgress.visitedTargetKeys),
          startTick: s.tutorialProgress.startTick,
          completedAtTick: s.tutorialProgress.completedAtTick,
        }
      : fallback.tutorialProgress,
    tutorialInteractionMode: s.tutorialInteractionMode ?? fallback.tutorialInteractionMode,
    tutorialCompletedLevelIds: new Set(s.tutorialCompletedLevelIds ?? Array.from(fallback.tutorialCompletedLevelIds ?? [])),
  };
}

function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Legacy format: gameState was stored at root level
    if (parsed && !parsed.gameState) {
      return { gameState: parsed as SerializedGameState, ui: parsed.ui };
    }
    return parsed as SessionState;
  } catch {
    return null;
  }
}

function saveSession(state: GameState, ui?: SessionState['ui']) {
  try {
    const session: SessionState = { gameState: serializeState(state), ui };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore write errors
  }
}

// ─── Reducer wrapper ───────────────────────────────────────────────────────────

function makeReducer(params: Params) {
  return (state: GameState, command: GameCommand): GameState =>
    sessionReducer(state, params, command);
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export interface UseGameSessionOptions {
  params?: Partial<Params>;
  seed?: number;
  isPaused: boolean;
  guestStarted: boolean;
  /** Mobile UI tab — used for session save metadata */
  mobileTab?: string;
}

export interface UseGameSessionResult {
  gameState: GameState;
  dispatch: (command: GameCommand) => void;
  /** Reset to a fresh game state (clears localStorage) */
  resetSession: () => void;
}

export function useGameSession({
  params,
  seed,
  isPaused,
  guestStarted,
  mobileTab,
}: UseGameSessionOptions): UseGameSessionResult {
  const mergedParams: Params = { ...DefaultParams, ...(params ?? {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));

  // Build initial state once
  const initialStateRef = useRef<GameState | null>(null);
  if (!initialStateRef.current) {
    const fresh = createInitialState(mergedParams, rngRef.current);
    const session = loadSession();
    const isGuestStarted = !!localStorage.getItem('hexigame.guest.started');
    initialStateRef.current = isGuestStarted && session?.gameState
      ? deserializeState(session.gameState, fresh)
      : fresh;
  }

  const [gameState, dispatch] = useReducer(
    makeReducer(mergedParams),
    initialStateRef.current,
  );

  // Tick loop
  useEffect(() => {
    if (!guestStarted) return;
    const id = setInterval(() => {
      if (!isPaused) {
        dispatch({ type: 'TICK', rng: rngRef.current });
      }
    }, 1000 / mergedParams.GameTickRate);
    return () => clearInterval(id);
  }, [mergedParams.GameTickRate, isPaused, guestStarted]);

  // Persist on every state change (only after guest start)
  useEffect(() => {
    if (!guestStarted) return;
    saveSession(gameState, mobileTab ? { mobileTab } : undefined);
  }, [gameState, guestStarted, mobileTab]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('hexigame.guest.started');
    localStorage.removeItem('hexigame.tutorial.started');
    const fresh = createInitialState(mergedParams, rngRef.current);
    dispatch({ type: 'RESET_STATE', newState: fresh });
  }, [mergedParams]);

  return { gameState, dispatch, resetSession };
}
