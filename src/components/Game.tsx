import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Game.css';
import {
  DefaultParams,
  Params,
  GameState,
  equalAxial,
} from '../logic/pureLogic';
import ControlsDesktop from './ControlsInfoDesktop';
import ControlsMobile from './ControlsInfoMobile';
import PaletteCluster from './PaletteCluster';
import GameField from './GameField';
import Settings from './Settings';
import { t } from '../ui/i18n';
import { integration } from '../appLogic/integration';
import { audioManager } from '../audio/audioManager';
import GuestStart from './GuestStart';
import HexiPedia from './HexiPedia';
import Mascot from './Mascot';
import { ColorScheme } from '../ui/colorScheme';
import TutorialProgressWidget from './TutorialProgressWidget';
import { getTutorialLevel, getNextTutorialLevel } from '../tutorial/tutorialLevels';
import { axialToKey, getHintForMode } from '../tutorial/tutorialState';
import { hoveredCellActive } from '../gameLogic/systems/capture';
import { useGameSession } from '../ui/hooks/useGameSession';
import { useKeyboardInput } from '../ui/hooks/useKeyboardInput';

const SESSION_HISTORY_KEY = 'hexigame.session.history';

type SessionHistoryRecord = {
  id: string;
  startTime: number; // Unix timestamp in ms
  endTime: number; // Unix timestamp in ms
  gameTicks: number;
  gameTime: string; // MM:SS format
};


// Format ticks into MM:SS
function formatGameTime(ticks: number): string {
  const seconds = Math.floor(ticks / 12); // 12 ticks per second
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Create a new session record
function createNewSession(): SessionHistoryRecord {
  const now = Date.now();
  const sessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: sessionId,
    startTime: now,
    endTime: now,
    gameTicks: 0,
    gameTime: '0:00',
  };
}

// Update existing session or create new if not found
function saveSessionHistoryRecord(sessionId: string, ticks: number) {
  try {
    let history: SessionHistoryRecord[] = [];
    const saved = localStorage.getItem(SESSION_HISTORY_KEY);
    if (saved) {
      history = JSON.parse(saved);
    }
    
    const now = Date.now();
    const existingIndex = history.findIndex((r) => r.id === sessionId);
    
    if (existingIndex !== -1) {
      // Update existing record
      history[existingIndex] = {
        ...history[existingIndex],
        endTime: now,
        gameTicks: ticks,
        gameTime: formatGameTime(ticks),
      };
    } else {
      // Create new record (shouldn't happen normally, but for safety)
      const record: SessionHistoryRecord = {
        id: sessionId,
        startTime: now - (ticks * 1000 / 12),
        endTime: now,
        gameTicks: ticks,
        gameTime: formatGameTime(ticks),
      };
      history.unshift(record);
      
      // Keep last 20 sessions
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
    }
    
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save session history:', e);
  }
}

// Add new session to history
function addSessionToHistory(session: SessionHistoryRecord) {
  try {
    let history: SessionHistoryRecord[] = [];
    const saved = localStorage.getItem(SESSION_HISTORY_KEY);
    if (saved) {
      history = JSON.parse(saved);
    }
    
    history.unshift(session);
    
    // Keep last 20 sessions
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to add session to history:', e);
  }
}

