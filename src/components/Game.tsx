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
  eatCapturedToInventory,
  previewCaptureChanceAtCursor,
  hoveredCellActive,
  computeAdjacentSameColorCounts,
  handleActionRelease,
  beginAction,
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

  // Tick loop (12 ticks/sec)
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => logicTick(prev, mergedParams, rngRef.current));
    }, 1000 / mergedParams.GameTickRate);
    return () => clearInterval(interval);
  }, [mergedParams]);

  // Keyboard input handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsInventory(v => !v);
        setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
        return;
      }
      if (e.code === 'Space') {
        if (spaceIsDownRef.current) {
          return; // already down
        }
        // Gate action mode by cooldown
        setGameState(prev => {
          spaceIsDownRef.current = true;
          return beginAction(prev);
        });
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        setGameState(prev => eatCapturedToInventory(prev, mergedParams, rngRef.current));
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
        setGameState(prev => handleActionRelease(prev, mergedParams, rngRef.current));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mergedParams]);

  // Derived HUD data
  const chance = previewCaptureChanceAtCursor(gameState, mergedParams);
  const hoverColorIndex = hoveredCellActive(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';

  const adjacentCountByColor = computeAdjacentSameColorCounts(gameState, mergedParams);
  const eatenCounts: Record<string, number> = gameState.paletteCounts || {};

  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth <= 900;

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;

  return (
    <div className="game-root">
      <div className="game-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', justifyContent: 'space-between' }}>
          {/* Palette cluster with center showing chance/state */}
          <PaletteCluster
            colorPalette={mergedParams.ColorPalette}
            playerBaseColorIndex={mergedParams.PlayerBaseColorIndex}
            antagonistIndex={antagonistIndex}
            eatenCounts={eatenCounts}
            hoverColorIndex={hoverColorIndex}
            capturedCell={!!gameState.capturedCell}
            chance={chance}
            turtleColorIndex={gameState.turtleColorIndex}
          />
          {/* Info button (mobile only) */}
          {isMobileLayout && (
            <button
              type="button"
              onClick={() => setIsMobileInfoOpen(v => !v)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid #ffffff88',
                background: isMobileInfoOpen ? '#ffffff22' : 'transparent',
                color: '#fff',
                fontSize: 13,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              i
            </button>
          )}
        </div>
        {!isMobileLayout && <ControlsDesktop />}
      </div>
      {/* Controls blocks inserted separately for desktop and mobile */}

      {isMobileLayout && isMobileInfoOpen && (
        <ControlsMobile onClose={() => setIsMobileInfoOpen(false)} topOffset={96} />
      )}
      <div className="game-main">
        <Hotbar />
        <div className="game-field-area">
          <GameField
            gameState={gameState}
            params={mergedParams}
            fps={fps}
            setFps={setFps}
            isInventory={isInventory}
            onToggleInventory={() => {
              setIsInventory(v => !v);
              setGameState(prev => ({ ...prev, activeField: !isInventory ? 'inventory' : 'world' }));
            }}
            onCapture={() => {
              // Mobile press -> enter action mode (respect cooldown)
              setGameState(prev => beginAction(prev));
            }}
            onRelease={() => {
              // Mobile release -> perform action release logic
              setGameState(prev => handleActionRelease(prev, mergedParams, rngRef.current));
            }}
            onEat={() => {
              setGameState(prev => eatCapturedToInventory(prev, mergedParams, rngRef.current));
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
              // Handle LMB click on cell - check if on focus/protagonist for drag
              setGameState(prev => {
                if (mouseIsDownRef.current) return prev; // Already down
                mouseIsDownRef.current = true;
                
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
        </div>
        <div className="game-footer-controls" />
      </div>
    </div>
  );
};

export default Game;
