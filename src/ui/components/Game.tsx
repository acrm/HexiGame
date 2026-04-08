import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './Game.css';
import type { GameState, Axial } from '../../gameLogic/core/types';
import type { Params } from '../../gameLogic/core/params';
import { DefaultParams } from '../../gameLogic/core/params';
import { equalAxial } from '../../gameLogic/core/grid';
import ControlsDesktop from './ControlsInfoDesktop';
import PaletteCluster from './PaletteCluster';
import GameField from './GameField/GameField';
import Settings from './Settings';
import GameMobileTabs from './Game/GameMobileTabs';
import GamePanels from './Game/GamePanels';
import GameOverlays from './Game/GameOverlays';
import { getLanguage, setLanguage, subscribeToLanguageChange, t, type Lang } from '../i18n';
import { getTemplateById } from '../../templates/templateLibrary';
import { integration } from '../../appLogic/integration';
import {
  appShellReducer,
  createInitialAppShellState,
} from '../../appLogic/appShellReducer';
import {
  addSessionToHistory,
  clearSessionHistory,
  createNewSessionHistoryRecord,
  deleteSessionHistoryRecords,
  deleteSessionHistoryRecord,
  renameSessionHistoryRecord,
  loadActiveSessionMeta,
  saveActiveSessionMeta,
  saveSessionHistoryRecord,
  saveTrackSessionHistoryPreference,
} from '../../appLogic/sessionHistory';
import {
  clearSession,
  deleteSessionById,
  deleteSessionLog,
  saveSessionById,
  loadSessionById,
  loadSessionLog,
  saveSessionLog,
  type SessionLog,
} from '../../appLogic/sessionRepository';
import {
  createInitialUserSettingsState,
  persistUserSettings,
  userSettingsReducer,
} from '../../appLogic/userSettings';
import StartupAnimation from './StartupAnimation';
import Hexipedia from './Hexipedia';
import Mascot from './Mascot';
import { ColorScheme } from '../colorScheme';
import TutorialProgressWidget, { type TutorialWidgetPhase } from './TutorialProgressWidget';
import TutorialTaskIntroModal from './TutorialTaskIntroModal';
import ColorPaletteWidget from './ColorPaletteWidget';
import StructureProgressWidget from './StructureProgressWidget';
import { hoveredCellActive } from '../../gameLogic/systems/capture';
import {
  canOpenTaskIntroModal,
  shouldTrackFocusVisit,
  checkFocusTargetVisit,
  computeTaskViewModel,
  getInitialPendingTaskId,
  getNextPendingTaskId,
  getTaskUiGate,
  getTaskWidgetPhase,
  markTaskSequenceCompleted,
} from '../../appLogic/taskFlow';
import { getTaskDefinition } from '../../tasks/taskLevels';
import { getLocalizedText } from '../../tasks/taskState';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { useGameAudio } from '../hooks/useGameAudio';
import {
  createSessionController,
  initializeGameState,
  type SessionController,
} from '../../appLogic/sessionController';
import { mulberry32 } from '../../gameLogic/core/params';

const MASCOT_FACING_DIR_INDEX = 1;
type HexipediaSectionId = 'tasks' | 'session' | 'structures' | 'colors';

