import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Game.css';
import {
  DefaultParams,
  Params,
  GameState,
  RNG,
  mulberry32,
  createInitialState,
  tick as logicTick,
  attemptMoveByDeltaOnActive,
  attemptMoveTo,
  eatToHotbar,
  exchangeWithHotbarSlot,
  hoveredCellActive,
  performContextAction,
  startDrag,
  endDrag,
  dragMoveProtagonist,
  equalAxial,
  activateTemplate,
  deactivateTemplate,
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
import { axialToKey } from '../tutorial/tutorialState';

// Session persistence helpers
const SESSION_STORAGE_KEY = 'hexigame.session.state';
const SESSION_GUEST_START_KEY = 'hexigame.session.guest.start';

function saveSessionState(state: GameState) {
  try {
    const serialized = JSON.stringify({
      tick: state.tick,
      tutorialLevelId: state.tutorialLevelId,
      tutorialProgress: state.tutorialProgress ? {
        visitedTargetKeys: Array.from(state.tutorialProgress.visitedTargetKeys),
        startTick: state.tutorialProgress.startTick,
        completedAtTick: state.tutorialProgress.completedAtTick,
      } : undefined,
    });
    localStorage.setItem(SESSION_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to save session state:', e);
  }
}

function loadSessionState(): { tick: number; tutorialLevelId?: string | null; tutorialProgress?: any } | null {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.warn('Failed to load session state:', e);
    return null;
  }
}

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));
  const [gameState, setGameState] = useState<GameState>(() => {
    const guestStarted = !!localStorage.getItem('hexigame.guest.started');
    const initialState = createInitialState(mergedParams, rngRef.current);
    
    // If guest was already started (user returning after reload), restore session state
    if (guestStarted) {
      const savedState = loadSessionState();
      if (savedState) {
        return {
          ...initialState,
          tick: savedState.tick,
          tutorialLevelId: savedState.tutorialLevelId,
          tutorialProgress: savedState.tutorialProgress ? {
            visitedTargetKeys: new Set(savedState.tutorialProgress.visitedTargetKeys),
            startTick: savedState.tutorialProgress.startTick,
            completedAtTick: savedState.tutorialProgress.completedAtTick,
          } : undefined,
        };
      }
    }
    
    return initialState;
  });
  const [fps, setFps] = useState(0);
  const spaceIsDownRef = useRef(false);
  const mouseIsDownRef = useRef(false);
  const tutorialWinPlayedRef = useRef(false);
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
  const [tutorialLevelId, setTutorialLevelId] = useState<string | null>(() => {
    // Start mandatory tutorial on first session
    const hasTutorialStarted = localStorage.getItem('hexigame.tutorial.started');
    return hasTutorialStarted ? null : 'tutorial_1_movement';
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
    if (guestStarted && musicEnabled) {
      audioManager.playMusic();
    }
  }, [guestStarted, musicEnabled]);

  // Force mobile interaction mode (desktop temporarily disabled)
  useEffect(() => {
    setInteractionMode('mobile');
  }, []);

  // Tick loop (12 ticks/sec) - only runs after guest starts
  useEffect(() => {
    if (!guestStarted) return; // Don't start ticking until guest starts
    const interval = setInterval(() => {
      if (!isPaused) {
        setGameState(prev => logicTick(prev, mergedParams, rngRef.current));
      }
    }, 1000 / mergedParams.GameTickRate);
    return () => clearInterval(interval);
  }, [mergedParams, isPaused, guestStarted]);

  // Initialize tutorial in gameState when tutorial starts
  useEffect(() => {
    if (!tutorialLevelId) {
      setGameState(prev => {
        if (!prev.tutorialLevelId && !prev.tutorialProgress) return prev;
        return {
          ...prev,
          tutorialLevelId: null,
          tutorialProgress: undefined,
          tutorialInteractionMode: interactionMode,
        };
      });
      return;
    }
    setGameState(prev => {
      if (prev.tutorialLevelId === tutorialLevelId) return prev;
      return {
        ...prev,
        tutorialLevelId,
        tutorialProgress: {
          visitedTargetKeys: new Set(),
          startTick: prev.tick,
        },
        tutorialInteractionMode: interactionMode,
      };
    });
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

  // Persist game state changes to localStorage
  useEffect(() => {
    if (guestStarted) {
      saveSessionState(gameState);
    }
  }, [gameState, guestStarted]);

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

  // Keyboard input handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isHexiLabLocked) return;
        setIsInventory(v => !v);
        setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
        return;
      }
      if (e.key >= '1' && e.key <= '7') {
        const idx = Number(e.key) - 1;
        setGameState(prev => ({
          ...prev,
          selectedHotbarIndex: Math.max(0, Math.min(idx, (prev.hotbarSlots?.length ?? 7) - 1)),
        }));
        return;
      }
      if (e.code === 'Space') {
        if (spaceIsDownRef.current) {
          return; // already down
        }
        spaceIsDownRef.current = true;
        setGameState(prev => performContextAction(prev, mergedParams));
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        setGameState(prev => eatToHotbar(prev, mergedParams));
        return;
      }
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0],
      };
      const delta = moves[e.key as keyof typeof moves];
      if (delta) {
        const [dq, dr] = delta;
        setGameState(prev => attemptMoveByDeltaOnActive(prev, mergedParams, dq, dr));
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        if (!spaceIsDownRef.current) {
          return;
        }
        spaceIsDownRef.current = false;
        // Action already performed on keydown, just reset the flag
      }
    }
    if (interactionMode === 'desktop') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mergedParams, interactionMode]);

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

  const isTutorialTaskComplete = tutorialTargetKeys.length > 0 && visitedTargetCount === tutorialTargetKeys.length;

  useEffect(() => {
    if (!tutorialLevelId) {
      tutorialWinPlayedRef.current = false;
      return;
    }
    if (isTutorialTaskComplete && !tutorialWinPlayedRef.current) {
      audioManager.playSound('audio/mixkit-small-win-2020.wav');
      tutorialWinPlayedRef.current = true;
    }
    if (!isTutorialTaskComplete) {
      tutorialWinPlayedRef.current = false;
    }
  }, [gameState.tick, isTutorialTaskComplete, tutorialLevelId]);

  const handleTutorialCompleteClick = () => {
    if (!tutorialLevelId || !tutorialLevel) return;
    if (!isTutorialTaskComplete) return;
    audioManager.playRandomSound();
    const nextLevel = getNextTutorialLevel(tutorialLevelId);
    if (nextLevel) {
      setTutorialLevelId(nextLevel.id);
      setMobileTab('hexipedia');
    } else {
      localStorage.setItem('hexigame.tutorial.started', '1');
      setTutorialLevelId(null);
      setMobileTab('hexipedia');
    }
  };

  const handleViewTutorialTask = () => {
    audioManager.playRandomSound();
    setMobileTab('hexipedia');
  };

  const isMobileLayout = true;

  const isHexiLabLocked = tutorialLevel?.disableInventory ?? false;

  // Track focus visits on target cells
  useEffect(() => {
    if (!tutorialLevelId || !gameState.tutorialProgress) return;
    if (gameState.activeField === 'inventory') return;
    if (isMobileLayout && mobileTab !== 'heximap') return;

    const level = getTutorialLevel(tutorialLevelId);
    if (!level?.targetCells || level.targetCells.length === 0) return;

    const focusKey = axialToKey(gameState.focus);
    if (!tutorialTargetKeys.includes(focusKey)) return;

    if (gameState.tutorialProgress.visitedTargetKeys.has(focusKey)) return;

    // Play service bell sound on target cell visit
    audioManager.playSound('audio/mixkit-service-bell-931.wav');

    setGameState(prev => {
      if (!prev.tutorialProgress) return prev;
      if (prev.tutorialProgress.visitedTargetKeys.has(focusKey)) return prev;
      const nextVisited = new Set(prev.tutorialProgress.visitedTargetKeys);
      nextVisited.add(focusKey);
      return {
        ...prev,
        tutorialProgress: {
          ...prev.tutorialProgress,
          visitedTargetKeys: nextVisited,
        },
      };
    });
  }, [gameState.focus, gameState.activeField, gameState.tutorialProgress, tutorialLevelId, tutorialTargetKeys, isMobileLayout, mobileTab]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    const nextInventory = mobileTab === 'hexilab';
    setIsInventory(nextInventory);
    setGameState(prev => ({ ...prev, activeField: mobileTab === 'hexilab' ? 'inventory' : 'world' }));
  }, [isMobileLayout, mobileTab]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'hexilab' : isInventory;

  // Determine background color based on active tab
  const backgroundColor = isMobileLayout 
    ? (mobileTab === 'heximap' ? ColorScheme.outside.background : mobileTab === 'hexilab' ? ColorScheme.inside.background : '#2f2f2f')
    : '#370152ff';

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
              interactionMode={interactionMode}
              tutorialLevel={tutorialLevel}
              onSwitchTab={(tab) => {
                if (tab === 'heximap') setMobileTab('heximap');
              }}
              onActivateTemplate={(templateId) => {
                if (templateId === '') {
                  setGameState(prev => deactivateTemplate(prev));
                } else {
                  setGameState(prev => activateTemplate(prev, templateId));
                }
              }}
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
                  setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
                }
              }}
              onCapture={() => {
                audioManager.playRandomSound();
                // Mobile press ACT -> perform instant context action
                setGameState(prev => performContextAction(prev, mergedParams));
              }}
              onRelease={() => {
                // Mobile release ACT -> action already performed on press
              }}
              onEat={() => {
                setGameState(prev => eatToHotbar(prev, mergedParams));
              }}
              onSetCursor={(q, r) => {
                audioManager.playRandomSound();
                // Check if clicking on focus or protagonist - start drag
                // Otherwise - start auto-move to target
                setGameState(prev => {
                  const clickedPos = { q, r };
                  const isFocus = equalAxial(clickedPos, prev.focus);
                  const isProtagonist = equalAxial(clickedPos, prev.protagonist);
                  
                  if (isFocus || isProtagonist) {
                    // Start drag mode
                    return startDrag(prev);
                  } else {
                    // Start auto-move to clicked cell
                    return attemptMoveTo(prev, mergedParams, clickedPos);
                  }
                });
              }}
              onCellClickDown={(q, r) => {
                // Handle LMB click on cell
                setGameState(prev => {
                  if (mouseIsDownRef.current) return prev; // Already down
                  mouseIsDownRef.current = true;
                  
                  const clickedPos = { q, r };
                  const isFocus = equalAxial(clickedPos, prev.focus);
                  
                  // If clicking on focus cell and not moving: perform context action
                  if (isFocus && !prev.isDragging && !prev.autoMoveTarget) {
                    return performContextAction(prev, mergedParams);
                  }
                  
                  const isProtagonist = equalAxial(clickedPos, prev.protagonist);
                  
                  if (isFocus || isProtagonist) {
                    // Start drag mode
                    return startDrag(prev);
                  } else {
                    // Start auto-move to clicked cell
                    return attemptMoveTo(prev, mergedParams, clickedPos);
                  }
                });
              }}
              onCellClickUp={(q, r) => {
                // Handle LMB release on cell - end drag if was dragging
                if (!mouseIsDownRef.current) return;
                mouseIsDownRef.current = false;
                setGameState(prev => {
                  if (prev.isDragging) {
                    return endDrag(prev);
                  }
                  return prev;
                });
              }}
              onCellDrag={(q, r) => {
                // Handle drag - move protagonist if in drag mode
                setGameState(prev => {
                  if (!prev.isDragging) return prev;
                  // Calculate delta from current position
                  const dq = q - prev.protagonist.q;
                  const dr = r - prev.protagonist.r;
                  return dragMoveProtagonist(prev, mergedParams, dq, dr);
                });
              }}
              onHotbarSlotClick={(slotIdx) => {
                audioManager.playRandomSound();
                // Handle hotbar slot click - exchange with slot
                setGameState(prev => exchangeWithHotbarSlot(prev, mergedParams, slotIdx));
              }}
              isLeftHanded={isLeftHanded}
              tutorialTargetCells={
                tutorialLevel && (!isMobileLayout || mobileTab === 'heximap')
                  ? (tutorialLevel.targetCells ?? [])
                  : []
              }
              visitedTutorialCells={gameState.tutorialProgress?.visitedTargetKeys ?? new Set()}
              hideHotbar={tutorialLevel?.hideHotbar ?? false}
            />
          )}
        </div>
        <div className="game-footer-controls" />
      </div>
      {isMobileLayout && mobileTab === 'heximap' && tutorialLevel && (
        <div className="tutorial-widget-overlay">
          <TutorialProgressWidget
            level={tutorialLevel}
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
            localStorage.removeItem('hexigame.guest.started');
            localStorage.removeItem('hexigame.tutorial.started');
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setGuestStarted(false);
            setTutorialLevelId('tutorial_1_movement');
            setMobileTab('hexipedia');
            // Reset game state to initial
            setGameState(createInitialState(mergedParams, rngRef.current));
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