function loadSessionHistory(): SessionHistoryRecord[] {
  try {
    const saved = localStorage.getItem(SESSION_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load session history:', e);
    return [];
  }
}

function deleteSessionHistoryRecord(recordId: string) {
  try {
    let history: SessionHistoryRecord[] = [];
    const saved = localStorage.getItem(SESSION_HISTORY_KEY);
    if (saved) {
      history = JSON.parse(saved);
    }
    
    history = history.filter(r => r.id !== recordId);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to delete session history record:', e);
  }
}

function clearSessionHistory() {
  try {
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify([]));
  } catch (e) {
    console.warn('Failed to clear session history:', e);
  }
}

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const [fps, setFps] = useState(0);
  const mouseIsDownRef = useRef(false);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
  const [isInventory, setIsInventory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'heximap' | 'hexilab' | 'hexipedia'>(() => {
    const hasTutorialStarted = localStorage.getItem('hexigame.tutorial.started');
    return hasTutorialStarted ? 'heximap' : 'hexipedia';
  });
  const [isPaused, setIsPaused] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'desktop' | 'mobile'>('mobile');
  const [guestStarted, setGuestStarted] = useState<boolean>(() => {
    return !!localStorage.getItem('hexigame.guest.started');
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMascotOpen, setIsMascotOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('hexigame.soundEnabled');
    if (saved !== null) return saved === 'true';
    const legacy = localStorage.getItem('hexigame.sound');
    return legacy ? legacy === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('hexigame.soundVolume');
    return saved ? parseFloat(saved) : 0.6;
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('hexigame.musicEnabled');
    if (saved !== null) return saved === 'true';
    const legacy = localStorage.getItem('hexigame.sound');
    return legacy ? legacy === 'true' : true;
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('hexigame.musicVolume');
    return saved ? parseFloat(saved) : 0.5;
  });
  const [showFPS, setShowFPS] = useState(() => {
    const saved = localStorage.getItem('hexigame.showFPS');
    return saved ? saved === 'true' : false;
  });
  const [isLeftHanded, setIsLeftHanded] = useState(() => {
    const saved = localStorage.getItem('hexigame.isLeftHanded');
    return saved ? saved === 'true' : false;
  });
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryRecord[]>(() => loadSessionHistory());
  const [lastSessionSaveTick, setLastSessionSaveTick] = useState(0);
  const [trackSessionHistory, setTrackSessionHistory] = useState(() => {
    const saved = localStorage.getItem('hexigame.trackSessionHistory');
    return saved !== null ? saved === 'true' : true; // Default true
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionStartTick, setCurrentSessionStartTick] = useState<number>(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(() => {
    const saved = localStorage.getItem('hexigame.selectedColorIndex');
    return saved ? parseInt(saved, 10) : mergedParams.PlayerBaseColorIndex;
  });
  const [showColorWidget, setShowColorWidget] = useState(() => {
    const saved = localStorage.getItem('hexigame.showColorWidget');
    return saved !== null ? saved === 'true' : true; // Default visible
  });
  const [tutorialLevelId, setTutorialLevelId] = useState<string | null>(() => {
    const hasTutorialStarted = localStorage.getItem('hexigame.tutorial.started');
    return hasTutorialStarted ? null : 'tutorial_1_movement';
  });

  // Game session (state + dispatch via sessionReducer)
  const { gameState, dispatch, resetSession } = useGameSession({
    params,
    seed,
    isPaused,
    guestStarted,
    mobileTab,
  });

  // Keyboard input (desktop mode only)
  const isHexiLabLockedForKeyboard = useMemo(() => {
    return tutorialLevelId ? (getTutorialLevel(tutorialLevelId)?.disableInventory ?? false) : false;
  }, [tutorialLevelId]);

  useKeyboardInput({
    dispatch,
    interactionMode,
    isInventoryLocked: isHexiLabLockedForKeyboard,
    hotbarSize: 6,
  });

  // Initialize audio manager with music settings
  useEffect(() => {
    audioManager.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  // Apply music volume
  useEffect(() => {
    audioManager.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // Apply sound settings
  useEffect(() => {
    audioManager.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    audioManager.setSoundVolume(soundVolume);
  }, [soundVolume]);

  // Start audio on guest start (user interaction required)
  useEffect(() => {
    if (guestStarted && musicEnabled && !document.hidden) {
      audioManager.playMusic();
    }
  }, [guestStarted, musicEnabled]);

  // Retry music resume on first user interaction after page reload
  useEffect(() => {
    if (!guestStarted || !musicEnabled) return;

    const resumeOnInteraction = () => {
      audioManager.playMusic();
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
  }, [guestStarted, musicEnabled]);

  // Force mobile interaction mode (desktop temporarily disabled)
  useEffect(() => {
    setInteractionMode('mobile');
  }, []);

  // Sync tutorial level into gameState when tutorialLevelId changes
  useEffect(() => {
    dispatch({ type: 'SET_TUTORIAL_LEVEL', levelId: tutorialLevelId });
    dispatch({ type: 'SET_TUTORIAL_INTERACTION_MODE', mode: interactionMode });
  }, [tutorialLevelId, interactionMode]);

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setIsPaused(true);
        integration.onGameplayStop();
        audioManager.pause();
      } else {
        setIsPaused(false);
        if (guestStarted && !isSettingsOpen) {
          integration.onGameplayStart();
        }
        if (guestStarted && musicEnabled) {
          audioManager.playMusic().catch(() => console.log('[Audio] Autoplay blocked'));
        }
        audioManager.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [guestStarted, isSettingsOpen]);

  // Pause/resume on settings open/close
  useEffect(() => {
    if (isSettingsOpen) {
      setIsPaused(true);
    } else if (guestStarted && !document.hidden) {
      setIsPaused(false);
    }
  }, [isSettingsOpen, guestStarted]);

  // Save session history every 360 ticks (~30 seconds) if enabled
  useEffect(() => {
    if (!guestStarted || !trackSessionHistory || !currentSessionId) return;
    const ticksSinceLastSave = gameState.tick - lastSessionSaveTick;
    if (ticksSinceLastSave >= 360) {
      saveSessionHistoryRecord(currentSessionId, gameState.tick);
      setLastSessionSaveTick(gameState.tick);
      setSessionHistory(loadSessionHistory());
    }
  }, [gameState.tick, guestStarted, trackSessionHistory, currentSessionId, lastSessionSaveTick]);

  // Save track session history setting
  useEffect(() => {
    try {
      localStorage.setItem('hexigame.trackSessionHistory', String(trackSessionHistory));
    } catch (e) {
      console.warn('Failed to save track session history setting:', e);
    }
  }, [trackSessionHistory]);

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
      audioManager.templateCompleted();
    }
    // Check for error state change
    else if (!prev.hasErrors && curr.hasErrors) {
      audioManager.templateCellWrong();
    }
    // Check for correct cell fill
    else if (prev.filledCells.size < curr.filledCells.size && !curr.hasErrors) {
      audioManager.templateCellCorrect();
    }

    prevTemplateStateRef.current = curr;
  }, [gameState.activeTemplate]);

  // Signal game ready to SDK (LoadingAPI.ready for Yandex) - call as soon as loaded
  useEffect(() => {
    let mounted = true;
    Promise.resolve(integration.init()).then(() => {
      if (mounted) {
        integration.onGameReady();
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Gameplay lifecycle (start/stop based on game state and menu)
  useEffect(() => {
    if (guestStarted && !isPaused && !isSettingsOpen && !isMascotOpen) {
      Promise.resolve(integration.init()).then(() => integration.onGameplayStart());
    } else if (guestStarted) {
      integration.onGameplayStop();
    }
  }, [guestStarted, isPaused, isSettingsOpen, isMascotOpen]);

  // Save selected color index
  useEffect(() => {
    localStorage.setItem('hexigame.selectedColorIndex', String(selectedColorIndex));
  }, [selectedColorIndex]);

  // Save color widget visibility
  useEffect(() => {
    localStorage.setItem('hexigame.showColorWidget', String(showColorWidget));
  }, [showColorWidget]);

  // Derived HUD data
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';

  const tutorialLevel = useMemo(() => {
    return tutorialLevelId ? getTutorialLevel(tutorialLevelId) : null;
  }, [tutorialLevelId]);

  const tutorialTargetKeys = useMemo(() => {
    return tutorialLevel?.targetCells?.map(axialToKey) ?? [];
  }, [tutorialLevel]);

  const visitedTargetCount = useMemo(() => {
    if (!gameState.tutorialProgress) return 0;
    return tutorialTargetKeys.filter(key => gameState.tutorialProgress?.visitedTargetKeys.has(key)).length;
  }, [gameState.tutorialProgress, tutorialTargetKeys]);

  const isTutorialTaskComplete = !!tutorialLevel && !!gameState.tutorialProgress
    ? tutorialLevel.winCondition(gameState, mergedParams, gameState.tutorialProgress)
    : false;
  const completedTutorialLevelIds = gameState.tutorialCompletedLevelIds ?? new Set<string>();
  const prevTutorialCompleteRef = useRef<boolean>(isTutorialTaskComplete);

  const completeTutorialLevel = (completedLevelId: string) => {
    const nextLevel = getNextTutorialLevel(completedLevelId);
    const nextLevelId = nextLevel ? nextLevel.id : null;
    dispatch({ type: 'COMPLETE_TUTORIAL_LEVEL', levelId: completedLevelId, nextLevelId });
    if (nextLevel) {
      setTutorialLevelId(nextLevel.id);
    } else {
      localStorage.setItem('hexigame.tutorial.started', '1');
      setTutorialLevelId(null);
    }
  };

  const handleSelectTutorialLevel = (levelId: string) => {
    if (completedTutorialLevelIds.has(levelId)) return;
    setTutorialLevelId(levelId);
    setMobileTab('hexipedia');
  };

  const handleRestartTutorialLevel = (levelId: string) => {
    dispatch({
      type: 'RESET_STATE',
      newState: {
        ...gameState,
        tutorialCompletedLevelIds: (() => {
          const s = new Set(gameState.tutorialCompletedLevelIds ?? []);
          s.delete(levelId);
          return s;
        })(),
      },
    });
    setTutorialLevelId(levelId);
    setMobileTab('hexipedia');
  };

  useEffect(() => {
    if (!tutorialLevelId) {
      prevTutorialCompleteRef.current = false;
      return;
    }
    const wasComplete = prevTutorialCompleteRef.current;
    if (!wasComplete && isTutorialTaskComplete) {
      audioManager.playSound('audio/mixkit-small-win-2020.wav');
      completeTutorialLevel(tutorialLevelId);
    }
    prevTutorialCompleteRef.current = isTutorialTaskComplete;
  }, [isTutorialTaskComplete, tutorialLevelId]);

  const handleTutorialCompleteClick = () => {
    if (!tutorialLevelId || !tutorialLevel) return;
    if (!isTutorialTaskComplete) return;
    audioManager.playRandomSound();
    completeTutorialLevel(tutorialLevelId);
  };

  const handleViewTutorialTask = () => {
    audioManager.playRandomSound();
    setMobileTab('hexipedia');
  };

  const isMobileLayout = true;

  const isHexiLabLocked = tutorialLevel?.disableInventory ?? false;

  useEffect(() => {
    if (!tutorialLevel?.disableInventory) return;
    setIsInventory(false);
    dispatch({ type: 'SET_ACTIVE_FIELD', field: 'world' });
    if (mobileTab === 'hexilab') {
      setMobileTab('heximap');
    }
  }, [tutorialLevel?.disableInventory, mobileTab]);

  // Track focus visits on target cells
  useEffect(() => {
    if (!tutorialLevelId || !gameState.tutorialProgress) return;
    if (gameState.activeField === 'inventory') return;
    if (isMobileLayout && mobileTab !== 'heximap') return;

    const level = getTutorialLevel(tutorialLevelId);
    if (!level?.targetCells || level.targetCells.length === 0) return;

    const focusKey = axialToKey(gameState.focus);
    
    // Re-compute target keys from the level directly (don't rely on memoized value)
    const targetKeys = level.targetCells.map(axialToKey);
    if (!targetKeys.includes(focusKey)) return;

    if (gameState.tutorialProgress.visitedTargetKeys.has(focusKey)) return;

    // Play service bell sound on target cell visit
    audioManager.playSound('audio/mixkit-service-bell-931.wav');

    dispatch({ type: 'MARK_TUTORIAL_TARGET_VISITED', key: focusKey });
  }, [gameState.focus, gameState.activeField, gameState.tutorialProgress, tutorialLevelId, isMobileLayout, mobileTab]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    const nextInventory = mobileTab === 'hexilab';
    setIsInventory(nextInventory);
    dispatch({ type: 'SET_ACTIVE_FIELD', field: mobileTab === 'hexilab' ? 'inventory' : 'world' });
  }, [isMobileLayout, mobileTab]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'hexilab' : isInventory;

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

  const paletteTopOffset = isMobileLayout && mobileTab === 'heximap' && tutorialLevel ? 56 : 8;
  const currentTutorialHint = tutorialLevel ? getHintForMode(tutorialLevel.hints, interactionMode) : '';

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
              onClick={() => { audioManager.playRandomSound(); setMobileTab('heximap'); }}
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
              onClick={() => { audioManager.playRandomSound(); setMobileTab('hexipedia'); }}
            >
              {t('tab.hexipedia')}
            </button>
          </div>
          {/* Settings gear on right side of tab bar */}
          <button className="settings-button" onClick={() => { audioManager.playRandomSound(); setIsSettingsOpen(true); }} title={t('settings.open')}>
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
              tutorialLevel={tutorialLevel}
              tutorialLevelId={tutorialLevelId}
              isTutorialTaskComplete={isTutorialTaskComplete}
              completedTutorialLevelIds={completedTutorialLevelIds}
              sessionHistory={sessionHistory}
              trackSessionHistory={trackSessionHistory}
              onSelectTutorialLevel={handleSelectTutorialLevel}
              onRestartTutorialLevel={handleRestartTutorialLevel}
              onToggleTrackHistory={(enabled) => setTrackSessionHistory(enabled)}
              onDeleteSessionRecord={(recordId) => {
                deleteSessionHistoryRecord(recordId);
                setSessionHistory(loadSessionHistory());
              }}
              onClearSessionHistory={() => {
                clearSessionHistory();
                setSessionHistory([]);
              }}
              onSwitchTab={(tab) => {
                if (tab === 'heximap') setMobileTab('heximap');
                if (tab === 'colors') setMobileTab('hexipedia'); // Keep in hexipedia but focus on colors
              }}
              onActivateTemplate={(templateId) => {
                if (templateId === '') {
                  dispatch({ type: 'DEACTIVATE_TEMPLATE' });
                } else {
                  dispatch({ type: 'ACTIVATE_TEMPLATE', templateId });
                }
              }}
              selectedColorIndex={selectedColorIndex}
              onColorSelect={(index) => setSelectedColorIndex(index)}
              showColorWidget={showColorWidget}
              onToggleColorWidget={(visible) => setShowColorWidget(visible)}
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
                audioManager.playRandomSound();
                if (isMobileLayout) {
                  setMobileTab('heximap');
                } else {
                  if (isHexiLabLocked) return;
                  setIsInventory(v => !v);
                  dispatch({ type: 'TOGGLE_INVENTORY' });
                }
              }}
              onCapture={() => {
                audioManager.playRandomSound();
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
                audioManager.playRandomSound();
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
                audioManager.playRandomSound();
                dispatch({ type: 'EXCHANGE_HOTBAR_SLOT', slotIndex: slotIdx });
              }}
              isLeftHanded={isLeftHanded}
              paletteTopOffset={paletteTopOffset}
              tutorialTargetCells={
                tutorialLevel && (!isMobileLayout || mobileTab === 'heximap')
                  ? (tutorialLevel.targetCells ?? [])
                  : []
              }
              visitedTutorialCells={gameState.tutorialProgress?.visitedTargetKeys ?? new Set()}
              hideHotbar={tutorialLevel?.hideHotbar ?? false}
              selectedColorIndex={selectedColorIndex}
              onColorSelect={(index) => setSelectedColorIndex(index)}
              onNavigateToPalette={() => {
                if (isMobileLayout) {
                  setMobileTab('hexipedia');
                }
                // TODO: Open HexiPedia and navigate to Colors section
              }}
              showColorWidget={showColorWidget}
            />
          )}
        </div>
        <div className="game-footer-controls" />
      </div>
      {isMobileLayout && mobileTab === 'heximap' && tutorialLevel && (
        <div className="tutorial-widget-overlay">
          <TutorialProgressWidget
            level={tutorialLevel}
            hintText={currentTutorialHint}
            visitedCount={visitedTargetCount}
            totalCount={tutorialTargetKeys.length}
            isComplete={isTutorialTaskComplete}
            onComplete={handleTutorialCompleteClick}
            onViewTask={handleViewTutorialTask}
          />
        </div>
      )}
      {!guestStarted && (
        <GuestStart onStart={() => {
          localStorage.setItem('hexigame.guest.started', '1');
          setGuestStarted(true);
          
          // Create new session
          if (trackSessionHistory) {
            const newSession = createNewSession();
            setCurrentSessionId(newSession.id);
            addSessionToHistory(newSession);
            setSessionHistory(loadSessionHistory());
            setCurrentSessionStartTick(0); // Start tick tracking from 0
          }
          
          audioManager.playRandomSound();
          // Play music immediately on user interaction (required for mobile autoplay policy)
          if (musicEnabled) {
            audioManager.playMusic().catch(() => console.log('[Audio] Autoplay blocked'));
          }
        }} />
      )}
      {isSettingsOpen && (
        <Settings 
          onClose={() => setIsSettingsOpen(false)}
          onResetSession={() => {
            resetSession();
            setGuestStarted(false);
            setCurrentSessionId(null); // End current session
            setCurrentSessionStartTick(0); // Reset session tick tracking
            setTutorialLevelId('tutorial_1_movement');
            setMobileTab('hexipedia');
          }}
          onShowMascot={() => {
            setIsSettingsOpen(false);
            setIsMascotOpen(true);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={(enabled) => {
            setSoundEnabled(enabled);
            localStorage.setItem('hexigame.soundEnabled', String(enabled));
          }}
          soundVolume={soundVolume}
          onSoundVolumeChange={(volume) => {
            setSoundVolume(volume);
            localStorage.setItem('hexigame.soundVolume', String(volume));
          }}
          musicEnabled={musicEnabled}
          onToggleMusic={(enabled) => {
            setMusicEnabled(enabled);
            localStorage.setItem('hexigame.musicEnabled', String(enabled));
          }}
          musicVolume={musicVolume}
          onMusicVolumeChange={(volume) => {
            setMusicVolume(volume);
            localStorage.setItem('hexigame.musicVolume', String(volume));
          }}
          showFPS={showFPS}
          onToggleShowFPS={(show) => {
            setShowFPS(show);
            localStorage.setItem('hexigame.showFPS', String(show));
          }}
          isLeftHanded={isLeftHanded}
          onToggleLeftHanded={(isLeft) => {
            setIsLeftHanded(isLeft);
            localStorage.setItem('hexigame.isLeftHanded', String(isLeft));
          }}
        />
      )}
      {isMascotOpen && <Mascot onClose={() => setIsMascotOpen(false)} />}
    </div>
  );
};

export default Game;
