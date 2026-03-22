/**
 * sessionRepository — localStorage persistence for game session state.
 *
 * Responsibilities:
 *  - Serialize/deserialize GameState to/from localStorage
 *  - Handle legacy session format migration
 *  - Provide clear/load/save API for session data
 *
 * Extracted from ui/hooks/useGameSession.ts (2026-03-07).
 */

import type { GameState } from '../gameLogic/core/types';
import { clearActiveSessionMeta } from './sessionHistory';
import { getTaskDefinition } from '../tasks/taskLevels';

// ─── Storage key ───────────────────────────────────────────────────────────────

const SESSION_KEY = 'hexigame.session.state';

// ─── Serialization types ───────────────────────────────────────────────────────

type SerializedCell = { q: number; r: number; colorIndex: number | null };
type SerializedActiveTemplate = {
  instanceId: string;
  templateId: string;
  anchoredAt: { q: number; r: number; baseColorIndex: number; rotation: number } | null;
  hasErrors: boolean;
  filledCells: string[];
  completedAtTick?: number;
};
type SerializedTaskProgress = {
  visitedTargetKeys: string[];
  collectedTargetKeys?: string[];
  startTick: number;
  completedAtTick?: number;
};
type SerializedStructureInstance = {
  instanceId: string;
  templateId: string;
  startedAtTick: number;
  anchoredAt: { q: number; r: number; baseColorIndex: number; rotation: number } | null;
  hasErrors: boolean;
  filledCells: string[];
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
  autoMoveTargetDir: number | null;
  worldViewCenter: { q: number; r: number };
  cameraLastMoveTick: number;
  activeTemplate: SerializedActiveTemplate | null;
  completedTemplates: string[];
  structureInstances: SerializedStructureInstance[];
  taskId: string | null;
  taskProgress: SerializedTaskProgress;
  taskInteractionMode: 'desktop' | 'mobile';
  taskCompletedIds: string[];
  tutorialLevelId: string | null;
  tutorialProgress: SerializedTaskProgress;
  tutorialInteractionMode: 'desktop' | 'mobile';
  tutorialCompletedLevelIds: string[];
}>;

export type SessionState = { 
  gameState: SerializedGameState; 
  ui?: { mobileTab?: string } 
};

// ─── Serialization helpers ─────────────────────────────────────────────────────

function serializeGrid(grid: Map<string, { q: number; r: number; colorIndex: number | null }>): SerializedCell[] {
  return Array.from(grid.values()).map(c => ({ q: c.q, r: c.r, colorIndex: c.colorIndex }));
}

function deserializeGrid(cells: SerializedCell[] | undefined): Map<string, { q: number; r: number; colorIndex: number | null }> | undefined {
  if (!cells) return undefined;
  const m = new Map<string, { q: number; r: number; colorIndex: number | null }>();
  for (const c of cells) m.set(`${c.q},${c.r}`, c);
  return m;
}

function normalizeTaskId(taskId: string | null | undefined): string | null | undefined {
  if (taskId === undefined) return undefined;
  if (taskId === null) return null;
  return getTaskDefinition(taskId)?.id ?? taskId;
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
    autoMoveTargetDir: state.autoMoveTargetDir,
    worldViewCenter: state.worldViewCenter,
    cameraLastMoveTick: state.cameraLastMoveTick,
    activeTemplate: state.activeTemplate
      ? {
          instanceId: state.activeTemplate.instanceId,
          templateId: state.activeTemplate.templateId,
          anchoredAt: state.activeTemplate.anchoredAt,
          hasErrors: state.activeTemplate.hasErrors,
          filledCells: Array.from(state.activeTemplate.filledCells),
          completedAtTick: state.activeTemplate.completedAtTick,
        }
      : (state.activeTemplate ?? null),
    completedTemplates: Array.from(state.completedTemplates ?? []),
    structureInstances: (state.structureInstances ?? []).map(instance => ({
      instanceId: instance.instanceId,
      templateId: instance.templateId,
      startedAtTick: instance.startedAtTick,
      anchoredAt: instance.anchoredAt,
      hasErrors: instance.hasErrors,
      filledCells: Array.from(instance.filledCells),
      completedAtTick: instance.completedAtTick,
    })),
    taskId: state.taskId ?? null,
    taskProgress: state.taskProgress
      ? {
          visitedTargetKeys: Array.from(state.taskProgress.visitedTargetKeys),
          collectedTargetKeys: Array.from(state.taskProgress.collectedTargetKeys),
          startTick: state.taskProgress.startTick,
          completedAtTick: state.taskProgress.completedAtTick,
        }
      : undefined,
    taskInteractionMode: state.taskInteractionMode,
    taskCompletedIds: Array.from(state.taskCompletedIds ?? []),
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
  const structureInstances = s.structureInstances === undefined
    ? fallback.structureInstances
    : s.structureInstances.map(instance => ({
        ...instance,
        filledCells: new Set(instance.filledCells ?? []),
      }));
  const serializedTaskProgress = s.taskProgress ?? s.tutorialProgress;
  const serializedTaskCompletedIds = s.taskCompletedIds ?? s.tutorialCompletedLevelIds;
  const taskId = normalizeTaskId(s.taskId ?? s.tutorialLevelId ?? fallback.taskId);

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
    autoMoveTargetDir: s.autoMoveTargetDir ?? fallback.autoMoveTargetDir,
    worldViewCenter: s.worldViewCenter ?? fallback.worldViewCenter,
    cameraLastMoveTick: s.cameraLastMoveTick ?? fallback.cameraLastMoveTick,
    activeTemplate,
    completedTemplates: new Set(s.completedTemplates ?? Array.from(fallback.completedTemplates ?? [])),
    structureInstances,
    taskId,
    taskProgress: serializedTaskProgress
      ? {
          visitedTargetKeys: new Set(serializedTaskProgress.visitedTargetKeys),
          collectedTargetKeys: new Set(serializedTaskProgress.collectedTargetKeys ?? []),
          startTick: serializedTaskProgress.startTick,
          completedAtTick: serializedTaskProgress.completedAtTick,
        }
      : fallback.taskProgress,
    taskInteractionMode: s.taskInteractionMode ?? s.tutorialInteractionMode ?? fallback.taskInteractionMode,
    taskCompletedIds: new Set(serializedTaskCompletedIds ?? Array.from(fallback.taskCompletedIds ?? [])),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function loadSession(): SessionState | null {
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

export function saveSession(state: GameState, ui?: SessionState['ui']): void {
  try {
    const session: SessionState = { gameState: serializeState(state), ui };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore write errors
  }
}

export function clearSession(): void {
  clearActiveSessionMeta(localStorage);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('hexigame.guest.started');
  localStorage.removeItem('hexigame.task.started');
  localStorage.removeItem('hexigame.tutorial.started');
}

export function restoreGameState(fallbackState: GameState): GameState {
  const session = loadSession();
  const isGuestStarted = !!localStorage.getItem('hexigame.guest.started');
  if (!isGuestStarted || !session?.gameState) {
    return fallbackState;
  }
  return deserializeState(session.gameState, fallbackState);
}
