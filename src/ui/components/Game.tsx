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
import { getLanguage, t } from '../i18n';
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
  deleteSessionHistoryRecord,
  loadActiveSessionMeta,
  saveActiveSessionMeta,
  saveSessionHistoryRecord,
  saveTrackSessionHistoryPreference,
} from '../../appLogic/sessionHistory';
import {
  createInitialUserSettingsState,
  persistUserSettings,
  userSettingsReducer,
} from '../../appLogic/userSettings';
import GuestStart from './GuestStart';
import StartupAnimation from './StartupAnimation';
import HexiPedia from './HexiPedia';
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
import { clearSession } from '../../appLogic/sessionRepository';

const MASCOT_FACING_DIR_INDEX = 1;
type HexiPediaSectionId = 'tasks' | 'stats' | 'structures' | 'colors';

interface TaskIntroModalState {
  taskId: string;
  setupText: string;
  objectiveText: string;
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
  const [enabledHexiPediaSections, setEnabledHexiPediaSections] = useState<HexiPediaSectionId[]>([
    'tasks',
  ]);
  const [pinnedHexiPediaSections, setPinnedHexiPediaSections] = useState<HexiPediaSectionId[]>([
    'tasks',
  ]);
  const [focusHexiPediaSection, setFocusHexiPediaSection] = useState<HexiPediaSectionId | null>(null);
  const [sectionOrder, setSectionOrder] = useState<HexiPediaSectionId[]>(['tasks', 'stats', 'structures', 'colors']);
  const [taskIntroModal, setTaskIntroModal] = useState<TaskIntroModalState | null>(null);
  const [pendingForceResetTaskId, setPendingForceResetTaskId] = useState<string | null>(null);
  const taskWidgetRef = useRef<HTMLDivElement | null>(null);

  // Game session state
  const [gameState, setGameState] = useState<GameState>(() => {
    const rng = mulberry32(seed ?? Date.now());
    return initializeGameState(mergedParams, rng);
  });

