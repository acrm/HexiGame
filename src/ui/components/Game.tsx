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
import { hoveredCellActive } from '../../gameLogic/systems/capture';
import {
  createInitialTutorialFlowState,
  computeTutorialViewModel,
  createTutorialFlowActions,
  shouldTrackFocusVisit,
  checkFocusTargetVisit,
  type TutorialFlowState,
} from '../../appLogic/tutorialFlow';
import { getLocalizedText } from '../../tutorial/tutorialState';
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
type HexiPediaSectionId = 'tasks' | 'stats' | 'templates' | 'colors';

interface TutorialIntroModalState {
  levelId: string;
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
    lastSessionSaveTick,
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
    showTutorialWidget,
  } = settingsState;
  // Tutorial flow state
  const [tutorialFlowState, setTutorialFlowState] = useState<TutorialFlowState>(() =>
    createInitialTutorialFlowState(),
  );
  const [enabledHexiPediaSections, setEnabledHexiPediaSections] = useState<HexiPediaSectionId[]>([
    'tasks',
  ]);
  const [pinnedHexiPediaSections, setPinnedHexiPediaSections] = useState<HexiPediaSectionId[]>([
    'tasks',
  ]);
  const [focusHexiPediaSection, setFocusHexiPediaSection] = useState<HexiPediaSectionId | null>(null);
  const [sectionOrder, setSectionOrder] = useState<HexiPediaSectionId[]>(['tasks', 'stats', 'templates', 'colors']);
  const [tutorialIntroModal, setTutorialIntroModal] = useState<TutorialIntroModalState | null>(null);
  const [tutorialWidgetPhase, setTutorialWidgetPhase] = useState<TutorialWidgetPhase>('pending');
  const tutorialWidgetRef = useRef<HTMLDivElement | null>(null);

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
    controllerRef.current?.setPaused(isPaused || tutorialIntroModal !== null);
  }, [isPaused, tutorialIntroModal]);

  // Reset session wrapper
  const resetSession = () => {
    clearSession();
    const rng = mulberry32(seed ?? Date.now());
    const fresh = initializeGameState(mergedParams, rng);
    setGameState(fresh);
  };

  // Compute tutorial view model
  const tutorialViewModel = useMemo(
    () => computeTutorialViewModel(tutorialFlowState, gameState, mergedParams),
    [tutorialFlowState, gameState, mergedParams],
  );

  // Tutorial actions
  const tutorialActions = useMemo(
    () => createTutorialFlowActions(setTutorialFlowState, dispatch, dispatchApp),
    [dispatch, dispatchApp],
  );

  // Keyboard input (desktop mode only)
  const isHexiLabLockedForKeyboard = tutorialViewModel.isHexiLabLocked;

  useKeyboardInput({
    dispatch,
    interactionMode,
    isInputBlocked: tutorialIntroModal !== null,
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

  // Sync tutorial level into gameState when tutorialFlowState changes
  useEffect(() => {
    dispatch({ type: 'SET_TUTORIAL_LEVEL', levelId: tutorialFlowState.currentLevelId });
    dispatch({ type: 'SET_TUTORIAL_INTERACTION_MODE', mode: interactionMode });
  }, [tutorialFlowState.currentLevelId, interactionMode, dispatch]);

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

  // Save session history every 360 ticks (~30 seconds) if enabled
  useEffect(() => {
    if (!guestStarted || !trackSessionHistory || !currentSessionId) return;
    const ticksSinceLastSave = gameState.tick - lastSessionSaveTick;
    if (ticksSinceLastSave >= 360) {
      const history = saveSessionHistoryRecord(localStorage, currentSessionId, gameState.tick);
      dispatchApp({ type: 'SESSION_SAVE_TICK', tick: gameState.tick });
      dispatchApp({ type: 'SET_SESSION_HISTORY', history });
    }
  }, [gameState.tick, guestStarted, trackSessionHistory, currentSessionId, lastSessionSaveTick]);

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
    if (guestStarted && !isPaused && !isSettingsOpen && !isMascotOpen && !tutorialIntroModal) {
      integration.onGameplayStart();
    } else if (guestStarted) {
      integration.onGameplayStop();
    }
  }, [guestStarted, isPaused, isSettingsOpen, isMascotOpen, tutorialIntroModal]);

  // Derived HUD data
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';
  const widgetRelativeBaseColorIndex = autoBaseColorEnabled ? hoverColorIndex : selectedColorIndex;

  // Track previous completion state
  const prevTutorialCompleteRef = useRef<boolean>(tutorialViewModel.isTaskComplete);

  // Reset widget phase when tutorial level changes
  useEffect(() => {
    setTutorialWidgetPhase('pending');
    setTutorialIntroModal(null);
    prevTutorialCompleteRef.current = false;
  }, [tutorialFlowState.currentLevelId]);

  // Close modal and reset when guest logs out
  useEffect(() => {
    if (guestStarted) return;
    setTutorialIntroModal(null);
  }, [guestStarted]);

  // Tutorial handlers
  const handleSelectTutorialLevel = (levelId: string) => {
    if (tutorialViewModel.completedLevelIds.has(levelId)) return;
    tutorialActions.selectLevel(levelId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
  };

  const handleRestartTutorialLevel = (levelId: string) => {
    tutorialActions.restartLevel(levelId);
    dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
  };

  // Set widget to "complete" phase when task is done (do NOT auto-advance)
  useEffect(() => {
    if (!tutorialFlowState.currentLevelId) {
      prevTutorialCompleteRef.current = false;
      return;
    }
    const wasComplete = prevTutorialCompleteRef.current;
    if (!wasComplete && tutorialViewModel.isTaskComplete) {
      playSound('audio/mixkit-small-win-2020.wav');
      setTutorialWidgetPhase('complete');
    }
    prevTutorialCompleteRef.current = tutorialViewModel.isTaskComplete;
  }, [tutorialViewModel.isTaskComplete, tutorialFlowState.currentLevelId, playSound]);

  // Widget click handler — drives the pending → active → complete flow
  const handleWidgetClick = () => {
    if (tutorialWidgetPhase === 'complete' && tutorialFlowState.currentLevelId) {
      // Advance to next level
      playUiClick();
      setTutorialIntroModal(null);
      tutorialActions.completeLevel(tutorialFlowState.currentLevelId);
      return;
    }
    // pending or active: open the task description modal
    const level = tutorialViewModel.level;
    if (!level) return;
    const language = getLanguage();
    setTutorialIntroModal({
      levelId: level.id,
      setupText: getLocalizedText(level.setup, language),
      objectiveText: getLocalizedText(level.objective, language),
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

  const isMobileLayout = true;

  const isHexiLabLocked = tutorialViewModel.isHexiLabLocked;

  useEffect(() => {
    if (!tutorialViewModel.isHexiLabLocked) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: 'world' });
    if (mobileTab === 'hexilab') {
      dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
    }
  }, [tutorialViewModel.isHexiLabLocked, mobileTab, dispatch]);

  // Track focus visits on target cells
  useEffect(() => {
    if (!shouldTrackFocusVisit(tutorialFlowState.currentLevelId, gameState, isMobileLayout, mobileTab)) {
      return;
    }

    const visitedKey = checkFocusTargetVisit(
      tutorialFlowState.currentLevelId!,
      gameState.focus,
      gameState.tutorialProgress?.visitedTargetKeys ?? new Set(),
    );

    if (!visitedKey) return;

    // Play service bell sound on target cell visit
    playSound('audio/mixkit-service-bell-931.wav');
    dispatch({ type: 'MARK_TUTORIAL_TARGET_VISITED', key: visitedKey });
  }, [gameState.focus, gameState.activeField, gameState.tutorialProgress, tutorialFlowState.currentLevelId, isMobileLayout, mobileTab, dispatch, playSound]);

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

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'heximap' && tutorialViewModel.level ? 56 : 8;

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

    if (trackSessionHistory) {
      const newSession = createNewSessionHistoryRecord();
      const history = addSessionToHistory(localStorage, newSession);
      dispatchApp({ type: 'SESSION_STARTED', sessionId: newSession.id, startTick: 0 });
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
    tutorialLevel: tutorialViewModel.level,
    tutorialLevelId: tutorialFlowState.currentLevelId,
    isTutorialTaskComplete: tutorialViewModel.isTaskComplete,
    completedTutorialLevelIds: tutorialViewModel.completedLevelIds,
    sessionHistory,
    trackSessionHistory,
    soundEnabled,
    soundVolume,
    onSelectTutorialLevel: handleSelectTutorialLevel,
    onRestartTutorialLevel: handleRestartTutorialLevel,
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
    showColorWidget,
    onToggleColorWidget: (visible: boolean) => {
      dispatchSettings({ type: 'SET_SHOW_COLOR_WIDGET', visible });
    },
    showTutorialWidget,
    onToggleTutorialWidget: (visible: boolean) => {
      dispatchSettings({ type: 'SET_SHOW_TUTORIAL_WIDGET', visible });
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
    tutorialTargetCells:
      tutorialViewModel.level && (!isMobileLayout || mobileTab === 'heximap')
        ? (tutorialViewModel.level.targetCells ?? [])
        : [],
    visitedTutorialCells: gameState.tutorialProgress?.visitedTargetKeys ?? new Set(),
    hideHotbar: tutorialViewModel.level?.hideHotbar ?? false,
  };

  const settingsProps: React.ComponentProps<typeof Settings> = {
    onClose: () => dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden }),
    onResetSession: () => {
      resetSession();
      dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
      setTutorialFlowState({ currentLevelId: 'tutorial_1_movement' });
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

  const tutorialCompleteTextByLabelKey: Record<string, string> = {
    'tutorial.cellsVisited': t('tutorial.complete.cellsVisited'),
    'tutorial.colorsCollected': t('tutorial.complete.colorsCollected'),
    'tutorial.cellsCleared': t('tutorial.complete.cellsCleared'),
    'tutorial.cellsPlaced': t('tutorial.complete.cellsPlaced'),
  };

  const tutorialWidgetProps = tutorialViewModel.level
    ? {
        phase: tutorialWidgetPhase,
        taskName: getLocalizedText(tutorialViewModel.level.name, getLanguage()),
        progressCurrent: tutorialViewModel.progressCurrent,
        progressTotal: tutorialViewModel.progressTotal,
        progressLabel: t(tutorialViewModel.progressLabelKey),
        completeText:
          tutorialCompleteTextByLabelKey[tutorialViewModel.progressLabelKey] ??
          t('tutorial.widget.done'),
        onWidgetClick: handleWidgetClick,
        containerRef: tutorialWidgetRef,
      }
    : null;

  const visibleTutorialWidgetProps = showTutorialWidget ? tutorialWidgetProps : null;

  const tutorialIntroModalProps: React.ComponentProps<typeof TutorialTaskIntroModal> | null = tutorialIntroModal
    ? {
        setupText: tutorialIntroModal.setupText,
        objectiveText: tutorialIntroModal.objectiveText,
        startLabel: t('tutorial.modal.start'),
        postponeLabel: t('tutorial.modal.postpone'),
        getFlyToRect: () => tutorialWidgetRef.current?.getBoundingClientRect() ?? null,
        onStart: () => {
          setTutorialWidgetPhase('active');
          setTutorialIntroModal(null);
        },
        onPostpone: () => {
          setTutorialIntroModal(null);
        },
      }
    : null;

  const colorPaletteWidgetProps: React.ComponentProps<typeof ColorPaletteWidget> | null = showColorWidget
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
        tutorialWidgetProps={visibleTutorialWidgetProps}
        tutorialIntroModalProps={tutorialIntroModalProps}
        colorPaletteWidgetProps={colorPaletteWidgetProps}
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
