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
  eatCaptured,
  previewCaptureChanceAtCursor,
  hoveredCell,
  isCarryFlickerOn,
  computeAdjacentSameColorCounts,
  evolveProtagonistFollower,
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

// Axial directions (must match logic order in pureLogic).
// 0 - up, then clockwise.
const AXIAL_DIRECTIONS: Readonly<{ q: number; r: number }[]> = [
  { q: 0, r: -1 },  // up
  { q: +1, r: -1 }, // up-right
  { q: +1, r: 0 },  // down-right
  { q: 0, r: +1 },  // down
  { q: -1, r: +1 }, // down-left
  { q: -1, r: 0 },  // up-left
] as const;

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
  const [protagonistPos, setProtagonistPos] = useState<{ q: number; r: number } | null>(null);
  const lastCursorRef = useRef<{ q: number; r: number } | null>(null);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);

  // virtual joystick state
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastJoystickMoveTickRef = useRef(0);

  // Convert joystick vector to nearest axial hex direction; null if in dead zone
  function joystickToAxial(vx: number, vy: number): [number, number] | null {
    const len = Math.hypot(vx, vy);
    if (len < 6) return null; // dead zone to avoid jitter
    const angle = Math.atan2(vy, vx); // 0: right, clockwise
    const norm = (angle + 2 * Math.PI) % (2 * Math.PI);
    // Use nearest sector (round) to avoid boundary misclassification,
    // screen coordinates: +Y is down.
    const sector = Math.round((norm / (2 * Math.PI)) * 6) % 6; // 0..5
      const approxDirs: [number, number][] = [
        [1, 0],   // 0: right
        [1, 1],   // 1: down-right (approximate)
        [0, 1],   // 2: down
        [-1, 0],  // 3: left
        [-1, -1], // 4: up-left (approximate)
        [0, -1],  // 5: up
    ];
    const [dqApprox, drApprox] = approxDirs[sector];
    const trueDirs: [number, number][] = [
      [0, -1],
      [1, -1],
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
    ];
    let best: [number, number] = trueDirs[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const [aq, ar] of trueDirs) {
      const dq = aq - dqApprox;
      const dr = ar - drApprox;
      const dist = dq * dq + dr * dr;
      if (dist < bestDist) {
        bestDist = dist;
        best = [aq, ar];
      }
    }
    return best;
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
      if (e.key === 'e' || e.key === 'E') {
        setGameState(prev => eatCaptured(prev, mergedParams));
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

      const scale = Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight);

      const pixelWidth = availableWidth;
      const pixelHeight = availableHeight;

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

      // Visual cursor is exactly the logical cursor (no jumps, always neighbor moves)
      const protagonistCell = protagonistPos ?? gameState.protagonist;
      const faceDir = AXIAL_DIRECTIONS[gameState.facingDirIndex];
      const hover = hoveredCell(gameState) ?? null;

      // Cursor visuals: rings + rotating segment depending on state
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

        // Protagonist: flower of 6 small hexes (no central) centered on protagonist cell
        const turtleCenterQ = protagonistCell.q;
        const turtleCenterR = protagonistCell.r;

        const turtlePos = hexToPixel(turtleCenterQ, turtleCenterR);
        const turtleX = centerX + turtlePos.x * scale;
        const turtleY = centerY + turtlePos.y * scale;

        // Small hexes: centers arranged like tight packing, but body hexes are smaller (1/9 of parent)
        const parentRadius = HEX_SIZE * scale;
        const centerRadius = parentRadius / 3; // geometric layout radius for centers

        // Centers of 7 small hexes: one in the middle, six around at distance 2 * centerRadius.
        // We keep a -30° offset so the small hexes pack correctly
        // around the parent.
        const smallCenters: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 180) * (60 * i - 30);
          const ringRadius = centerRadius * 2.05;
          const cx = turtleX + ringRadius * Math.cos(ang);
          const cy = turtleY + ringRadius * Math.sin(ang);
          smallCenters.push({ x: cx, y: cy });
        }

        // Choose one outer small hex whose center is closest in angle
        // to the actual vector from protagonist to cursor.
        let headIndex = 0;
        if (!(protagonistCell.q === hover.q && protagonistCell.r === hover.r)) {
          const hoverPos = hexToPixel(hover.q, hover.r);
          const hx = centerX + hoverPos.x * scale;
          const hy = centerY + hoverPos.y * scale;
          const vx = hx - turtleX;
          const vy = hy - turtleY;
          const targetAngle = Math.atan2(vy, vx);

          let bestDiff = Number.POSITIVE_INFINITY;
          for (let i = 0; i < 6; i++) {
            const c = smallCenters[i]; // 0..5 are petals
            const px = c.x - turtleX;
            const py = c.y - turtleY;
            const petalAngle = Math.atan2(py, px);
            const diff = Math.abs(Math.atan2(Math.sin(targetAngle - petalAngle), Math.cos(targetAngle - petalAngle)));
            if (diff < bestDiff) {
              bestDiff = diff;
              headIndex = i;
            }
          }
        }

        // Opposite index to head (tail) among petals 1..6
        const tailIndex = (headIndex + 3) % 6;

        // Draw with protagonist color shades and thin white outline
        const baseColor = mergedParams.ColorPalette[mergedParams.PlayerBaseColorIndex] || '#FFFFFF';
        for (let i = 0; i < smallCenters.length; i++) {
          if (i === tailIndex) continue;
          const c = smallCenters[i];
          const isHead = i === headIndex;
          const radius = isHead ? centerRadius : parentRadius / 9;
          const fill = isHead ? baseColor : 'rgba(255,255,255,0.6)';
          drawHex(ctx, c.x, c.y, radius, fill, '#FFFFFF', 0.8 * scale);
        }

        // Draw opaque shell in protagonist base color, rotated by 30 degrees
        const shellRadius = parentRadius / Math.sqrt(3);
        ctx.save();
        ctx.translate(turtleX, turtleY);
        ctx.rotate((30 * Math.PI) / 180);
        drawHex(ctx, 0, 0, shellRadius, baseColor, '#FFFFFF', 0.8 * scale);
        ctx.restore();
      }

      // --- On-screen mobile controls (joystick + capture) ---
      const isMobileLayout = window.innerWidth <= 900;
      if (isMobileLayout) {
        const margin = 64;
        const inward = canvas.width * 0.10;
        const baseY = canvas.height - margin;

        // left joystick (bottom-left, moved inward)
        const joyCenterX = margin + inward;
        const joyCenterY = baseY;
        const outerRadius = 40;
        const innerRadius = 18;

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(joyCenterX, joyCenterY, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        const knob = joystickVectorRef.current;
        const maxOffset = outerRadius - innerRadius - 4;
        const len = Math.sqrt(knob.x * knob.x + knob.y * knob.y) || 1;
        const kx = joyCenterX + (knob.x / len) * Math.min(len, maxOffset);
        const ky = joyCenterY + (knob.y / len) * Math.min(len, maxOffset);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(kx, ky, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Direction arrow to the right of the joystick (intended move)
        const dir = joystickToAxial(knob.x, knob.y);
        const arrowCenterX = joyCenterX + outerRadius + 48;
        const arrowCenterY = joyCenterY;
        ctx.save();
        ctx.globalAlpha = 1.0;
        const debugArrow = true; //import.meta.env.VITE_DEBUG_ARROW === 'true';
        if (debugArrow && dir) {
          const px = hexToPixel(dir[0], dir[1]);
          const ang = Math.atan2(px.y, px.x);
          const arrowLen = 36;
          const arrowWidth = 8;
          ctx.translate(arrowCenterX, arrowCenterY);
          ctx.rotate(ang);
          ctx.strokeStyle = '#ff00ff';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(arrowLen, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(arrowLen, 0);
          ctx.lineTo(arrowLen - arrowWidth, -arrowWidth * 0.7);
          ctx.lineTo(arrowLen - arrowWidth, arrowWidth * 0.7);
          ctx.closePath();
          ctx.fillStyle = '#ff00ff';
          ctx.fill();
        } else if (debugArrow) {
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(arrowCenterX, arrowCenterY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // hex capture button on the right
        const capCenterX = canvas.width - margin - inward;
        const capCenterY = baseY;
        const capRadius = 30;

        drawHex(
          ctx,
          capCenterX,
          capCenterY,
          capRadius,
          gameState.capturedCell ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
          gameState.capturedCell ? 'transparent' : 'rgba(255,255,255,0.85)',
          3,
        );

        // In capture mode (white fill), use black text; otherwise white text.
        ctx.fillStyle = gameState.capturedCell ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gameState.capturedCell ? 'REL' : 'CAP', capCenterX, capCenterY + 1);

        // EAT button above capture (only when carrying)
        if (gameState.capturedCell) {
          const eatCenterX = capCenterX;
          const eatCenterY = capCenterY - 64;
          const eatRadius = 24;
          drawHex(
            ctx,
            eatCenterX,
            eatCenterY,
            eatRadius,
            'rgba(255,255,255,0.95)',
            'transparent',
            2,
          );
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EAT', eatCenterX, eatCenterY + 0);
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

      // draw FPS label over canvas at bottom center
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`FPS: ${fps}`, canvas.width / 2, canvas.height - 4);
      ctx.restore();

      requestAnimationFrame(render);
    }
    const raf = requestAnimationFrame(render);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [gameState, mergedParams, protagonistPos]);

  // Smoothly move protagonist one step toward cursor when cursor changes (delegated to pure logic).
  useEffect(() => {
    const current = protagonistPos ?? gameState.protagonist;
    const cursor = gameState.cursor;
    const lastCursor = lastCursorRef.current;

    const { protagonist: nextProtagonist, nextLastCursor } = evolveProtagonistFollower(
      current,
      cursor,
      lastCursor,
    );

    // Apply follower step immediately when needed; throttling stays on cursor moves only.
    if (nextProtagonist.q !== current.q || nextProtagonist.r !== current.r) {
      setProtagonistPos({ q: nextProtagonist.q, r: nextProtagonist.r });
    }
    lastCursorRef.current = nextLastCursor;
  }, [gameState.cursor, gameState.protagonist, protagonistPos, gameState.tick]);

  // Derived HUD data
  const chance = previewCaptureChanceAtCursor(gameState, mergedParams);
  const hoverColorIndex = hoveredCell(gameState)?.colorIndex ?? null;
  const hoverColor = hoverColorIndex !== null ? mergedParams.ColorPalette[hoverColorIndex] : '#000';

  const adjacentCountByColor = computeAdjacentSameColorCounts(gameState, mergedParams);
  const eatenCounts: Record<string, number> = gameState.paletteCounts || {};

  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth <= 900;

  // touch handling for virtual joystick and capture button
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleTouchStart(ev: TouchEvent) {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const rect = currentCanvas.getBoundingClientRect();
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;

        const margin = 64;
        const inward = currentCanvas.width * 0.10;
        const baseY = currentCanvas.height - margin;
        const joyCenterX = margin + inward;
        const joyCenterY = baseY;
        const capCenterX = currentCanvas.width - margin - inward;
        const capCenterY = baseY;
        const joyOuterRadius = 40;
        const capRadius = 30;
        const eatCenterX = currentCanvas.width - margin;
        const eatCenterY = baseY - 64;
        const eatRadius = 24;

        const dJoy = Math.hypot(x - joyCenterX, y - joyCenterY);
        if (dJoy <= joyOuterRadius && joystickTouchIdRef.current === null) {
          joystickTouchIdRef.current = t.identifier;
          joystickCenterRef.current = { x: joyCenterX, y: joyCenterY };
          joystickVectorRef.current = { x: 0, y: 0 };
          ev.preventDefault();
          continue;
        }

        const dCap = Math.hypot(x - capCenterX, y - capCenterY);
        if (dCap <= capRadius) {
          ev.preventDefault();
          setGameState(prev => {
            if (prev.capturedCell) return dropCarried(prev);
            return beginCaptureCharge(prev);
          });
        }

        if (gameState.capturedCell) {
          const dEat = Math.hypot(x - eatCenterX, y - eatCenterY);
          if (dEat <= eatRadius) {
            ev.preventDefault();
            setGameState(prev => eatCaptured(prev, mergedParams));
          }
        }
      }
    }

    function handleTouchMove(ev: TouchEvent) {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas || joystickTouchIdRef.current === null) return;
      const rect = currentCanvas.getBoundingClientRect();
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        if (t.identifier !== joystickTouchIdRef.current) continue;
        const center = joystickCenterRef.current;
        if (!center) return;
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const vx = x - center.x;
        const vy = y - center.y;
        joystickVectorRef.current = { x: vx, y: vy };

        const nowTick = gameState.tick;
        if (nowTick - lastJoystickMoveTickRef.current >= 6) {
          lastJoystickMoveTickRef.current = nowTick;
          const dir = joystickToAxial(vx, vy);
          if (dir) {
            const [dq, dr] = dir;
            setGameState(prev => attemptMoveByDelta(prev, mergedParams, dq, dr));
          }
        }
        ev.preventDefault();
      }
    }

    function handleTouchEnd(ev: TouchEvent) {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const rect = currentCanvas.getBoundingClientRect();
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        if (t.identifier === joystickTouchIdRef.current) {
          joystickTouchIdRef.current = null;
          joystickCenterRef.current = null;
          joystickVectorRef.current = { x: 0, y: 0 };
          ev.preventDefault();
          continue;
        }

        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const margin = 64;
        const inward = currentCanvas.width * 0.10;
        const baseY = currentCanvas.height - margin;
        const capCenterX = currentCanvas.width - margin - inward;
        const capCenterY = baseY;
        const capRadius = 30;
        const eatCenterX = currentCanvas.width - margin;
        const eatCenterY = baseY - 64;
        const eatRadius = 24;
        const dCap = Math.hypot(x - capCenterX, y - capCenterY);
        if (dCap <= capRadius) {
          ev.preventDefault();
          setGameState(prev => {
            if (prev.captureChargeStartTick === null) return prev;
            const heldTicks = prev.tick - prev.captureChargeStartTick;
            if (heldTicks < mergedParams.CaptureHoldDurationTicks) {
              return { ...prev, captureChargeStartTick: null };
            }
            return { ...prev, captureChargeStartTick: null };
          });
        }

        if (gameState.capturedCell) {
          const dEat = Math.hypot(x - eatCenterX, y - eatCenterY);
          if (dEat <= eatRadius) {
            ev.preventDefault();
            setGameState(prev => eatCaptured(prev, mergedParams));
          }
        }
      }
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart as any);
      canvas.removeEventListener('touchmove', handleTouchMove as any);
      canvas.removeEventListener('touchend', handleTouchEnd as any);
      canvas.removeEventListener('touchcancel', handleTouchEnd as any);
    };
  }, [gameState.tick, mergedParams]);

  const paletteLen = mergedParams.ColorPalette.length;
  const antagonistIndex = paletteLen > 0 ? Math.floor(paletteLen / 2) : 0;
  const uniformHexSize = 32; // px, larger across panel
  // Diamond cluster of 8 hexes (flat-top), center empty gap
  // Positions relative to center: two lines of 3 and singles left/right
  const clusterPositions = [
    { x: 0, y: 0 }, // center gap
    // Top line of 3
    { x: -uniformHexSize * 0.50, y: -uniformHexSize * 0.87 },
    { x: 0,                     y: -uniformHexSize * 0.87 },
    { x: +uniformHexSize * 0.50, y: -uniformHexSize * 0.87 },
    // Bottom line of 3
    { x: -uniformHexSize * 0.50, y: +uniformHexSize * 0.87 },
    { x: 0,                     y: +uniformHexSize * 0.87 },
    { x: +uniformHexSize * 0.50, y: +uniformHexSize * 0.87 },
    // Singles left/right
    { x: -uniformHexSize * 1.00, y: 0 },
    { x: +uniformHexSize * 1.00, y: 0 },
  ];
  // Order colors to fill 8 ring positions: left -> top row (3) -> right -> bottom row (3)
  const middleColors = mergedParams.ColorPalette.map((_, i) => i)
    .filter(i => i !== mergedParams.PlayerBaseColorIndex && i !== antagonistIndex);
  const ringOrder = [
    antagonistIndex,
    ...(middleColors.slice(0, 3)),
    mergedParams.PlayerBaseColorIndex,
    ...(middleColors.slice(3, 6)),
  ];

  return (
    <div className="game-root">
      <div className="game-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', justifyContent: 'space-between' }}>
          {/* Palette cluster with center showing chance/state */}
          <div style={{ position: 'relative', width: '100%', height: 160 }}>
            {/* ring hexes */}
            {clusterPositions.slice(1).map((pos, i) => {
              const colorIdx = ringOrder[i % ringOrder.length];
              const color = mergedParams.ColorPalette[colorIdx];
              const cnt = eatenCounts[color] || 0;
              const isHover = colorIdx === hoverColorIndex;
              return (
                <svg
                  key={color + i}
                  width={uniformHexSize}
                  height={uniformHexSize}
                  viewBox="-1 -1 2 2"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(${pos.x - uniformHexSize / 2}px, ${pos.y - uniformHexSize / 2}px)`,
                  }}
                >
                  <polygon
                    points={Array.from({ length: 6 }, (_, k) => {
                      const ang = (Math.PI / 180) * (60 * k); // flat-top
                      const r = 0.98;
                      const px = r * Math.cos(ang);
                      const py = r * Math.sin(ang);
                      return `${px},${py}`;
                    }).join(' ')}
                    fill={color}
                    stroke={isHover ? '#FFFFFF' : '#BBBBBB'}
                    strokeWidth={0.12}
                  />
                  {cnt > 0 ? (
                    <text x={0} y={0.08} textAnchor="middle" dominantBaseline="middle" fontSize="0.9" fill="#FFFFFF">{cnt}</text>
                  ) : null}
                </svg>
              );
            })}
            {/* center hex with chance/state */}
            <svg
              width={uniformHexSize}
              height={uniformHexSize}
              viewBox="-1 -1 2 2"
              style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(${-uniformHexSize / 2}px, ${-uniformHexSize / 2}px)` }}
            >
              <polygon
                points={Array.from({ length: 6 }, (_, k) => {
                  const ang = (Math.PI / 180) * (60 * k);
                  const r = 0.98;
                  const px = r * Math.cos(ang);
                  const py = r * Math.sin(ang);
                  return `${px},${py}`;
                }).join(' ')}
                fill={'#2a0845'}
                stroke={'#b36bff'}
                strokeWidth={0.12}
              />
              <text x={0} y={-0.35} textAnchor="middle" dominantBaseline="middle" fontSize="0.7" fill="#FFFFFF">
                {gameState.capturedCell ? 'Kept' : 'Chance'}
              </text>
              <text x={0} y={0.3} textAnchor="middle" dominantBaseline="middle" fontSize="0.9" fill="#FFFFFF">
                {gameState.capturedCell ? '' : (chance !== null && hoverColorIndex !== null ? `${chance}%` : '')}
              </text>
            </svg>
          </div>
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
      </div>
      {/* Info: desktop shows inline; mobile shows light overlay and a panel under the button */}
      {isMobileLayout ? (
        isMobileInfoOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 }} onClick={() => setIsMobileInfoOpen(false)} />
            <div style={{ position: 'absolute', right: 8, top: 40, zIndex: 1001 }}>
              <div
                style={{
                  background: '#2a0845',
                  border: '2px solid #b36bff',
                  borderRadius: 8,
                  padding: 12,
                  width: 260,
                  color: '#fff',
                  fontSize: 13,
                  lineHeight: 1.6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 'bold' }}>Mobile Controls</div>
                <div>Move: on-screen joystick</div>
                <div>Capture: hold CAP; drop: REL</div>
                <div>Eat: tap EAT</div>
              </div>
            </div>
          </>
        )
      ) : (
        <div style={{ position: 'absolute', right: 8, top: 56, padding: '6px 10px', color: '#fff', opacity: 0.9, fontSize: 13, lineHeight: 1.6, border: '1px solid #b36bff', borderRadius: 6, background: 'rgba(42,8,69,0.9)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Desktop Controls</div>
          <div>Move: Arrows or WASD</div>
          <div>Capture: hold Space; drop: Space</div>
          <div>Eat: press E</div>
        </div>
      )}
      <div ref={canvasContainerRef} className="game-field">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <div className="game-footer-controls" />
    </div>
  );
};

export default Game;