interface TaskIntroModalState {
  taskId: string;
}

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const [fps, setFps] = useState(0);
  const mouseIsDownRef = useRef(false);
  const [appShellState, dispatchApp] = useReducer(
    appShellReducer,
    undefined,
    () => createInitialAppShellState(localStorage),
  );
  const {
    isInventory,
    mobileTab,
    isPaused,
    interactionMode,
    guestStarted,
    startupAnimationShown,
    isSettingsOpen,
    isMascotOpen,
    sessionHistory,
    trackSessionHistory,
    currentSessionId,
    currentSessionStartTick,
  } = appShellState;
  const [settingsState, dispatchSettings] = useReducer(
    userSettingsReducer,
    undefined,
    () => createInitialUserSettingsState(localStorage, mergedParams.PlayerBaseColorIndex),
  );
  const {
    soundEnabled,
    soundVolume,
    musicEnabled,
    musicVolume,
    showFPS,
    isLeftHanded,
    selectedColorIndex,
    autoBaseColorEnabled,
    showColorWidget,
    showTaskWidget,
    showStructureWidget,
  } = settingsState;
  const [enabledHexipediaSections, setEnabledHexipediaSections] = useState<HexipediaSectionId[]>([
    'tasks',
  ]);
  const [pinnedHexipediaSections, setPinnedHexipediaSections] = useState<HexipediaSectionId[]>([
    'tasks',
  ]);
  const [focusHexipediaSection, setFocusHexipediaSection] = useState<HexipediaSectionId | null>(null);
  const [sectionOrder, setSectionOrder] = useState<HexipediaSectionId[]>(['tasks', 'session', 'structures', 'colors']);
  const [taskIntroModal, setTaskIntroModal] = useState<TaskIntroModalState | null>(null);
  const [pendingForceResetTaskId, setPendingForceResetTaskId] = useState<string | null>(null);
  const taskWidgetRef = useRef<HTMLDivElement | null>(null);
  const [language, setLanguageState] = useState<Lang>(() => getLanguage());

  // Game session state
  const [gameState, setGameState] = useState<GameState>(() => {
    const rng = mulberry32(seed ?? Date.now());
    return initializeGameState(mergedParams, rng);
  });

  // Stable refs for use in effects/event handlers (avoid stale closures)
  const sessionIdRef = useRef<string | null>(currentSessionId ?? null);
  sessionIdRef.current = currentSessionId ?? null;
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const autoDcRef = useRef({ guestStarted, currentSessionId, trackSessionHistory });
  autoDcRef.current = { guestStarted, currentSessionId, trackSessionHistory };

  const [playbackIsPaused, setPlaybackIsPaused] = useState(false);

  // Session controller (tick loop, persistence, dispatch)
  const controllerRef = useRef<SessionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createSessionController({
      params,
      seed,
      onStateChange: setGameState,
      getMobileTab: () => mobileTab,
      getSessionId: () => sessionIdRef.current,
    });
  }
  const {
    dispatch,
    resetSession: resetSessionController,
    reloadSessionFromStorage,
  } = controllerRef.current;

  useEffect(() => subscribeToLanguageChange(setLanguageState), []);

  // Start/stop tick loop based on guest started
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (guestStarted) {
      controller.enablePersistence(true);
      controller.start();
    } else {
      controller.stop();
      controller.enablePersistence(false);
    }
    return () => {
      controller.stop();
    };
  }, [guestStarted]);

  // Update pause state
  useEffect(() => {
    controllerRef.current?.setPaused(isPaused || playbackIsPaused || taskIntroModal !== null);
  }, [isPaused, playbackIsPaused, taskIntroModal]);

  // Reset session wrapper
  const resetSession = () => {
    resetSessionController();
  };

  const currentTask = useMemo(
    () => (gameState.taskId ? getTaskDefinition(gameState.taskId) : null),
    [gameState.taskId],
  );
  const completedTaskIds = gameState.taskCompletedIds ?? new Set<string>();

  const activeTaskId = gameState.taskProgress ? (gameState.taskId ?? null) : null;

  const activeTask = useMemo(
    () => (activeTaskId ? getTaskDefinition(activeTaskId) : null),
    [activeTaskId],
  );

  const taskViewModel = useMemo(
    () => computeTaskViewModel(gameState.taskId ?? null, gameState, mergedParams),
    [gameState.taskId, gameState, mergedParams],
  );

  const taskWidgetPhase = getTaskWidgetPhase(
    gameState.taskId ?? null,
    gameState.taskProgress,
    taskViewModel.isTaskComplete,
  );

  const taskUiGate = useMemo(
    () => getTaskUiGate(gameState.taskId ?? null, gameState.taskProgress, completedTaskIds),
    [gameState.taskId, gameState.taskProgress, completedTaskIds],
  );

  useEffect(() => {
    dispatch({ type: 'SET_TASK_INTERACTION_MODE', mode: interactionMode });
  }, [interactionMode, dispatch]);

  useEffect(() => {
    if (!guestStarted || gameState.taskId) return;

    const initialTaskId = getInitialPendingTaskId(completedTaskIds, localStorage);
    if (!initialTaskId) return;

    dispatch({ type: 'SELECT_TASK', taskId: initialTaskId });
  }, [guestStarted, gameState.taskId, completedTaskIds, dispatch]);

  const isLabLockedForKeyboard = taskUiGate.isLabLocked;

  useKeyboardInput({
    dispatch,
    interactionMode,
    isInputBlocked: taskIntroModal !== null,
    isInventoryLocked: isLabLockedForKeyboard,
    hotbarSize: 6,
  });

  const { playUiClick, playSound, playMusicFromInteraction } = useGameAudio({
    musicEnabled,
    musicVolume,
    soundEnabled,
    soundVolume,
    activeTemplate: gameState.activeTemplate,
    invalidMoveTarget: gameState.invalidMoveTarget,
  });

  // Auto-disconnect when page is hidden while a session is active
  useEffect(() => {
    const onVis = () => {
      const { guestStarted: gs, currentSessionId: sid, trackSessionHistory: track } = autoDcRef.current;
      if (document.hidden) {
        if (gs) {
          if (sid) {
            saveSessionById(sid, gameStateRef.current);
            if (track) {
              const history = saveSessionHistoryRecord(localStorage, sid, gameStateRef.current.tick);
              dispatchApp({ type: 'SET_SESSION_HISTORY', history });
            }
          }
          dispatchApp({ type: 'GUEST_DISCONNECTED' });
          setTaskIntroModal(null);
          setPendingForceResetTaskId(null);
          dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
        } else {
          dispatchApp({ type: 'VISIBILITY_CHANGED', hidden: true });
        }
        integration.onGameplayStop();
      } else {
        dispatchApp({ type: 'VISIBILITY_CHANGED', hidden: false });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only; autoDcRef + gameStateRef provide current values

  // Ensure active session identity exists while a guest session is running.
  useEffect(() => {
    if (!guestStarted || currentSessionId) return;

    const restored = loadActiveSessionMeta(localStorage);
    if (restored) {
      dispatchApp({
        type: 'SESSION_STARTED',
        sessionId: restored.id,
        startTick: restored.startTick,
      });
      return;
    }

    const startTick = gameState.tick;
    const fallbackSession = createNewSessionHistoryRecord();
    saveActiveSessionMeta(localStorage, { id: fallbackSession.id, startTick });
    dispatchApp({
      type: 'SESSION_STARTED',
      sessionId: fallbackSession.id,
      startTick,
    });

    if (trackSessionHistory) {
      const history = saveSessionHistoryRecord(localStorage, fallbackSession.id, startTick);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    }
  }, [guestStarted, currentSessionId, gameState.tick, trackSessionHistory]);

  // Persist active session identity to survive page reloads.
  useEffect(() => {
    if (!guestStarted || !currentSessionId) return;
    saveActiveSessionMeta(localStorage, {
      id: currentSessionId,
      startTick: currentSessionStartTick,
    });
  }, [guestStarted, currentSessionId, currentSessionStartTick]);

  // Persist session history on every game-state change while the session is active.
  useEffect(() => {
    if (!guestStarted || !currentSessionId) return;

    dispatchApp({ type: 'SESSION_SAVE_TICK', tick: gameState.tick });
    if (!trackSessionHistory) return;

    const history = saveSessionHistoryRecord(localStorage, currentSessionId, gameState.tick);
    dispatchApp({ type: 'SET_SESSION_HISTORY', history });
  }, [gameState, guestStarted, trackSessionHistory, currentSessionId]);

  // Save track session history setting
  useEffect(() => {
    saveTrackSessionHistoryPreference(localStorage, trackSessionHistory);
  }, [trackSessionHistory]);

  // Save user settings
  useEffect(() => {
    persistUserSettings(localStorage, settingsState);
  }, [settingsState]);

  // Gameplay lifecycle (start/stop based on game state and menu)
  // Note: integration.init() and onGameReady() are called once in index.tsx
  useEffect(() => {
    if (guestStarted && !isPaused && !isSettingsOpen && !isMascotOpen && !taskIntroModal) {
      integration.onGameplayStart();
    } else if (guestStarted) {
      integration.onGameplayStop();
    }
  }, [guestStarted, isPaused, isSettingsOpen, isMascotOpen, taskIntroModal]);

  // Derived HUD data
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';
  const widgetRelativeBaseColorIndex = autoBaseColorEnabled ? hoverColorIndex : selectedColorIndex;

  const prevTaskCompleteRef = useRef<boolean>(taskViewModel.isTaskComplete);

  // Close modal and reset when guest logs out
  useEffect(() => {
    if (guestStarted) return;
    setTaskIntroModal(null);
    setPendingForceResetTaskId(null);
  }, [guestStarted]);

  const handleSelectTask = (taskId: string) => {
    if (taskViewModel.completedTaskIds.has(taskId)) return;
    dispatch({ type: 'SELECT_TASK', taskId });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(null);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
  };

  const handleRestartTask = (taskId: string) => {
    dispatch({ type: 'SELECT_TASK', taskId });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(taskId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
  };

  // Set widget to "complete" phase when task is done (do NOT auto-advance)
  useEffect(() => {
    if (!gameState.taskId) {
      prevTaskCompleteRef.current = false;
      return;
    }
    const wasComplete = prevTaskCompleteRef.current;
    if (!wasComplete && taskViewModel.isTaskComplete) {
      playSound('audio/mixkit-small-win-2020.wav');
    }
    prevTaskCompleteRef.current = taskViewModel.isTaskComplete;
  }, [taskViewModel.isTaskComplete, gameState.taskId, playSound]);

  // Widget click handler — drives the pending → active → complete flow
  const handleWidgetClick = () => {
    if (taskWidgetPhase === 'complete' && gameState.taskId) {
      playUiClick();
      const nextTaskId = getNextPendingTaskId(gameState.taskId);
      dispatch({ type: 'COMPLETE_TASK', taskId: gameState.taskId });
      if (!nextTaskId) {
        markTaskSequenceCompleted(localStorage);
      }
      setTaskIntroModal(null);
      setPendingForceResetTaskId(null);
      return;
    }

    if (!canOpenTaskIntroModal(taskWidgetPhase)) return;

    const task = currentTask;
    if (!task) return;

    setTaskIntroModal({ taskId: task.id });
  };

  const setHexipediaSectionEnabled = (sectionId: HexipediaSectionId, enabled: boolean) => {
    setEnabledHexipediaSections((prev) => {
      if (enabled) {
        return prev.includes(sectionId) ? prev : [...prev, sectionId];
      }
      return prev.filter((id) => id !== sectionId);
    });

    if (!enabled) {
      setPinnedHexipediaSections((prev) => prev.filter((id) => id !== sectionId));
      setFocusHexipediaSection((prev) => (prev === sectionId ? null : prev));
    }
  };

  const setHexipediaSectionPinned = (sectionId: HexipediaSectionId, pinned: boolean) => {
    setPinnedHexipediaSections((prev) => {
      if (pinned) {
        return prev.includes(sectionId) ? prev : [...prev, sectionId];
      }
      return prev.filter((id) => id !== sectionId);
    });

    if (pinned) {
      setEnabledHexipediaSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
    }
  };

  const openHexipediaSection = (sectionId: HexipediaSectionId) => {
    playUiClick();
    setEnabledHexipediaSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
    setFocusHexipediaSection(sectionId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
  };

  const handleViewCurrentTask = () => {
    openHexipediaSection('tasks');
  };

  const isMobileLayout = true;

  const isLabLocked = taskUiGate.isLabLocked;
  const activeTaskTargetCells = gameState.taskProgress?.targetCells ?? activeTask?.targetCells ?? [];
  const activeTaskTargetHexes = gameState.taskProgress?.targetHexes ?? activeTask?.targetHexes ?? [];

  useEffect(() => {
    if (!isLabLocked) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: 'world' });
    if (mobileTab === 'lab') {
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
    }
  }, [isLabLocked, mobileTab, dispatch]);

  // Track focus visits on target cells
  useEffect(() => {
    if (!shouldTrackFocusVisit(activeTaskId, gameState, isMobileLayout, mobileTab)) {
      return;
    }

    const visitedKey = checkFocusTargetVisit(
      activeTaskId!,
      gameState.focus,
      gameState.taskProgress?.visitedTargetKeys ?? new Set(),
      activeTaskTargetCells,
    );

    if (!visitedKey) return;

    // Play service bell sound on target cell visit
    playSound('audio/mixkit-service-bell-931.wav');
    dispatch({ type: 'MARK_TASK_TARGET_VISITED', key: visitedKey });
  }, [
    gameState.focus,
    gameState.activeField,
    gameState.taskProgress,
    activeTaskId,
    activeTaskTargetCells,
    isMobileLayout,
    mobileTab,
    dispatch,
    playSound,
  ]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: mobileTab === 'lab' ? 'inventory' : 'world' });
  }, [isMobileLayout, mobileTab, dispatch]);

  // Keep only pinned sections enabled when Hexipedia tab is not active.
  useEffect(() => {
    if (mobileTab === 'hexipedia') return;
    setEnabledHexipediaSections((prev) =>
      prev.filter((sectionId) => pinnedHexipediaSections.includes(sectionId)),
    );
  }, [mobileTab, pinnedHexipediaSections]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'lab' : isInventory;

  const effectiveShowColorWidget = taskUiGate.canShowPaletteWidget && showColorWidget;
  const effectiveShowTaskWidget = !!gameState.taskId && showTaskWidget;
  const effectiveShowStructureWidget = taskUiGate.canShowStructureWidget && showStructureWidget;
  const effectiveHideHotbar = taskUiGate.hideHotbar || (activeTask?.hideHotbar ?? false);

  const resolvedVisitedHighlightTargets =
    activeTaskTargetHexes.length > 0
      ? (gameState.taskProgress?.collectedTargetKeys ?? new Set<string>())
      : (gameState.taskProgress?.visitedTargetKeys ?? new Set<string>());

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'map' ? ColorScheme.outside.background : mobileTab === 'lab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'map' && activeTask ? 56 : 8;

  const handleOpenSettings = () => {
    playUiClick();
    dispatchApp({ type: 'OPEN_SETTINGS' });
  };

  const handleSelectMapTab = () => {
    playUiClick();
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
  };

  const handleSelectHexipediaTab = () => {
    playUiClick();
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
  };

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
  };

  const persistGuestStartFlag = () => {
    localStorage.setItem('hexigame.guest.started', '1');
  };

  const handleDisconnect = () => {
    if (currentSessionId) {
      saveSessionById(currentSessionId, gameState);
      if (trackSessionHistory) {
        const history = saveSessionHistoryRecord(localStorage, currentSessionId, gameState.tick);
        dispatchApp({ type: 'SET_SESSION_HISTORY', history });
      }
    }

    dispatchApp({ type: 'GUEST_DISCONNECTED' });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(null);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
    playUiClick();
  };

  const handleLoadHistorySession = (sessionId: string) => {
    if (currentSessionId) {
      saveSessionById(currentSessionId, gameState);
      if (trackSessionHistory) {
        const history = saveSessionHistoryRecord(localStorage, currentSessionId, gameState.tick);
        dispatchApp({ type: 'SET_SESSION_HISTORY', history });
      }
    }

    const saved = loadSessionById(sessionId, localStorage);
    if (!saved?.gameState) return;

    localStorage.setItem('hexigame.session.state', JSON.stringify(saved));
    persistGuestStartFlag();
    reloadSessionFromStorage();

    dispatchApp({ type: 'GUEST_CONTINUED' });
    dispatchApp({ type: 'SESSION_STARTED', sessionId, startTick: saved.gameState.tick ?? 0 });
    saveActiveSessionMeta(localStorage, { id: sessionId, startTick: saved.gameState.tick ?? 0 });
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(null);
    playUiClick();
    playMusicFromInteraction();
  };

  const handleStartNewSession = () => {
    if (currentSessionId) {
      saveSessionById(currentSessionId, gameState);
    }
    resetSession();
    persistGuestStartFlag();
    dispatchApp({ type: 'GUEST_STARTED' });
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(null);

    const newSession = createNewSessionHistoryRecord(Date.now(), Math.random(), {
      language,
      existingHistory: sessionHistory,
    });
    saveActiveSessionMeta(localStorage, { id: newSession.id, startTick: 0 });
    dispatchApp({ type: 'SESSION_STARTED', sessionId: newSession.id, startTick: 0 });

    if (trackSessionHistory) {
      const history = addSessionToHistory(localStorage, newSession);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    }

    controllerRef.current?.initLog(newSession.id);

    playUiClick();
    playMusicFromInteraction();
  };

  const handleContinueSession = (sessionId: string) => {
    handleLoadHistorySession(sessionId);
  };

  const handleRenameSession = (sessionId: string, customName: string) => {
    const history = renameSessionHistoryRecord(localStorage, sessionId, customName);
    dispatchApp({ type: 'SET_SESSION_HISTORY', history });
  };

  const handleDeleteSessions = (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    for (const sessionId of sessionIds) {
      deleteSessionById(sessionId, localStorage);
      deleteSessionLog(sessionId, localStorage);
    }

    const history = deleteSessionHistoryRecords(localStorage, sessionIds);
    dispatchApp({ type: 'SET_SESSION_HISTORY', history });

    if (currentSessionId && sessionIds.includes(currentSessionId)) {
      clearSession(localStorage);
      dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
      dispatchApp({ type: 'CLEAR_ACTIVE_SESSION' });
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
      setTaskIntroModal(null);
      setPendingForceResetTaskId(null);
    }
  };

  const handleDownloadSession = (sessionId: string) => {
    const log = loadSessionLog(sessionId);
    if (!log) return;
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexigame-session-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSession = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const log = JSON.parse(text) as SessionLog;
        if (!log.sessionId || !Array.isArray(log.entries)) return;
        saveSessionLog(log);
        playUiClick();
      } catch {
        // invalid file — ignore
      }
    };
    reader.readAsText(file);
  };

  const handleStartupAnimationComplete = () => {
    dispatch({ type: 'MOVE_CURSOR_DIRECTION', dirIndex: MASCOT_FACING_DIR_INDEX });
    dispatchApp({ type: 'STARTUP_ANIMATION_COMPLETE' });
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
  };

  const currentSessionRecord = sessionHistory.find((r) => r.id === currentSessionId) ?? null;

  const hexiPediaProps: React.ComponentProps<typeof Hexipedia> = {
    gameState,
    params: mergedParams,
    interactionMode,
    task: currentTask,
    currentTaskId: gameState.taskId ?? null,
    isCurrentTaskComplete: taskViewModel.isTaskComplete,
    completedTaskIds: taskViewModel.completedTaskIds,
    sessionHistory,
    trackSessionHistory,
    soundEnabled,
    soundVolume,
    onSelectTask: handleSelectTask,
    onRestartTask: handleRestartTask,
    onToggleTrackHistory: (enabled: boolean) => {
      dispatchApp({ type: 'SET_TRACK_SESSION_HISTORY', enabled });
    },
    onDeleteSessionRecord: (recordId: string) => {
      deleteSessionById(recordId, localStorage);
      deleteSessionLog(recordId, localStorage);
      const history = deleteSessionHistoryRecord(localStorage, recordId);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });

      if (currentSessionId === recordId) {
        clearSession(localStorage);
        dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
        dispatchApp({ type: 'CLEAR_ACTIVE_SESSION' });
      }
    },
    onClearSessionHistory: () => {
      const history = clearSessionHistory(localStorage);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    },
    onSwitchTab: (tab: string) => {
      if (tab === 'map') {
        dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
      }
      if (tab === 'colors') {
        openHexipediaSection('colors');
      }
      if (tab === 'structures') {
        openHexipediaSection('structures');
      }
    },
    onActivateTemplate: (templateId: string) => {
      if (templateId === '') {
        dispatch({ type: 'DEACTIVATE_TEMPLATE' });
      } else {
        dispatch({ type: 'ACTIVATE_TEMPLATE', templateId });
      }
    },
    selectedColorIndex,
    onColorSelect: (index: number) => {
      dispatchSettings({ type: 'SET_SELECTED_COLOR_INDEX', index });
    },
    showColorWidget: effectiveShowColorWidget,
    onToggleColorWidget: (visible: boolean) => {
      dispatchSettings({ type: 'SET_SHOW_COLOR_WIDGET', visible });
    },
    showTaskWidget: effectiveShowTaskWidget,
    onToggleTaskWidget: (visible: boolean) => {
      dispatchSettings({ type: 'SET_SHOW_TASK_WIDGET', visible });
    },
    showStructureWidget: effectiveShowStructureWidget,
    onToggleStructureWidget: (visible: boolean) => {
      dispatchSettings({ type: 'SET_SHOW_STRUCTURE_WIDGET', visible });
    },
    enabledSections: enabledHexipediaSections,
    pinnedSections: pinnedHexipediaSections,
    onSetSectionEnabled: setHexipediaSectionEnabled,
    onSetSectionPinned: setHexipediaSectionPinned,
    focusSectionId: focusHexipediaSection,
    onFocusSectionHandled: () => {
      setFocusHexipediaSection(null);
    },
    sectionOrder,
    onChangeSectionOrder: setSectionOrder,
    currentSessionStartTick,
    currentSessionId: currentSessionId ?? null,
    currentSessionRecord,
    isPlaybackPaused: playbackIsPaused,
    onSetPlaybackPaused: (paused: boolean) => {
      setPlaybackIsPaused(paused);
    },
    onSeekToTick: (tick: number) => {
      const sid = currentSessionId;
      if (sid) controllerRef.current?.seekToTick(sid, tick);
    },
    onDownloadSession: handleDownloadSession,
  };

  const gameFieldProps: React.ComponentProps<typeof GameField> = {
    gameState,
    params: mergedParams,
    fps,
    setFps,
    showFPS,
    isInventory: effectiveIsInventory,
    onToggleInventory: () => {
      playUiClick();
      if (isMobileLayout) {
        dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
      } else {
        if (isLabLocked) return;
        dispatch({ type: 'TOGGLE_INVENTORY' });
      }
    },
    onCapture: () => {
      playUiClick();
      dispatch({ type: 'ACTION_PRESSED' });
    },
    onRelease: () => {
      // Mobile release ACT -> action already performed on press
    },
    onEat: () => {
      dispatch({ type: 'EAT_REQUESTED' });
    },
    onSetCursor: (q, r) => {
      playUiClick();
      const clickedPos = { q, r };
      const isFocusCell = equalAxial(clickedPos, gameState.focus);
      const isProtagonistCell = equalAxial(clickedPos, gameState.protagonist);
      if (isFocusCell || isProtagonistCell) {
        dispatch({ type: 'START_DRAG' });
      } else {
        dispatch({ type: 'MOVE_CURSOR_TO', target: clickedPos });
      }
    },
    onPreviewCursor: (q, r) => {
      dispatch({ type: 'PREVIEW_FOCUS_AT', target: { q, r } });
    },
    onTouchCommitCell: (q, r) => {
      const clickedPos = { q, r };
      if (equalAxial(clickedPos, gameState.protagonist)) {
        return;
      }

      playUiClick();
      dispatch({ type: 'MOVE_CURSOR_TO', target: clickedPos });
    },
    onCellClickDown: (q, r) => {
      if (mouseIsDownRef.current) return;
      mouseIsDownRef.current = true;
      const clickedPos = { q, r };
      const isFocusCell = equalAxial(clickedPos, gameState.focus);
      if (isFocusCell && !gameState.isDragging && !gameState.autoMoveTarget) {
        dispatch({ type: 'ACTION_PRESSED' });
        return;
      }
      const isProtagonistCell = equalAxial(clickedPos, gameState.protagonist);
      if (isFocusCell || isProtagonistCell) {
        dispatch({ type: 'START_DRAG' });
      } else {
        dispatch({ type: 'MOVE_CURSOR_TO', target: clickedPos });
      }
    },
    onCellClickUp: (_q, _r) => {
      if (!mouseIsDownRef.current) return;
      mouseIsDownRef.current = false;
      if (gameState.isDragging) {
        dispatch({ type: 'END_DRAG' });
      }
    },
    onCellDrag: (q, r) => {
      if (!gameState.isDragging) return;
      const dq = q - gameState.protagonist.q;
      const dr = r - gameState.protagonist.r;
      dispatch({ type: 'DRAG_MOVE', dq, dr });
    },
    onHotbarSlotClick: (slotIdx) => {
      playUiClick();
      dispatch({ type: 'EXCHANGE_HOTBAR_SLOT', slotIndex: slotIdx });
    },
    isLeftHanded,
    highlightTargets:
      activeTask && (!isMobileLayout || mobileTab === 'map')
        ? activeTaskTargetCells
        : [],
    visitedHighlightTargets: resolvedVisitedHighlightTargets,
    hideHotbar: effectiveHideHotbar,
  };

  const settingsProps: React.ComponentProps<typeof Settings> = {
    language,
    onLanguageChange: handleLanguageChange,
    onClose: () => dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden }),
    onResetSession: () => {
      resetSession();
      dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
      setTaskIntroModal(null);
      setPendingForceResetTaskId(null);
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'map' });
    },
    onShowMascot: () => {
      dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden });
      dispatchApp({ type: 'OPEN_MASCOT' });
    },
    soundEnabled,
    onToggleSound: (enabled) => {
      dispatchSettings({ type: 'SET_SOUND_ENABLED', enabled });
    },
    soundVolume,
    onSoundVolumeChange: (volume) => {
      dispatchSettings({ type: 'SET_SOUND_VOLUME', volume });
    },
    musicEnabled,
    onToggleMusic: (enabled) => {
      dispatchSettings({ type: 'SET_MUSIC_ENABLED', enabled });
    },
    musicVolume,
    onMusicVolumeChange: (volume) => {
      dispatchSettings({ type: 'SET_MUSIC_VOLUME', volume });
    },
    showFPS,
    onToggleShowFPS: (show) => {
      dispatchSettings({ type: 'SET_SHOW_FPS', show });
    },
    isLeftHanded,
    onToggleLeftHanded: (isLeft) => {
      dispatchSettings({ type: 'SET_LEFT_HANDED', isLeft });
    },
  };

  const taskCompleteTextByLabelKey: Record<string, string> = {
    'task.cellsVisited': t('task.complete.cellsVisited'),
    'task.targetHexesCollected': t('task.complete.targetHexesCollected'),
    'task.cellsCleared': t('task.complete.cellsCleared'),
    'task.oppositeColorsCollected': t('task.complete.oppositeColorsCollected'),
    'task.cellsPlaced': t('task.complete.cellsPlaced'),
  };

  const taskWidgetProps = currentTask && taskWidgetPhase !== 'hidden'
    ? {
        phase: taskWidgetPhase as TutorialWidgetPhase,
        taskName: getLocalizedText(currentTask.name, language),
        progressCurrent: taskViewModel.progressCurrent,
        progressTotal: taskViewModel.progressTotal,
        progressLabel: t(taskViewModel.progressLabelKey),
        completeText:
          taskCompleteTextByLabelKey[taskViewModel.progressLabelKey] ??
          t('task.widget.done'),
        onWidgetClick: handleWidgetClick,
        onNavigateToTasks: handleViewCurrentTask,
        containerRef: taskWidgetRef,
      }
    : null;

  const visibleTaskWidgetProps = effectiveShowTaskWidget ? taskWidgetProps : null;

  const taskIntroDefinition = taskIntroModal ? getTaskDefinition(taskIntroModal.taskId) : null;

  const taskIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null = taskIntroModal && taskIntroDefinition
    ? {
        setupText: getLocalizedText(taskIntroDefinition.setup, language),
        objectiveText: getLocalizedText(taskIntroDefinition.objective, language),
        startLabel: t('task.modal.start'),
        postponeLabel: t('task.modal.postpone'),
        getFlyToRect: () => taskWidgetRef.current?.getBoundingClientRect() ?? null,
        onStart: () => {
          dispatch({
            type: 'START_TASK',
            taskId: taskIntroModal.taskId,
            forceReset: pendingForceResetTaskId === taskIntroModal.taskId,
          });
          setPendingForceResetTaskId((current) => current === taskIntroModal.taskId ? null : current);
          setTaskIntroModal(null);
        },
        onPostpone: () => {
          setTaskIntroModal(null);
        },
      }
    : null;

  const colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null = effectiveShowColorWidget
    ? {
        colorPalette: mergedParams.ColorPalette,
        selectedColorIndex: selectedColorIndex ?? mergedParams.PlayerBaseColorIndex,
        relativeBaseColorIndex: widgetRelativeBaseColorIndex,
        playerBaseColorIndex: mergedParams.PlayerBaseColorIndex,
        isAutoBaseColorEnabled: autoBaseColorEnabled,
        onColorSelect: (index) => { dispatchSettings({ type: 'SET_SELECTED_COLOR_INDEX', index }); },
        onToggleAutoBaseColor: () => { dispatchSettings({ type: 'TOGGLE_AUTO_BASE_COLOR_ENABLED' }); },
        onNavigateToPalette: () => { openHexipediaSection('colors'); },
      }
    : null;

  const activeStructureTemplate = gameState.activeTemplate
    ? getTemplateById(gameState.activeTemplate.templateId)
    : undefined;

  const structureWidgetProps: React.ComponentProps<typeof StructureProgressWidget> | null =
    effectiveShowStructureWidget && gameState.activeTemplate && activeStructureTemplate
      ? {
          structureName: activeStructureTemplate.name[language],
          progressCurrent: gameState.activeTemplate.filledCells.size,
          progressTotal: activeStructureTemplate.structure.cells.length,
          hasErrors: gameState.activeTemplate.hasErrors,
          isCompleted: !!gameState.activeTemplate.completedAtTick,
          baseColor:
            gameState.activeTemplate.anchoredAt
              ? mergedParams.ColorPalette[gameState.activeTemplate.anchoredAt.baseColorIndex] ?? null
              : null,
          onNavigateToStructures: () => { openHexipediaSection('structures'); },
        }
      : null;

  return (
    <div
      className="game-root mobile-forced"
      style={{ backgroundColor: '#3a3a3a', ['--game-bg' as any]: backgroundColor }}
    >
      {!isMobileLayout && (
        <div className="game-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', justifyContent: 'space-between' }}>
            {/* Palette cluster with center showing chance/state */}
            <PaletteCluster
              colorPalette={mergedParams.ColorPalette}
              playerBaseColorIndex={mergedParams.PlayerBaseColorIndex}
              antagonistIndex={antagonistIndex}
              hoverColorIndex={hoverColorIndex}
              chance={null}
            />
          </div>
          <ControlsDesktop />
        </div>
      )}
      {isMobileLayout && (
        <GameMobileTabs
          mobileTab={mobileTab}
          isHexiOsMode={!guestStarted}
          onSelectMap={handleSelectMapTab}
          onSelectHexipedia={handleSelectHexipediaTab}
          onOpenSettings={handleOpenSettings}
          onDisconnect={handleDisconnect}
          onPlayLatestSession={() => {
            const latest = [...sessionHistory].sort(
              (a, b) => (b.lastActionTime ?? b.endTime) - (a.lastActionTime ?? a.endTime),
            )[0];
            if (latest) handleContinueSession(latest.id);
          }}
        />
      )}

      <GameOverlays
        isMobileLayout={isMobileLayout}
        mobileTab={mobileTab}
        taskWidgetProps={visibleTaskWidgetProps}
        taskIntroModalProps={taskIntroModalProps}
        colorPaletteWidgetProps={colorPaletteWidgetProps}
        structureWidgetProps={structureWidgetProps}
        sectionOrder={sectionOrder}
        showGuestStart={!guestStarted}
        sessionHistory={sessionHistory}
        currentSessionId={currentSessionId ?? null}
        onContinueSession={handleContinueSession}
        onNewSession={handleStartNewSession}
        onDownloadSession={handleDownloadSession}
        onImportSession={handleImportSession}
        onRenameSession={handleRenameSession}
        onDeleteSessions={handleDeleteSessions}
        onOpenSettings={handleOpenSettings}
        onGuestStartUiClick={playUiClick}
        language={language}
        onLanguageChange={handleLanguageChange}
        isSettingsOpen={isSettingsOpen}
        settingsProps={settingsProps}
        isMascotOpen={isMascotOpen}
        onCloseMascot={() => dispatchApp({ type: 'CLOSE_MASCOT' })}
      />

      <GamePanels
        isMobileLayout={isMobileLayout}
        mobileTab={mobileTab}
        hexiPediaProps={hexiPediaProps}
        gameFieldProps={gameFieldProps}
      />

      {guestStarted && !startupAnimationShown && (
        <StartupAnimation
          onComplete={handleStartupAnimationComplete}
        />
      )}
    </div>
  );
};

export default Game;
