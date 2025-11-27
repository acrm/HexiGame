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
  attemptMoveByDelta,
  beginCaptureCharge,
  endCaptureCharge,
  dropCarried,
  previewCaptureChanceAtCursor,
  hoveredCell,
  isCarryFlickerOn,
  computeAdjacentSameColorCounts,
} from '../logic/pureLogic';

// --- Rendering-only constants (not part of pure logic) ---
const HEX_SIZE = 10; // pixels
const FLASH_SUCCESS_COLOR = '#00BFFF';
const FLASH_FAILURE_COLOR = '#FF4444';
const FLASH_FAILURE_EDGE_DARK = '#AA0000';
const GRID_STROKE_COLOR = '#635572ff'; //'#460068ff';
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
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Visual rotating edge highlight index (0..5)
function computeEdgeIndex(timeMs: number, rotationPeriodMs = 500) {
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

// React component
export const Game: React.FC<{ params?: Partial<Params>; seed?: number }> = ({ params, seed }) => {
  const mergedParams: Params = { ...DefaultParams, ...(params || {}) };
  const rngRef = useRef<RNG>(mulberry32(seed ?? Date.now()));
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(mergedParams, rngRef.current));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [fps, setFps] = useState(0);
  const frameCounterRef = useRef({ last: performance.now(), frames: 0 });
  const spaceIsDownRef = useRef(false);

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
      if (e.code === 'Space') {
        if (spaceIsDownRef.current) {
          // Ignore auto-repeat while key is held
          return;
        }
        spaceIsDownRef.current = true;
        setGameState(prev => {
          if (prev.capturedCell) return dropCarried(prev);
          return beginCaptureCharge(prev);
        });
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
        if (!spaceIsDownRef.current) {
          // Spurious keyup without a tracked down
          return;
        }
        spaceIsDownRef.current = false;
        // При отпускании Space: если зарядка ещё идёт и не достигла порога,
        // просто отменяем её без попытки захвата. Если порог уже достигнут,
        // авто-захват произошёл внутри tick, здесь ничего не делаем.
        setGameState(prev => {
          if (prev.captureChargeStartTick === null) return prev;
          const heldTicks = prev.tick - prev.captureChargeStartTick;
          if (heldTicks < mergedParams.CaptureHoldDurationTicks) {
            return { ...prev, captureChargeStartTick: null };
          }
          return { ...prev, captureChargeStartTick: null };
        });
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
      const container = canvasContainerRef.current;
      if (!canvas || !container) {
        requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestAnimationFrame(render);
        return;
      }

      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight;

      // Compute tight logical bounds of the actual hex disk in pixel space
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const cell of gameState.grid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const x = pos.x;
        const y = pos.y;
        const halfW = HEX_SIZE * 1.0; // approximate radius horizontally
        const halfH = HEX_SIZE * Math.sqrt(3) * 0.5; // approximate radius vertically
        minX = Math.min(minX, x - halfW);
        maxX = Math.max(maxX, x + halfW);
        minY = Math.min(minY, y - halfH);
        maxY = Math.max(maxY, y + halfH);
      }

      const logicalWidth = maxX - minX;
      const logicalHeight = maxY - minY;

      const scale = 0.8 * Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight);

      const pixelWidth = logicalWidth * scale;
      const pixelHeight = logicalHeight * scale;

      canvas.width = Math.max(1, Math.floor(pixelWidth));
      canvas.height = Math.max(1, Math.floor(pixelHeight));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
      const centerY = canvas.height / 2 - ((minY + maxY) / 2) * scale;

      // Draw hex fills (no outline)
      for (const cell of gameState.grid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        let fill = cell.colorIndex !== null ? mergedParams.ColorPalette[cell.colorIndex] : 'transparent';
        // Flicker for carried cell anchor
        if (gameState.capturedCell && cell.q === gameState.capturedCell.q && cell.r === gameState.capturedCell.r) {
          if (isCarryFlickerOn(gameState, mergedParams)) {
            fill = mergedParams.ColorPalette[cell.colorIndex ?? mergedParams.PlayerBaseColorIndex];
          }
        }
        drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, GRID_STROKE_COLOR, 0);
      }

      // Draw grid corner dots only where all adjacent hexes are empty
      ctx.fillStyle = GRID_STROKE_COLOR;
      const dotRadius = 1.2 * scale;
      const seenVertices = new Set<string>();
      const emptyCells = Array.from(gameState.grid.values()).filter(c => c.colorIndex === null);
      for (const cell of emptyCells) {
        const pos = hexToPixel(cell.q, cell.r);
        const baseX = centerX + pos.x * scale;
        const baseY = centerY + pos.y * scale;
        const angleDeg = 60;
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 180 * (angleDeg * i);
          const vx = baseX + HEX_SIZE * scale * Math.cos(angle);
          const vy = baseY + HEX_SIZE * scale * Math.sin(angle);
          const key = `${Math.round(vx)}:${Math.round(vy)}`;
          if (seenVertices.has(key)) continue;

          // Check all adjacent hex centers that share this vertex; if any is colored, skip the dot
          let allEmpty = true;
          for (const other of gameState.grid.values()) {
            const otherPos = hexToPixel(other.q, other.r);
            const ox = centerX + otherPos.x * scale;
            const oy = centerY + otherPos.y * scale;
            const dx = ox - vx;
            const dy = oy - vy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Vertex belongs to hexes whose center is roughly HEX_SIZE * scale away
            if (Math.abs(dist - HEX_SIZE * scale) < (HEX_SIZE * scale * 0.15)) {
              if (other.colorIndex !== null) {
                allEmpty = false;
                break;
              }
            }
          }
          if (!allEmpty) continue;

          seenVertices.add(key);
          ctx.beginPath();
          ctx.arc(vx, vy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Flash overlay border
      if (gameState.flash) {
        const hover = hoveredCell(gameState);
        if (hover) {
          const pos = hexToPixel(hover.q, hover.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          const flashColor = gameState.flash.type === 'success' ? FLASH_SUCCESS_COLOR : FLASH_FAILURE_COLOR;
          drawHex(
            ctx,
            scaledX,
            scaledY,
            HEX_SIZE * scale,
            hover.colorIndex !== null ? mergedParams.ColorPalette[hover.colorIndex] : '#000',
            flashColor,
            3 * scale,
          );
        }
      }
      // Cursor visuals: rings + rotating segment depending on state
      const hover = hoveredCell(gameState);
      if (hover) {
        const pos = hexToPixel(hover.q, hover.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;

        const isCarrying = !!gameState.capturedCell;
        const isInCooldown = gameState.captureCooldownTicksRemaining > 0;

        // Base ring color & presence
        if (isCarrying) {
          // Successful capture: persistent blue ring while carrying
          drawHex(
            ctx,
            scaledX,
            scaledY,
            HEX_SIZE * scale,
            'transparent',
            FLASH_SUCCESS_COLOR,
            3 * scale,
          );
        } else if (isInCooldown) {
          // Failed capture: red ring during cooldown (transparent inside)
          drawHex(
            ctx,
            scaledX,
            scaledY,
            HEX_SIZE * scale,
            'transparent',
            FLASH_FAILURE_COLOR,
            3 * scale,
          );
        }

        // Rotating edge cursor
        if (!gameState.flash) {
          const now = performance.now();
          const baseEdge = computeEdgeIndex(now);
          const edges: number[] = [];
          if (gameState.captureChargeStartTick !== null && !isInCooldown) {
            // Expand edges count proportional to charge progress
            const heldTicks = gameState.tick - gameState.captureChargeStartTick;
            const fraction = Math.min(1, heldTicks / mergedParams.CaptureHoldDurationTicks);
            const edgeCount = Math.max(1, Math.ceil(fraction * 6));
            for (let i = 0; i < edgeCount; i++) edges.push((baseEdge + i) % 6);
          } else {
            edges.push(baseEdge);
          }
          const edgeColor = isInCooldown ? FLASH_FAILURE_EDGE_DARK : '#FFFFFF';
          edges.forEach(e => drawEdgeHighlight(ctx, scaledX, scaledY, e, HEX_SIZE * scale, edgeColor));
        }
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
  const chance = previewCaptureChanceAtCursor(gameState, mergedParams);
  const hoverColorIndex = hoveredCell(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';

  const adjacentCountByColor = computeAdjacentSameColorCounts(gameState, mergedParams);

  return (
    <div className="game-root">
      <div className="game-panel">
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            {mergedParams.ColorPalette.map((color, index) => {
              const total = mergedParams.ColorPalette.length;
              const angle = (index / total) * Math.PI * 2;
              const radius = 48;
              const center = 70;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              const isPlayerBase = index === mergedParams.PlayerBaseColorIndex;
              const isHover = index === hoverColorIndex;
              return (
                <svg
                  key={color + index}
                  width={26}
                  height={26}
                  viewBox="-1 -1 2 2"
                  style={{
                    position: 'absolute',
                    left: x - 9,
                    top: y - 9,
                  }}
                >
                  <polygon
                    points={Array.from({ length: 6 }, (_, i) => {
                      const ang = (Math.PI / 180) * (60 * i + 30); // vertical (pointy-top)
                      const r = 0.9;
                      const px = r * Math.cos(ang);
                      const py = r * Math.sin(ang);
                      return `${px},${py}`;
                    }).join(' ')}
                    fill={color}
                    stroke={isHover ? '#FFFFFF' : isPlayerBase ? '#BBBBBB' : '#000000'}
                    strokeWidth={isHover ? 0.24 : isPlayerBase ? 0.18 : 0.12}
                  />
                  <text
                    x={0}
                    y={0.08}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="0.8"
                    fill="#000"
                    stroke="none"
                  >
                    {adjacentCountByColor[index] > 0 ? adjacentCountByColor[index] : ''}
                  </text>
                </svg>
              );
            })}
            <div
              style={{
                position: 'absolute',
                left: 70 - 20,
                top: 70 - 20,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                background: 'transparent',
              }}
            >
              {gameState.capturedCell
                ? 'Kept'
                : chance !== null && hoverColorIndex !== null
                  ? `${chance}%`
                  : ''}
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, textAlign: 'left', paddingTop: 4, width: '100%' }}>
            <div><strong>Controls</strong></div>
            <div>Move: Arrow keys or WASD</div>
            <div>Hold Space to charge capture</div>
            <div>Press Space while carrying to drop</div>
            <div>On touch: use arrows and Capture button</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Goal: collect cells matching your color before the timer ends.
            </div>
          </div>
        </div>
      </div>
      <div ref={canvasContainerRef} className="game-field">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 6,
            fontSize: 11,
            opacity: 0.8,
            pointerEvents: 'none',
          }}
        >
          FPS: {fps}
        </div>
      </div>
      <div className="game-footer-controls">
        <div className="touch-dpad">
          <button
            type="button"
            className="touch-btn touch-up"
            onClick={() => setGameState(prev => attemptMoveByDelta(prev, mergedParams, 0, -1))}
          >
            ▲
          </button>
          <div className="touch-middle-row">
            <button
              type="button"
              className="touch-btn touch-left"
              onClick={() => setGameState(prev => attemptMoveByDelta(prev, mergedParams, -1, 0))}
            >
              ◀
            </button>
            <button
              type="button"
              className="touch-btn touch-right"
              onClick={() => setGameState(prev => attemptMoveByDelta(prev, mergedParams, 1, 0))}
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            className="touch-btn touch-down"
            onClick={() => setGameState(prev => attemptMoveByDelta(prev, mergedParams, 0, 1))}
          >
            ▼
          </button>
        </div>
        <button
          type="button"
          className="touch-btn touch-capture"
          onMouseDown={() => {
            setGameState(prev => {
              if (prev.capturedCell) return dropCarried(prev);
              return beginCaptureCharge(prev);
            });
          }}
          onMouseUp={() => {
            setGameState(prev => {
              if (prev.captureChargeStartTick === null) return prev;
              const heldTicks = prev.tick - prev.captureChargeStartTick;
              if (heldTicks < mergedParams.CaptureHoldDurationTicks) {
                return { ...prev, captureChargeStartTick: null };
              }
              return { ...prev, captureChargeStartTick: null };
            });
          }}
          onTouchStart={e => {
            e.preventDefault();
            setGameState(prev => {
              if (prev.capturedCell) return dropCarried(prev);
              return beginCaptureCharge(prev);
            });
          }}
          onTouchEnd={e => {
            e.preventDefault();
            setGameState(prev => {
              if (prev.captureChargeStartTick === null) return prev;
              const heldTicks = prev.tick - prev.captureChargeStartTick;
              if (heldTicks < mergedParams.CaptureHoldDurationTicks) {
                return { ...prev, captureChargeStartTick: null };
              }
              return { ...prev, captureChargeStartTick: null };
            });
          }}
        >
          Capture
        </button>
      </div>
    </div>
  );
};

export default Game;
