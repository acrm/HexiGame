import {
  loadActiveSessionMeta,
  loadSessionHistory,
  loadTrackSessionHistoryPreference,
  type SessionHistoryRecord,
  type StorageReader,
} from './sessionHistory';
import { canResumeSession } from './sessionRepository';

const GUEST_STARTED_KEY = 'hexigame.guest.started';

export type MobileTab = 'heximap' | 'hexilab' | 'hexipedia';
export type InteractionMode = 'desktop' | 'mobile';

export interface AppShellState {
  isInventory: boolean;
  mobileTab: MobileTab;
  isPaused: boolean;
  interactionMode: InteractionMode;
  guestStarted: boolean;
  resumeAvailable: boolean;
  startupAnimationShown: boolean;
  isSettingsOpen: boolean;
  isMascotOpen: boolean;
  sessionHistory: SessionHistoryRecord[];
  lastSessionSaveTick: number;
  trackSessionHistory: boolean;
  currentSessionId: string | null;
  currentSessionStartTick: number;
}

export type AppShellCommand =
  | { type: 'SET_INTERACTION_MODE'; mode: InteractionMode }
  | { type: 'SET_MOBILE_TAB'; tab: MobileTab }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_SETTINGS'; documentHidden: boolean }
  | { type: 'OPEN_MASCOT' }
  | { type: 'CLOSE_MASCOT' }
  | { type: 'VISIBILITY_CHANGED'; hidden: boolean }
  | { type: 'GUEST_STARTED' }
  | { type: 'GUEST_CONTINUED' }
  | { type: 'GUEST_DISCONNECTED' }
  | { type: 'STARTUP_ANIMATION_COMPLETE' }
  | { type: 'RESET_AFTER_SESSION_RESET' }
  | { type: 'SET_TRACK_SESSION_HISTORY'; enabled: boolean }
  | { type: 'SET_SESSION_HISTORY'; history: SessionHistoryRecord[] }
  | { type: 'SESSION_STARTED'; sessionId: string; startTick: number }
  | { type: 'SESSION_SAVE_TICK'; tick: number }
  | { type: 'CLEAR_ACTIVE_SESSION' };

export function createInitialAppShellState(storage: StorageReader): AppShellState {
  const hasResumeAvailable = canResumeSession(storage);
  const history = loadSessionHistory(storage);
  const activeSession = hasResumeAvailable
    ? (loadActiveSessionMeta(storage)
      ?? (history[0]
        ? {
            id: history[0].id,
            startTick: Math.max(0, Math.floor(history[0].gameTicks)),
          }
        : null))
    : null;

  return {
    isInventory: false,
    mobileTab: 'heximap',
    isPaused: false,
    interactionMode: 'mobile',
    guestStarted: false,
    resumeAvailable: hasResumeAvailable,
    startupAnimationShown: hasResumeAvailable,
    isSettingsOpen: false,
    isMascotOpen: false,
    sessionHistory: history,
    lastSessionSaveTick: activeSession?.startTick ?? 0,
    trackSessionHistory: loadTrackSessionHistoryPreference(storage, true),
    currentSessionId: activeSession?.id ?? null,
    currentSessionStartTick: activeSession?.startTick ?? 0,
  };
}

function pauseStateOnSettingsClose(state: AppShellState, documentHidden: boolean): boolean {
  if (documentHidden) return true;
  if (state.guestStarted) return false;
  return true;
}

function pauseStateOnVisibility(state: AppShellState, hidden: boolean): boolean {
  if (hidden) return true;
  if (state.isSettingsOpen) return true;
  return false;
}

export function appShellReducer(state: AppShellState, command: AppShellCommand): AppShellState {
  switch (command.type) {
    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: command.mode };

    case 'SET_MOBILE_TAB':
      return {
        ...state,
        mobileTab: command.tab,
        isInventory: command.tab === 'hexilab',
      };

    case 'OPEN_SETTINGS':
      return {
        ...state,
        isSettingsOpen: true,
        isPaused: true,
      };

    case 'CLOSE_SETTINGS':
      return {
        ...state,
        isSettingsOpen: false,
        isPaused: pauseStateOnSettingsClose(state, command.documentHidden),
      };

    case 'OPEN_MASCOT':
      return {
        ...state,
        isMascotOpen: true,
      };

    case 'CLOSE_MASCOT':
      return {
        ...state,
        isMascotOpen: false,
      };

    case 'VISIBILITY_CHANGED':
      return {
        ...state,
        isPaused: pauseStateOnVisibility(state, command.hidden),
      };

    case 'GUEST_STARTED':
      return {
        ...state,
        guestStarted: true,
        resumeAvailable: true,
        startupAnimationShown: false,
        isPaused: state.isSettingsOpen ? true : false,
      };

    case 'GUEST_CONTINUED':
      return {
        ...state,
        guestStarted: true,
        resumeAvailable: true,
        startupAnimationShown: true,
        isPaused: state.isSettingsOpen ? true : false,
      };

    case 'GUEST_DISCONNECTED':
      // Return to start screen without clearing session data.
      // The session state in localStorage is preserved; resumeAvailable stays true.
      return {
        ...state,
        guestStarted: false,
        startupAnimationShown: false,
        isPaused: true,
        isSettingsOpen: false,
        isMascotOpen: false,
      };

    case 'STARTUP_ANIMATION_COMPLETE':
      return {
        ...state,
        startupAnimationShown: true,
        isPaused: state.isSettingsOpen ? true : false,
      };

    case 'RESET_AFTER_SESSION_RESET':
      return {
        ...state,
        guestStarted: false,
        resumeAvailable: false,
        startupAnimationShown: false,
        isPaused: true,
        isInventory: false,
        mobileTab: 'heximap',
        isMascotOpen: false,
        currentSessionId: null,
        currentSessionStartTick: 0,
        lastSessionSaveTick: 0,
      };

    case 'SET_TRACK_SESSION_HISTORY':
      return {
        ...state,
        trackSessionHistory: command.enabled,
      };

    case 'SET_SESSION_HISTORY':
      return {
        ...state,
        sessionHistory: command.history,
      };

    case 'SESSION_STARTED':
      return {
        ...state,
        currentSessionId: command.sessionId,
        currentSessionStartTick: command.startTick,
        lastSessionSaveTick: command.startTick,
      };

    case 'SESSION_SAVE_TICK':
      return {
        ...state,
        lastSessionSaveTick: command.tick,
      };

    case 'CLEAR_ACTIVE_SESSION':
      return {
        ...state,
        currentSessionId: null,
        currentSessionStartTick: 0,
        lastSessionSaveTick: 0,
      };

    default:
      return state;
  }
}