  // Session controller (tick loop, persistence, dispatch)
  const controllerRef = useRef<SessionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createSessionController({
      params,
      seed,
      onStateChange: setGameState,
      getMobileTab: () => mobileTab,
    });
  }
  const { dispatch, resetSession: resetSessionController } = controllerRef.current;

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
    controllerRef.current?.setPaused(isPaused || taskIntroModal !== null);
  }, [isPaused, taskIntroModal]);

  // Reset session wrapper
  const resetSession = () => {
    clearSession();
    const rng = mulberry32(seed ?? Date.now());
    const fresh = initializeGameState(mergedParams, rng);
    setGameState(fresh);
  };

  const currentTask = useMemo(
    () => (gameState.taskId ? getTaskDefinition(gameState.taskId) : null),
    [gameState.taskId],
  );

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
    () => getTaskUiGate(activeTaskId),
    [activeTaskId],
  );

  useEffect(() => {
    dispatch({ type: 'SET_TASK_INTERACTION_MODE', mode: interactionMode });
  }, [interactionMode, dispatch]);

  useEffect(() => {
    if (!guestStarted || gameState.taskId) return;

    const initialTaskId = getInitialPendingTaskId(gameState.taskCompletedIds ?? new Set<string>(), localStorage);
    if (!initialTaskId) return;

    dispatch({ type: 'SELECT_TASK', taskId: initialTaskId });
  }, [guestStarted, gameState.taskId, gameState.taskCompletedIds, dispatch]);

  const isHexiLabLockedForKeyboard = taskUiGate.isHexiLabLocked;

  useKeyboardInput({
    dispatch,
    interactionMode,
    isInputBlocked: taskIntroModal !== null,
    isInventoryLocked: isHexiLabLockedForKeyboard,
    hotbarSize: 6,
  });

  const { playUiClick, playSound, playMusicFromInteraction } = useGameAudio({
    guestStarted,
    musicEnabled,
    musicVolume,
    soundEnabled,
    soundVolume,
    activeTemplate: gameState.activeTemplate,
    invalidMoveTarget: gameState.invalidMoveTarget,
  });

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        dispatchApp({ type: 'VISIBILITY_CHANGED', hidden: true });
        integration.onGameplayStop();
      } else {
        dispatchApp({ type: 'VISIBILITY_CHANGED', hidden: false });
        if (guestStarted && !isSettingsOpen) {
          integration.onGameplayStart();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [guestStarted, isSettingsOpen]);

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
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
  };

  const handleRestartTask = (taskId: string) => {
    dispatch({ type: 'SELECT_TASK', taskId });
    setTaskIntroModal(null);
    setPendingForceResetTaskId(taskId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
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

    const language = getLanguage();
    setTaskIntroModal({
      taskId: task.id,
      setupText: getLocalizedText(task.setup, language),
      objectiveText: getLocalizedText(task.objective, language),
    });
  };

  const setHexiPediaSectionEnabled = (sectionId: HexiPediaSectionId, enabled: boolean) => {
    setEnabledHexiPediaSections((prev) => {
      if (enabled) {
        return prev.includes(sectionId) ? prev : [...prev, sectionId];
      }
      return prev.filter((id) => id !== sectionId);
    });

    if (!enabled) {
      setPinnedHexiPediaSections((prev) => prev.filter((id) => id !== sectionId));
      setFocusHexiPediaSection((prev) => (prev === sectionId ? null : prev));
    }
  };

  const setHexiPediaSectionPinned = (sectionId: HexiPediaSectionId, pinned: boolean) => {
    setPinnedHexiPediaSections((prev) => {
      if (pinned) {
        return prev.includes(sectionId) ? prev : [...prev, sectionId];
      }
      return prev.filter((id) => id !== sectionId);
    });

    if (pinned) {
      setEnabledHexiPediaSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
    }
  };

  const openHexiPediaSection = (sectionId: HexiPediaSectionId) => {
    playUiClick();
    setEnabledHexiPediaSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
    setFocusHexiPediaSection(sectionId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
  };

  const handleViewCurrentTask = () => {
    openHexiPediaSection('tasks');
  };

  const isMobileLayout = true;

  const isHexiLabLocked = taskUiGate.isHexiLabLocked;

  useEffect(() => {
    if (!isHexiLabLocked) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: 'world' });
    if (mobileTab === 'hexilab') {
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
    }
  }, [isHexiLabLocked, mobileTab, dispatch]);

  // Track focus visits on target cells
  useEffect(() => {
    if (!shouldTrackFocusVisit(activeTaskId, gameState, isMobileLayout, mobileTab)) {
      return;
    }

    const visitedKey = checkFocusTargetVisit(
      activeTaskId!,
      gameState.focus,
      gameState.taskProgress?.visitedTargetKeys ?? new Set(),
    );

    if (!visitedKey) return;

    // Play service bell sound on target cell visit
    playSound('audio/mixkit-service-bell-931.wav');
    dispatch({ type: 'MARK_TASK_TARGET_VISITED', key: visitedKey });
  }, [gameState.focus, gameState.activeField, gameState.taskProgress, activeTaskId, isMobileLayout, mobileTab, dispatch, playSound]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: mobileTab === 'hexilab' ? 'inventory' : 'world' });
  }, [isMobileLayout, mobileTab, dispatch]);

  // Keep only pinned sections enabled when HexiPedia tab is not active.
  useEffect(() => {
    if (mobileTab === 'hexipedia') return;
    setEnabledHexiPediaSections((prev) =>
      prev.filter((sectionId) => pinnedHexiPediaSections.includes(sectionId)),
    );
  }, [mobileTab, pinnedHexiPediaSections]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'hexilab' : isInventory;

  const effectiveShowColorWidget = taskUiGate.canShowPaletteWidget && showColorWidget;
  const effectiveShowTaskWidget = !!gameState.taskId && showTaskWidget;
  const effectiveShowStructureWidget = taskUiGate.canShowStructureWidget && showStructureWidget;
  const effectiveHideHotbar = taskUiGate.hideHotbar || (activeTask?.hideHotbar ?? false);

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'heximap' && activeTask ? 56 : 8;

  const handleOpenSettings = () => {
    playUiClick();
    dispatchApp({ type: 'OPEN_SETTINGS' });
  };

  const handleSelectHexiMapTab = () => {
    playUiClick();
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
  };

  const handleSelectHexiPediaTab = () => {
    playUiClick();
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
  };

  const handleGuestStart = () => {
    localStorage.setItem('hexigame.guest.started', '1');
    dispatchApp({ type: 'GUEST_STARTED' });
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });

    const newSession = createNewSessionHistoryRecord();
    saveActiveSessionMeta(localStorage, { id: newSession.id, startTick: 0 });
    dispatchApp({ type: 'SESSION_STARTED', sessionId: newSession.id, startTick: 0 });

    if (trackSessionHistory) {
      const history = addSessionToHistory(localStorage, newSession);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    }

    playUiClick();
    playMusicFromInteraction();
  };

  const handleStartupAnimationComplete = () => {
    dispatch({ type: 'MOVE_CURSOR_DIRECTION', dirIndex: MASCOT_FACING_DIR_INDEX });
    dispatchApp({ type: 'STARTUP_ANIMATION_COMPLETE' });
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
  };

  const hexiPediaProps: React.ComponentProps<typeof HexiPedia> = {
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
      const history = deleteSessionHistoryRecord(localStorage, recordId);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    },
    onClearSessionHistory: () => {
      const history = clearSessionHistory(localStorage);
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    },
    onSwitchTab: (tab: string) => {
      if (tab === 'heximap') {
        dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
      }
      if (tab === 'colors') {
        openHexiPediaSection('colors');
      }
      if (tab === 'structures') {
        openHexiPediaSection('structures');
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
    enabledSections: enabledHexiPediaSections,
    pinnedSections: pinnedHexiPediaSections,
    onSetSectionEnabled: setHexiPediaSectionEnabled,
    onSetSectionPinned: setHexiPediaSectionPinned,
    focusSectionId: focusHexiPediaSection,
    onFocusSectionHandled: () => {
      setFocusHexiPediaSection(null);
    },
    sectionOrder,
    onChangeSectionOrder: setSectionOrder,
    currentSessionStartTick,
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
        dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
      } else {
        if (isHexiLabLocked) return;
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
      activeTask && (!isMobileLayout || mobileTab === 'heximap')
        ? (activeTask.targetCells ?? [])
        : [],
    visitedHighlightTargets: gameState.taskProgress?.visitedTargetKeys ?? new Set(),
    hideHotbar: effectiveHideHotbar,
  };

  const settingsProps: React.ComponentProps<typeof Settings> = {
    onClose: () => dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden }),
    onResetSession: () => {
      resetSession();
      dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
      setTaskIntroModal(null);
      setPendingForceResetTaskId(null);
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
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
        taskName: getLocalizedText(currentTask.name, getLanguage()),
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

  const taskIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null = taskIntroModal
    ? {
        setupText: taskIntroModal.setupText,
        objectiveText: taskIntroModal.objectiveText,
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
        onNavigateToPalette: () => { openHexiPediaSection('colors'); },
      }
    : null;

  const activeStructureTemplate = gameState.activeTemplate
    ? getTemplateById(gameState.activeTemplate.templateId)
    : undefined;

  const structureWidgetProps: React.ComponentProps<typeof StructureProgressWidget> | null =
    effectiveShowStructureWidget && gameState.activeTemplate && activeStructureTemplate
      ? {
          structureName: activeStructureTemplate.name[getLanguage()],
          progressCurrent: gameState.activeTemplate.filledCells.size,
          progressTotal: activeStructureTemplate.structure.cells.length,
          hasErrors: gameState.activeTemplate.hasErrors,
          isCompleted: !!gameState.activeTemplate.completedAtTick,
          baseColor:
            gameState.activeTemplate.anchoredAt
              ? mergedParams.ColorPalette[gameState.activeTemplate.anchoredAt.baseColorIndex] ?? null
              : null,
          onNavigateToStructures: () => { openHexiPediaSection('structures'); },
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
          onSelectHexiMap={handleSelectHexiMapTab}
          onSelectHexiPedia={handleSelectHexiPediaTab}
          onOpenSettings={handleOpenSettings}
        />
      )}

      <GamePanels
        isMobileLayout={isMobileLayout}
        mobileTab={mobileTab}
        hexiPediaProps={hexiPediaProps}
        gameFieldProps={gameFieldProps}
      />

      <GameOverlays
        isMobileLayout={isMobileLayout}
        mobileTab={mobileTab}
        taskWidgetProps={visibleTaskWidgetProps}
        taskIntroModalProps={taskIntroModalProps}
        colorPaletteWidgetProps={colorPaletteWidgetProps}
        structureWidgetProps={structureWidgetProps}
        sectionOrder={sectionOrder}
        showGuestStart={!guestStarted}
        onGuestStart={handleGuestStart}
        isSettingsOpen={isSettingsOpen}
        settingsProps={settingsProps}
        isMascotOpen={isMascotOpen}
        onCloseMascot={() => dispatchApp({ type: 'CLOSE_MASCOT' })}
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
