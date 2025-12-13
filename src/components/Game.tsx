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
} from '../logic/pureLogic';
import ControlsDesktop from './ControlsInfoDesktop';
import ControlsMobile from './ControlsInfoMobile';
import PaletteCluster from './PaletteCluster';
import GameField from './GameField';

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

  // virtual joystick state
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastJoystickMoveTickRef = useRef(0);

  // Convert joystick vector to nearest axial hex direction; null if in dead zone
  function joystickToAxial(vx: number, vy: number): [number, number] | null {
    const len = Math.hypot(vx, vy);
    if (len < 6) return null; // dead zone to avoid jitter
    
    // Screen coordinates: +X right, +Y down
    // atan2(vy, vx): 0° = right, 90° = down, 180° = left, -90° = up
    const angle = Math.atan2(vy, vx);
    const norm = (angle + 2 * Math.PI) % (2 * Math.PI);
    const deg = (norm * 180) / Math.PI;
    
    // Axial directions (pointy-top hex): 0=up, 1=up-right, 2=down-right, 3=down, 4=down-left, 5=up-left
    // Screen angle → axial direction mapping:
    // right (0°) → [1, 0] (down-right in axial)
    // down-right (60°) → [0, 1] (down in axial)
    // down-left (120°) → [-1, 1] (down-left in axial)
    // left (180°) → [-1, 0] (up-left in axial)
    // up-left (240°) → [0, -1] (up in axial)
    // up-right (300°) → [1, -1] (up-right in axial)
    
    let dir: [number, number];
    if (deg >= 330 || deg < 30) {
      dir = [1, 0]; // right → down-right
    } else if (deg >= 30 && deg < 90) {
      dir = [0, 1]; // down-right → down
    } else if (deg >= 90 && deg < 150) {
      dir = [-1, 1]; // down-left → down-left
    } else if (deg >= 150 && deg < 210) {
      dir = [-1, 0]; // left → up-left
    } else if (deg >= 210 && deg < 270) {
      dir = [0, -1]; // up-left → up
    } else {
      dir = [1, -1]; // up-right → up-right
    }
    
    return dir;
  }

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
      <GameField
        gameState={gameState}
        params={mergedParams}
        fps={fps}
        setFps={setFps}
        joystickVector={joystickVectorRef.current}
        joystickToAxial={joystickToAxial}
        joystickTouchIdRef={joystickTouchIdRef}
        joystickCenterRef={joystickCenterRef}
        joystickVectorRef={joystickVectorRef}
        lastJoystickMoveTickRef={lastJoystickMoveTickRef}
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
        onMove={(dq, dr) => {
          setGameState(prev => attemptMoveByDeltaOnActive(prev, mergedParams, dq, dr));
        }}
        onSetCursor={(q, r) => {
          setGameState(prev => attemptMoveTo(prev, mergedParams, { q, r }));
        }}
        onCellClickDown={(q, r) => {
          // Handle LMB click on cell - start action if clicking on cursor cell
          setGameState(prev => {
            if (mouseIsDownRef.current) return prev; // Already down
            mouseIsDownRef.current = true;
            // Teleport cursor immediately to clicked cell
            const withCursor = attemptMoveTo(prev, mergedParams, { q, r });
            return beginAction(withCursor);
          });
        }}
        onCellClickUp={(q, r) => {
          // Handle LMB release on cell
          if (!mouseIsDownRef.current) return;
          mouseIsDownRef.current = false;
          setGameState(prev => handleActionRelease(prev, mergedParams, rngRef.current));
        }}
      />
      <div className="game-footer-controls" />
    </div>
  );
};

export default Game;
