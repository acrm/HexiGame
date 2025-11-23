import React, { useEffect, useRef, useState } from 'react';
import {
  DefaultParams,
  Params,
  GameState,
  RNG,
  mulberry32,
  createInitialState,
  tick as logicTick,
  attemptMoveByDelta,
  beginCaptureCharge,
  endCaptureCharge,
  dropCarried,
  previewCaptureChanceAtCursor,
  hoveredCell,
  isCarryFlickerOn,
} from '../logic/pureLogic';

// --- Rendering-only constants (not part of pure logic) ---
const HEX_SIZE = 10; // pixels
const FLASH_SUCCESS_COLOR = '#00BFFF';
const FLASH_FAILURE_COLOR = '#FF4444';
const GRID_STROKE_COLOR = '#444';
const GRID_STROKE_WIDTH = 1; // minimal visible outline

// Helper: axial -> pixel (pointy-top)
function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

// Draw single hex
function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string, lineWidth = 2) {
  const angleDeg = 60;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (angleDeg * i);
    pts.push([x + size * Math.cos(angle), y + size * Math.sin(angle)]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// Visual rotating edge highlight index (0..5)
function computeEdgeIndex(timeMs: number, rotationPeriodMs = 1000) {
  const phase = (timeMs % rotationPeriodMs) / rotationPeriodMs; // 0..1
  return Math.floor(phase * 6) % 6;
}

function drawEdgeHighlight(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, edge: number, size: number, color: string) {
  const angleDeg = 60;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (angleDeg * i);
    pts.push([centerX + size * Math.cos(angle), centerY + size * Math.sin(angle)]);
  }
  const p1 = pts[edge];
  const p2 = pts[(edge + 1) % 6];
  if (!p1 || !p2) return;
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Game modes text (derived)
function deriveMode(state: GameState): string {
  if (state.capturedCell) return 'Carrying';
  if (state.captureChargeStartTick !== null) return 'Charging';
  if (state.captureCooldownTicksRemaining > 0) return 'Cooldown';
  return 'Free';
}

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(mergedParams, rngRef.current));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fps, setFps] = useState(0);
  const frameCounterRef = useRef({ last: performance.now(), frames: 0 });

  // Tick loop (12 ticks/sec)
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => logicTick(prev, mergedParams));
    }, 1000 / mergedParams.GameTickRate);
    return () => clearInterval(interval);
  }, [mergedParams]);

  // Keyboard input handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        // Either begin charge or drop if carrying
        setGameState(prev => prev.capturedCell ? dropCarried(prev) : beginCaptureCharge(prev));
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
        setGameState(prev => attemptMoveByDelta(prev, mergedParams, delta[0], delta[1]));
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        setGameState(prev => endCaptureCharge(prev, mergedParams, rngRef.current));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mergedParams]);

  // Render loop
  useEffect(() => {
    let mounted = true;
    function render() {
      if (!mounted) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestAnimationFrame(render);
        return;
      }
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw grid
      for (const cell of gameState.grid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        let fill = cell.colorIndex !== null ? mergedParams.ColorPalette[cell.colorIndex] : '#000000';
        // Flicker for carried cell anchor
        if (gameState.capturedCell && cell.q === gameState.capturedCell.q && cell.r === gameState.capturedCell.r) {
          if (isCarryFlickerOn(gameState, mergedParams)) {
            fill = mergedParams.ColorPalette[cell.colorIndex ?? mergedParams.PlayerBaseColorIndex];
          }
        }
        drawHex(ctx, centerX + pos.x, centerY + pos.y, HEX_SIZE, fill, GRID_STROKE_COLOR, GRID_STROKE_WIDTH);
      }

      // Flash overlay border
      if (gameState.flash) {
        const hover = hoveredCell(gameState);
        if (hover) {
          const pos = hexToPixel(hover.q, hover.r);
          const flashColor = gameState.flash.type === 'success' ? FLASH_SUCCESS_COLOR : FLASH_FAILURE_COLOR;
          drawHex(ctx, centerX + pos.x, centerY + pos.y, HEX_SIZE, hover.colorIndex !== null ? mergedParams.ColorPalette[hover.colorIndex] : '#000', flashColor, 3);
        }
      }

      // Cursor edge highlight (charging shows multiple)
      const hover = hoveredCell(gameState);
      if (hover) {
        const now = performance.now();
        const baseEdge = computeEdgeIndex(now);
        const pos = hexToPixel(hover.q, hover.r);
        const edges: number[] = [];
        if (gameState.captureChargeStartTick !== null && gameState.flash == null) {
          // Expand edges count proportional to charge progress
          const heldTicks = gameState.tick - gameState.captureChargeStartTick;
          const fraction = Math.min(1, heldTicks / mergedParams.CaptureHoldDurationTicks);
          const edgeCount = Math.max(1, Math.ceil(fraction * 6));
          for (let i = 0; i < edgeCount; i++) edges.push((baseEdge + i) % 6);
        } else if (!gameState.flash) {
          edges.push(baseEdge);
        }
        edges.forEach(e => drawEdgeHighlight(ctx, centerX + pos.x, centerY + pos.y, e, HEX_SIZE, '#FFFFFF'));
      }

      // FPS calc
      const frameData = frameCounterRef.current;
      frameData.frames++;
      const now = performance.now();
      if (now - frameData.last >= 1000) {
        setFps(frameData.frames);
        frameData.frames = 0;
        frameData.last = now;
      }

      requestAnimationFrame(render);
    }
    const raf = requestAnimationFrame(render);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [gameState, mergedParams]);

  // Derived HUD data
  const mode = deriveMode(gameState);
  const chance = previewCaptureChanceAtCursor(gameState, mergedParams);
  const hoverColorIndex = hoveredCell(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';
  const flashColor = gameState.flash ? (gameState.flash.type === 'success' ? FLASH_SUCCESS_COLOR : FLASH_FAILURE_COLOR) : null;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#111', color: '#fff', fontFamily: 'sans-serif' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '10px 15px', borderRadius: 8, fontSize: 14, lineHeight: 1.5, textAlign: 'right', minWidth: 240 }}>
        <div>Player Color <span style={{ display: 'inline-block', width: 14, height: 14, background: mergedParams.ColorPalette[mergedParams.PlayerBaseColorIndex], border: '1px solid #fff', verticalAlign: 'middle', marginLeft: 6 }} /></div>
        <div>Cursor <span style={{ display: 'inline-block', width: 14, height: 14, background: flashColor || hoverColor, border: '1px solid #fff', verticalAlign: 'middle', marginLeft: 6 }} /></div>
        <div>Captured: {gameState.capturedCell ? 1 : 0}</div>
        <div>Mode: {mode}{chance !== null && mode === 'Free' ? ` (Chance: ${chance}%)` : ''}</div>
        <div>Time Left: {gameState.remainingSeconds}s</div>
        <div>FPS: {fps}</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, textAlign: 'left' }}>
          <div><strong>Controls</strong></div>
          <div>Move: Arrow keys or WASD</div>
          <div>Hold Space to charge capture</div>
          <div>Release Space to try capture</div>
          <div>Press Space while carrying to drop</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, textAlign: 'left' }}>
          Goal: collect cells matching your color before the timer ends.
        </div>
      </div>
    </div>
  );
};

export default Game;
