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
import { t } from '../i18n';
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
import { audioController } from '../../appLogic/audioController';
import GuestStart from './GuestStart';
import HexiPedia from './HexiPedia';
import Mascot from './Mascot';
import { ColorScheme } from '../colorScheme';
import TutorialProgressWidget from './TutorialProgressWidget';
import { getHintForMode } from '../../tutorial/tutorialState';
import { hoveredCellActive } from '../../gameLogic/systems/capture';
import {
  createInitialTutorialFlowState,
  computeTutorialViewModel,
  createTutorialFlowActions,
  shouldTrackFocusVisit,
  checkFocusTargetVisit,
  type TutorialFlowState,
} from '../../appLogic/tutorialFlow';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import {
  createSessionController,
  initializeGameState,
  type SessionController,
} from '../../appLogic/sessionController';
import { mulberry32 } from '../../gameLogic/core/params';
import { clearSession } from '../../appLogic/sessionRepository';

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
  } = settingsState;
  // Tutorial flow state
  const [tutorialFlowState, setTutorialFlowState] = useState<TutorialFlowState>(() =>
    createInitialTutorialFlowState(),
  );

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
    controllerRef.current?.setPaused(isPaused);
  }, [isPaused]);

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
    isInventoryLocked: isHexiLabLockedForKeyboard,
    hotbarSize: 6,
  });

  // Initialize audio controller on mount
  useEffect(() => {
    audioController.init();
  }, []);

  // Update music volume when settings change
  useEffect(() => {
    audioController.updateMusicVolume(musicVolume);
  }, [musicVolume]);

  // Start audio on guest start (user interaction required)
  useEffect(() => {
    if (guestStarted && musicEnabled && !document.hidden) {
      audioController.playMusic(musicEnabled, musicVolume);
    }
  }, [guestStarted, musicEnabled, musicVolume]);

  // Retry music resume on first user interaction after page reload
  useEffect(() => {
    if (!guestStarted || !musicEnabled) return;

    const resumeOnInteraction = () => {
      audioController.playMusic(musicEnabled, musicVolume);
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
      window.removeEventListener('touchstart', resumeOnInteraction);
    };

    window.addEventListener('pointerdown', resumeOnInteraction, { passive: true, once: true });
    window.addEventListener('keydown', resumeOnInteraction, { once: true });
    window.addEventListener('touchstart', resumeOnInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
      window.removeEventListener('touchstart', resumeOnInteraction);
    };
  }, [guestStarted, musicEnabled, musicVolume]);

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
        audioController.pauseMusic();
      } else {
        dispatchApp({ type: 'VISIBILITY_CHANGED', hidden: false });
        if (guestStarted && !isSettingsOpen) {
          integration.onGameplayStart();
        }
        audioController.resumeMusic(musicEnabled, musicVolume);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [guestStarted, isSettingsOpen, musicEnabled, musicVolume]);

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

  // Handle template audio feedback
  const prevTemplateStateRef = useRef<GameState['activeTemplate']>(null);
  useEffect(() => {
    if (!gameState.activeTemplate || !prevTemplateStateRef.current) {
      prevTemplateStateRef.current = gameState.activeTemplate;
      return;
    }

    const prev = prevTemplateStateRef.current;
    const curr = gameState.activeTemplate;

    // Check for completion
    if (!prev.completedAtTick && curr.completedAtTick) {
      audioController.templateCompleted(soundEnabled, soundVolume);
    }
    // Check for error state change
    else if (!prev.hasErrors && curr.hasErrors) {
      audioController.templateCellWrong(soundEnabled, soundVolume);
    }
    // Check for correct cell fill
    else if (prev.filledCells.size < curr.filledCells.size && !curr.hasErrors) {
      audioController.templateCellCorrect(soundEnabled, soundVolume);
    }

    prevTemplateStateRef.current = curr;
  }, [gameState.activeTemplate, soundEnabled, soundVolume]);

  // Gameplay lifecycle (start/stop based on game state and menu)
  // Note: integration.init() and onGameReady() are called once in index.tsx
  useEffect(() => {
    if (guestStarted && !isPaused && !isSettingsOpen && !isMascotOpen) {
      integration.onGameplayStart();
    } else if (guestStarted) {
      integration.onGameplayStop();
    }
  }, [guestStarted, isPaused, isSettingsOpen, isMascotOpen]);

  // Derived HUD data
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';
  const widgetRelativeBaseColorIndex = autoBaseColorEnabled ? hoverColorIndex : selectedColorIndex;

  // Track previous completion state for auto-advance
  const prevTutorialCompleteRef = useRef<boolean>(tutorialViewModel.isTaskComplete);

  // Tutorial handlers
  const handleSelectTutorialLevel = (levelId: string) => {
    if (tutorialViewModel.completedLevelIds.has(levelId)) return;
    tutorialActions.selectLevel(levelId);
  };

  const handleRestartTutorialLevel = (levelId: string) => {
    const newState = tutorialActions.restartLevel(levelId, gameState);
    dispatch({ type: 'RESET_STATE', newState });
  };

  // Auto-complete tutorial level when task is done
  useEffect(() => {
    if (!tutorialFlowState.currentLevelId) {
      prevTutorialCompleteRef.current = false;
      return;
    }
    const wasComplete = prevTutorialCompleteRef.current;
    if (!wasComplete && tutorialViewModel.isTaskComplete) {
      audioController.playSound('audio/mixkit-small-win-2020.wav', soundEnabled, soundVolume);
      tutorialActions.completeLevel(tutorialFlowState.currentLevelId);
    }
    prevTutorialCompleteRef.current = tutorialViewModel.isTaskComplete;
  }, [tutorialViewModel.isTaskComplete, tutorialFlowState.currentLevelId, tutorialActions, soundEnabled, soundVolume]);

  const handleTutorialCompleteClick = () => {
    if (!tutorialFlowState.currentLevelId || !tutorialViewModel.level) return;
    if (!tutorialViewModel.isTaskComplete) return;
    audioController.playRandomSound(soundEnabled, soundVolume);
    tutorialActions.completeLevel(tutorialFlowState.currentLevelId);
  };

  const handleViewTutorialTask = () => {
    audioController.playRandomSound(soundEnabled, soundVolume);
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
    audioController.playSound('audio/mixkit-service-bell-931.wav', soundEnabled, soundVolume);
    dispatch({ type: 'MARK_TUTORIAL_TARGET_VISITED', key: visitedKey });
  }, [gameState.focus, gameState.activeField, gameState.tutorialProgress, tutorialFlowState.currentLevelId, isMobileLayout, mobileTab, dispatch, soundEnabled, soundVolume]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    dispatch({ type: 'SET_ACTIVE_FIELD', field: mobileTab === 'hexilab' ? 'inventory' : 'world' });
  }, [isMobileLayout, mobileTab, dispatch]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'hexilab' : isInventory;

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'heximap' && tutorialViewModel.level ? 56 : 8;
  const currentTutorialHint = tutorialViewModel.level ? getHintForMode(tutorialViewModel.level.hints, interactionMode) : '';

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
        <div className="mobile-tab-bar">
          <div className="mobile-tabs-container">
            <button
              className={`mobile-tab ${mobileTab === 'heximap' ? 'active' : ''}`}
              onClick={() => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
              }}
            >
              {t('tab.heximap')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'hexilab' ? 'active' : ''} disabled`}
              onClick={() => {}}
              disabled
            >
              {t('tab.hexilab')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'hexipedia' ? 'active' : ''}`}
              onClick={() => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
              }}
            >
              {t('tab.hexipedia')}
            </button>
          </div>
          {/* Settings gear on right side of tab bar */}
          <button
            className="settings-button"
            onClick={() => {
              audioController.playRandomSound(soundEnabled, soundVolume);
              dispatchApp({ type: 'OPEN_SETTINGS' });
            }}
            title={t('settings.open')}
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      )}
      <div className="game-main">
        <div className="game-field-area">
          {isMobileLayout && mobileTab === 'hexipedia' ? (
            <HexiPedia
              gameState={gameState}
              params={mergedParams}
              interactionMode={interactionMode}
              tutorialLevel={tutorialViewModel.level}
              tutorialLevelId={tutorialFlowState.currentLevelId}
              isTutorialTaskComplete={tutorialViewModel.isTaskComplete}
              completedTutorialLevelIds={tutorialViewModel.completedLevelIds}
              sessionHistory={sessionHistory}
              trackSessionHistory={trackSessionHistory}
              soundEnabled={soundEnabled}
              soundVolume={soundVolume}
              onSelectTutorialLevel={handleSelectTutorialLevel}
              onRestartTutorialLevel={handleRestartTutorialLevel}
              onToggleTrackHistory={(enabled: boolean) => {
                dispatchApp({ type: 'SET_TRACK_SESSION_HISTORY', enabled });
              }}
              onDeleteSessionRecord={(recordId: string) => {
                const history = deleteSessionHistoryRecord(localStorage, recordId);
                dispatchApp({ type: 'SET_SESSION_HISTORY', history });
              }}
              onClearSessionHistory={() => {
                const history = clearSessionHistory(localStorage);
                dispatchApp({ type: 'SET_SESSION_HISTORY', history });
              }}
              onSwitchTab={(tab: string) => {
                if (tab === 'heximap') {
                  dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
                }
                if (tab === 'colors') {
                  dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
                }
              }}
              onActivateTemplate={(templateId: string) => {
                if (templateId === '') {
                  dispatch({ type: 'DEACTIVATE_TEMPLATE' });
                } else {
                  dispatch({ type: 'ACTIVATE_TEMPLATE', templateId });
                }
              }}
              selectedColorIndex={selectedColorIndex}
              onColorSelect={(index: number) => {
                dispatchSettings({ type: 'SET_SELECTED_COLOR_INDEX', index });
              }}
              showColorWidget={showColorWidget}
              onToggleColorWidget={(visible: boolean) => {
                dispatchSettings({ type: 'SET_SHOW_COLOR_WIDGET', visible });
              }}
              currentSessionStartTick={currentSessionStartTick}
            />
          ) : (
            <GameField
              gameState={gameState}
              params={mergedParams}
              fps={fps}
              setFps={setFps}
              showFPS={showFPS}
              isInventory={effectiveIsInventory}
              onToggleInventory={() => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                if (isMobileLayout) {
                  dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'heximap' });
                } else {
                  if (isHexiLabLocked) return;
                  dispatch({ type: 'TOGGLE_INVENTORY' });
                }
              }}
              onCapture={() => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                // Mobile press ACT -> perform instant context action
                dispatch({ type: 'ACTION_PRESSED' });
              }}
              onRelease={() => {
                // Mobile release ACT -> action already performed on press
              }}
              onEat={() => {
                dispatch({ type: 'EAT_REQUESTED' });
              }}
              onSetCursor={(q, r) => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                // Check if clicking on focus or protagonist - start drag
                // Otherwise - start auto-move to target
                const clickedPos = { q, r };
                const isFocusCell = equalAxial(clickedPos, gameState.focus);
                const isProtagonistCell = equalAxial(clickedPos, gameState.protagonist);
                if (isFocusCell || isProtagonistCell) {
                  dispatch({ type: 'START_DRAG' });
                } else {
                  dispatch({ type: 'MOVE_CURSOR_TO', target: clickedPos });
                }
              }}
              onCellClickDown={(q, r) => {
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
              }}
              onCellClickUp={(_q, _r) => {
                if (!mouseIsDownRef.current) return;
                mouseIsDownRef.current = false;
                if (gameState.isDragging) {
                  dispatch({ type: 'END_DRAG' });
                }
              }}
              onCellDrag={(q, r) => {
                if (!gameState.isDragging) return;
                const dq = q - gameState.protagonist.q;
                const dr = r - gameState.protagonist.r;
                dispatch({ type: 'DRAG_MOVE', dq, dr });
              }}
              onHotbarSlotClick={(slotIdx) => {
                audioController.playRandomSound(soundEnabled, soundVolume);
                dispatch({ type: 'EXCHANGE_HOTBAR_SLOT', slotIndex: slotIdx });
              }}
              isLeftHanded={isLeftHanded}
              paletteTopOffset={paletteTopOffset}
              tutorialTargetCells={
                tutorialViewModel.level && (!isMobileLayout || mobileTab === 'heximap')
                  ? (tutorialViewModel.level.targetCells ?? [])
                  : []
              }
              visitedTutorialCells={gameState.tutorialProgress?.visitedTargetKeys ?? new Set()}
              hideHotbar={tutorialViewModel.level?.hideHotbar ?? false}
              selectedColorIndex={selectedColorIndex}
              relativeBaseColorIndex={widgetRelativeBaseColorIndex}
              isAutoBaseColorEnabled={autoBaseColorEnabled}
              onColorSelect={(index) => {
                dispatchSettings({ type: 'SET_SELECTED_COLOR_INDEX', index });
              }}
              onToggleAutoBaseColor={() => {
                dispatchSettings({ type: 'TOGGLE_AUTO_BASE_COLOR_ENABLED' });
              }}
              onNavigateToPalette={() => {
                if (isMobileLayout) {
                  dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
                }
                // TODO: Open HexiPedia and navigate to Colors section
              }}
              showColorWidget={showColorWidget}
            />
          )}
        </div>
        <div className="game-footer-controls" />
      </div>
      {isMobileLayout && mobileTab === 'heximap' && tutorialViewModel.level && (
        <div className="tutorial-widget-overlay">
          <TutorialProgressWidget
            level={tutorialViewModel.level}
            hintText={currentTutorialHint}
            visitedCount={tutorialViewModel.visitedTargetCount}
            totalCount={tutorialViewModel.targetKeys.length}
            isComplete={tutorialViewModel.isTaskComplete}
            onComplete={handleTutorialCompleteClick}
            onViewTask={handleViewTutorialTask}
          />
        </div>
      )}
      {!guestStarted && (
        <GuestStart onStart={() => {
          localStorage.setItem('hexigame.guest.started', '1');
          dispatchApp({ type: 'GUEST_STARTED' });
          
          // Create new session
          if (trackSessionHistory) {
            const newSession = createNewSessionHistoryRecord();
            const history = addSessionToHistory(localStorage, newSession);
            dispatchApp({ type: 'SESSION_STARTED', sessionId: newSession.id, startTick: 0 });
            dispatchApp({ type: 'SET_SESSION_HISTORY', history });
          }
          
          audioController.playRandomSound(soundEnabled, soundVolume);
          // Play music immediately on user interaction (required for mobile autoplay policy)
          audioController.playMusic(musicEnabled, musicVolume).catch(() => console.log('[Audio] Autoplay blocked'));
        }} />
      )}
      {isSettingsOpen && (
        <Settings 
          onClose={() => dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden })}
          onResetSession={() => {
            resetSession();
            dispatchApp({ type: 'RESET_AFTER_SESSION_RESET' });
            setTutorialFlowState({ currentLevelId: 'tutorial_1_movement' });
            dispatchApp({ type: 'SET_MOBILE_TAB', tab: 'hexipedia' });
          }}
          onShowMascot={() => {
            dispatchApp({ type: 'CLOSE_SETTINGS', documentHidden: document.hidden });
            dispatchApp({ type: 'OPEN_MASCOT' });
          }}
          soundEnabled={soundEnabled}
          onToggleSound={(enabled) => {
            dispatchSettings({ type: 'SET_SOUND_ENABLED', enabled });
          }}
          soundVolume={soundVolume}
          onSoundVolumeChange={(volume) => {
            dispatchSettings({ type: 'SET_SOUND_VOLUME', volume });
          }}
          musicEnabled={musicEnabled}
          onToggleMusic={(enabled) => {
            dispatchSettings({ type: 'SET_MUSIC_ENABLED', enabled });
          }}
          musicVolume={musicVolume}
          onMusicVolumeChange={(volume) => {
            dispatchSettings({ type: 'SET_MUSIC_VOLUME', volume });
          }}
          showFPS={showFPS}
          onToggleShowFPS={(show) => {
            dispatchSettings({ type: 'SET_SHOW_FPS', show });
          }}
          isLeftHanded={isLeftHanded}
          onToggleLeftHanded={(isLeft) => {
            dispatchSettings({ type: 'SET_LEFT_HANDED', isLeft });
          }}
        />
      )}
      {isMascotOpen && <Mascot onClose={() => dispatchApp({ type: 'CLOSE_MASCOT' })} />}
    </div>
  );
};

export default Game;
