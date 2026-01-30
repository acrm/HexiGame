import React, { useEffect, useRef, useState } from 'react';
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
  hoveredCellActive,
  computeAdjacentSameColorCounts,
  performContextAction,
  startDrag,
  endDrag,
  dragMoveProtagonist,
  equalAxial,
} from '../logic/pureLogic';
import ControlsDesktop from './ControlsInfoDesktop';
import ControlsMobile from './ControlsInfoMobile';
import PaletteCluster from './PaletteCluster';
import GameField from './GameField';
import Hotbar from './Hotbar';
import Settings from './Settings';
import { t } from '../ui/i18n';
import { integration } from '../appLogic/integration';
import { audioManager } from '../audio/audioManager';
import GuestStart from './GuestStart';
import Wiki from './Wiki';
import Mascot from './Mascot';

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(mergedParams, rngRef.current));
  const [fps, setFps] = useState(0);
  const spaceIsDownRef = useRef(false);
  const mouseIsDownRef = useRef(false);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
  const [isInventory, setIsInventory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'world' | 'self' | 'wiki'>('world');
  const [isPaused, setIsPaused] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'desktop' | 'mobile'>(() => {
    const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const touch = typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0;
    return coarse || touch ? 'mobile' : 'desktop';
  });
  const [guestStarted, setGuestStarted] = useState<boolean>(() => {
    return !!localStorage.getItem('hexigame.guest.started');
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMascotOpen, setIsMascotOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('hexigame.sound');
    return saved ? saved === 'true' : true;
  });
  const [showFPS, setShowFPS] = useState(() => {
    const saved = localStorage.getItem('hexigame.showFPS');
    return saved ? saved === 'true' : false;
  });

  // Initialize audio manager with sound settings
  useEffect(() => {
    audioManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Start audio on guest start (user interaction required)
  useEffect(() => {
    if (guestStarted && soundEnabled) {
      audioManager.play();
    }
  }, [guestStarted, soundEnabled]);

  // Detect mode changes based on pointer/orientation/size
  useEffect(() => {
    const detect = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
      const touch = (navigator as any)?.maxTouchPoints > 0;
      const narrow = window.innerWidth <= 900;
      const mobile = coarse || touch || narrow;
      setInteractionMode(mobile ? 'mobile' : 'desktop');
    };
    detect();
    window.addEventListener('resize', detect);
    window.addEventListener('orientationchange', detect as any);
    return () => {
      window.removeEventListener('resize', detect);
      window.removeEventListener('orientationchange', detect as any);
    };
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

  // Pause/resume on tab visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setIsPaused(true);
        integration.onPause();
        audioManager.pause();
      } else {
        setIsPaused(false);
        integration.onResume();
        audioManager.resume();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Signal game ready to SDK (LoadingAPI.ready for Yandex)
  useEffect(() => {
    let mounted = true;
    Promise.resolve(integration.init()).then(() => {
      if (mounted) integration.onGameReady();
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Gameplay lifecycle (start/stop)
  useEffect(() => {
    // Gameplay lifecycle (start when guest starts, stop on unmount)
    if (guestStarted) {
      Promise.resolve(integration.init()).then(() => integration.onGameplayStart());
    }
    return () => integration.onGameplayStop();
  }, [guestStarted]);

  // Keyboard input handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        e.preventDefault();
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

  const adjacentCountByColor = computeAdjacentSameColorCounts(gameState, mergedParams);
  const eatenCounts: Record<string, number> = gameState.paletteCounts || {};

  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth <= 900;

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  // Sync mobile tab selection with active field and inventory flag
  useEffect(() => {
    if (!isMobileLayout) return;
    const nextInventory = mobileTab === 'self';
    setIsInventory(nextInventory);
    setGameState(prev => ({ ...prev, activeField: mobileTab === 'self' ? 'inventory' : 'world' }));
  }, [isMobileLayout, mobileTab]);

  const effectiveIsInventory = isMobileLayout ? mobileTab === 'self' : isInventory;

  return (
    <div className="game-root">
      {!isMobileLayout && (
        <div className="game-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', justifyContent: 'space-between' }}>
            {/* Palette cluster with center showing chance/state */}
            <PaletteCluster
              colorPalette={mergedParams.ColorPalette}
              playerBaseColorIndex={mergedParams.PlayerBaseColorIndex}
              antagonistIndex={antagonistIndex}
              eatenCounts={eatenCounts}
              hoverColorIndex={hoverColorIndex}
              chance={null}
              turtleColorIndex={gameState.turtleColorIndex}
            />
          </div>
          <ControlsDesktop />
        </div>
      )}
      {isMobileLayout && (
        <div className="mobile-tab-bar">
          <div className="mobile-tabs-container">
            <button
              className={`mobile-tab ${mobileTab === 'world' ? 'active' : ''}`}
              onClick={() => setMobileTab('world')}
            >
              {t('tab.world')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'self' ? 'active' : ''}`}
              onClick={() => setMobileTab('self')}
            >
              {t('tab.self')}
            </button>
            <button
              className={`mobile-tab ${mobileTab === 'wiki' ? 'active' : ''}`}
              onClick={() => setMobileTab('wiki')}
            >
              {t('tab.wiki')}
            </button>
          </div>
          {/* Settings gear on right side of tab bar */}
          <button className="settings-button" onClick={() => setIsSettingsOpen(true)} title={t('settings.open')}>
            <i className="fas fa-cog"></i>
          </button>
        </div>
      )}
      <div className="game-main">
        {/* Show Hotbar only in world mode (hide in inventory and wiki) */}
        {!effectiveIsInventory && !(isMobileLayout && mobileTab === 'wiki') && (
          <Hotbar
            slots={gameState.hotbarSlots || []}
            selectedIndex={gameState.selectedHotbarIndex ?? 3}
            colorPalette={mergedParams.ColorPalette}
            onSelect={(idx) => {
              setGameState(prev => ({
                ...prev,
                selectedHotbarIndex: idx,
              }));
            }}
          />
        )}
        <div className="game-field-area">
          {isMobileLayout && mobileTab === 'wiki' ? (
            <Wiki gameState={gameState} params={mergedParams} isMobile={interactionMode === 'mobile'} />
          ) : (
            <GameField
              gameState={gameState}
              params={mergedParams}
              fps={fps}
              setFps={setFps}
              showFPS={showFPS}
              isInventory={effectiveIsInventory}
              onToggleInventory={() => {
                if (isMobileLayout) {
                  setMobileTab(prev => (prev === 'self' ? 'world' : 'self'));
                } else {
                  setIsInventory(v => !v);
                  setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
                }
              }}
              onCapture={() => {
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
            />
          )}
        </div>
        <div className="game-footer-controls" />
      </div>
      {!guestStarted && (
        <GuestStart onStart={() => {
          localStorage.setItem('hexigame.guest.started', '1');
          setGuestStarted(true);
        }} />
      )}
      {isSettingsOpen && (
        <Settings 
          onClose={() => setIsSettingsOpen(false)}
          onResetSession={() => {
            localStorage.removeItem('hexigame.guest.started');
            setGuestStarted(false);
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
            localStorage.setItem('hexigame.sound', String(enabled));
          }}
          showFPS={showFPS}
          onToggleShowFPS={(show) => {
            setShowFPS(show);
            localStorage.setItem('hexigame.showFPS', String(show));
          }}
        />
      )}
      {isMascotOpen && <Mascot onClose={() => setIsMascotOpen(false)} />}
    </div>
  );
};

export default Game;
