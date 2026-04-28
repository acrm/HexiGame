import {
  loadActiveSessionMeta,
  loadSessionHistory,
  loadTrackSessionHistoryPreference,
  type SessionHistoryRecord,
  type StorageReader,
} from './sessionHistory';
import { canResumeSession, loadSession } from './sessionRepository';
import { mirrorStorageSetItem } from './indexedDbMirror';

const GUEST_STARTED_KEY = 'hexigame.guest.started';
const HEXIPEDIA_SHELL_KEY = 'hexigame.ui.hexipedia';
const WAS_IN_GAMEPLAY_KEY = 'hexigame.shell.wasInGameplay';

export type MobileTab = 'map' | 'lab' | 'hexipedia';
export type InteractionMode = 'desktop' | 'mobile';
export type HexipediaSectionId = 'tasks' | 'session' | 'structures' | 'colors';

export interface HexipediaShellState {
  enabledSections: HexipediaSectionId[];
  pinnedSections: HexipediaSectionId[];
  sectionOrder: HexipediaSectionId[];
}

const DEFAULT_HEXIPEDIA: HexipediaShellState = {
  enabledSections: ['tasks'],
  pinnedSections: ['tasks'],
  sectionOrder: ['tasks', 'session', 'structures', 'colors'],
};

function loadHexipediaShell(storage: StorageReader): HexipediaShellState {
  try {
    const raw = storage.getItem(HEXIPEDIA_SHELL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HexipediaShellState>;
      return {
        enabledSections: parsed.enabledSections ?? DEFAULT_HEXIPEDIA.enabledSections,
        pinnedSections: parsed.pinnedSections ?? DEFAULT_HEXIPEDIA.pinnedSections,
        sectionOrder: parsed.sectionOrder ?? DEFAULT_HEXIPEDIA.sectionOrder,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_HEXIPEDIA };
}

function filterEnabledToPinned(hexipedia: HexipediaShellState): HexipediaShellState {
  return {
    ...hexipedia,
    enabledSections: hexipedia.enabledSections.filter(s =>
      hexipedia.pinnedSections.includes(s)
    ),
  };
}

export function persistHexipediaShell(hexipedia: HexipediaShellState): void {
  const value = JSON.stringify(hexipedia);
  localStorage.setItem(HEXIPEDIA_SHELL_KEY, value);
  mirrorStorageSetItem(HEXIPEDIA_SHELL_KEY, value);
}

export function persistWasInGameplay(wasInGameplay: boolean): void {
  const value = String(wasInGameplay);
  localStorage.setItem(WAS_IN_GAMEPLAY_KEY, value);
  mirrorStorageSetItem(WAS_IN_GAMEPLAY_KEY, value);
}

export interface AppShellState {
  isInventory: boolean;
  mobileTab: MobileTab;
  isPaused: boolean;
  interactionMode: InteractionMode;
  guestStarted: boolean;
  wasInGameplay: boolean;
  resumeAvailable: boolean;
  startupAnimationShown: boolean;
  isSettingsOpen: boolean;
  isMascotOpen: boolean;
  sessionHistory: SessionHistoryRecord[];
  lastSessionSaveTick: number;
  trackSessionHistory: boolean;
  currentSessionId: string | null;
  currentSessionStartTick: number;
  hexipedia: HexipediaShellState;
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
  | { type: 'CLEAR_ACTIVE_SESSION' }
  | { type: 'HEXIPEDIA_TOGGLE_SECTION'; sectionId: HexipediaSectionId; enabled: boolean }
  | { type: 'HEXIPEDIA_PIN_SECTION'; sectionId: HexipediaSectionId }
  | { type: 'HEXIPEDIA_UNPIN_SECTION'; sectionId: HexipediaSectionId }
  | { type: 'HEXIPEDIA_REORDER'; order: HexipediaSectionId[] }
  | { type: 'HEXIPEDIA_OPEN_SECTION'; sectionId: HexipediaSectionId };

export function createInitialAppShellState(storage: StorageReader): AppShellState {
  const hasResumeAvailable = canResumeSession(storage);
  const wasInGameplay = storage.getItem(WAS_IN_GAMEPLAY_KEY) === 'true';
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

  const savedSession = hasResumeAvailable ? loadSession(storage) : null;
  const savedMobileTab = (savedSession?.ui?.mobileTab as MobileTab | undefined) ?? 'map';

  return {
    isInventory: false,
    mobileTab: savedMobileTab,
    isPaused: false,
    interactionMode: 'mobile',
    guestStarted: hasResumeAvailable && wasInGameplay,
    wasInGameplay,
    resumeAvailable: hasResumeAvailable,
    startupAnimationShown: hasResumeAvailable,
    isSettingsOpen: false,
    isMascotOpen: false,
    sessionHistory: history,
    lastSessionSaveTick: activeSession?.startTick ?? 0,
    trackSessionHistory: loadTrackSessionHistoryPreference(storage, true),
    currentSessionId: activeSession?.id ?? null,
    currentSessionStartTick: activeSession?.startTick ?? 0,
    hexipedia: loadHexipediaShell(storage),
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

    case 'SET_MOBILE_TAB': {
      const newHexipedia = command.tab !== 'hexipedia'
        ? filterEnabledToPinned(state.hexipedia)
        : state.hexipedia;
      return {
        ...state,
        mobileTab: command.tab,
        isInventory: command.tab === 'lab',
        hexipedia: newHexipedia,
      };
    }

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
        wasInGameplay: false,
        resumeAvailable: false,
        startupAnimationShown: false,
        isPaused: true,
        isInventory: false,
        mobileTab: 'map',
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

    case 'HEXIPEDIA_TOGGLE_SECTION': {
      const { sectionId, enabled } = command;
      const newEnabled = enabled
        ? (state.hexipedia.enabledSections.includes(sectionId)
            ? state.hexipedia.enabledSections
            : [...state.hexipedia.enabledSections, sectionId])
        : state.hexipedia.enabledSections.filter(id => id !== sectionId);
      const newPinned = enabled
        ? state.hexipedia.pinnedSections
        : state.hexipedia.pinnedSections.filter(id => id !== sectionId);
      return {
        ...state,
        hexipedia: { ...state.hexipedia, enabledSections: newEnabled, pinnedSections: newPinned },
      };
    }

    case 'HEXIPEDIA_PIN_SECTION': {
      const { sectionId } = command;
      const newPinned = state.hexipedia.pinnedSections.includes(sectionId)
        ? state.hexipedia.pinnedSections
        : [...state.hexipedia.pinnedSections, sectionId];
      const newEnabled = state.hexipedia.enabledSections.includes(sectionId)
        ? state.hexipedia.enabledSections
        : [...state.hexipedia.enabledSections, sectionId];
      return {
        ...state,
        hexipedia: { ...state.hexipedia, pinnedSections: newPinned, enabledSections: newEnabled },
      };
    }

    case 'HEXIPEDIA_UNPIN_SECTION': {
      const { sectionId } = command;
      const newPinned = state.hexipedia.pinnedSections.filter(id => id !== sectionId);
      // If not on hexipedia tab, also remove from enabled (same rule as filterEnabledToPinned)
      const newEnabled = state.mobileTab !== 'hexipedia'
        ? state.hexipedia.enabledSections.filter(id => id !== sectionId)
        : state.hexipedia.enabledSections;
      return {
        ...state,
        hexipedia: { ...state.hexipedia, pinnedSections: newPinned, enabledSections: newEnabled },
      };
    }

    case 'HEXIPEDIA_REORDER':
      return {
        ...state,
        hexipedia: { ...state.hexipedia, sectionOrder: command.order },
      };

    case 'HEXIPEDIA_OPEN_SECTION': {
      const { sectionId } = command;
      const newEnabled = state.hexipedia.enabledSections.includes(sectionId)
        ? state.hexipedia.enabledSections
        : [...state.hexipedia.enabledSections, sectionId];
      return {
        ...state,
        hexipedia: { ...state.hexipedia, enabledSections: newEnabled },
      };
    }

    default:
      return state;
  }
}
