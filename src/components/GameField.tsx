import React, { useEffect, useRef } from 'react';
import { Params, GameState, hoveredCell, hoveredCellInventory, computeBreadcrumbs } from '../logic/pureLogic';

const HEX_SIZE = 10; // pixels
const FLASH_SUCCESS_COLOR = '#00BFFF';
const FLASH_FAILURE_COLOR = '#FF4444';
const FLASH_FAILURE_EDGE_DARK = '#AA0000';
const GRID_STROKE_COLOR = '#635572ff';

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
    const angle = (Math.PI / 180) * (angleDeg * i);
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
  const phase = (timeMs % rotationPeriodMs) / rotationPeriodMs;
  return Math.floor(phase * 6) % 6;
}

function drawEdgeHighlight(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, edge: number, size: number, color: string) {
  const angleDeg = 60;
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i);
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

// Draw highlighted vertices (corners) of hex
function drawVertexHighlights(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, color: string, radius = 3) {
  const angleDeg = 60;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i);
    const vx = centerX + size * Math.cos(angle);
    const vy = centerY + size * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(vx, vy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

const AXIAL_DIRECTIONS: Readonly<{ q: number; r: number }[]> = [
  { q: 0, r: -1 },
  { q: +1, r: -1 },
  { q: +1, r: 0 },
  { q: 0, r: +1 },
  { q: -1, r: +1 },
  { q: -1, r: 0 },
] as const;

interface GameFieldProps {
  gameState: GameState;
  params: Params;
  fps: number;
  setFps: (fps: number) => void;
  isInventory: boolean;
  onToggleInventory: () => void;
  onCapture: () => void;
  onRelease: () => void;
  onEat: () => void;
  onSetCursor: (q: number, r: number) => void;
  onCellClickDown?: (q: number, r: number) => void;
  onCellClickUp?: (q: number, r: number) => void;
  onCellDrag?: (q: number, r: number) => void;
}

export const GameField: React.FC<GameFieldProps> = ({
  gameState,
  params,
  fps,
  setFps,
  isInventory,
  onToggleInventory,
  onCapture,
  onRelease,
  onEat,
  onSetCursor,
  onCellClickDown,
  onCellClickUp,
  onCellDrag,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const frameCounterRef = useRef({ last: performance.now(), frames: 0 });
  // Track active ACT (action mode) touch so release outside button still ends action mode
  const actTouchIdRef = useRef<number | null>(null);
  // Geometry refs for click/tap mapping
  const scaleRef = useRef<number>(1);
  const centerXRef = useRef<number>(0);
  const centerYRef = useRef<number>(0);

  function pixelToAxial(px: number, py: number): { q: number; r: number } {
    const scale = scaleRef.current;
    const cx = centerXRef.current;
    const cy = centerYRef.current;
    const x = (px - cx) / scale;
    const y = (py - cy) / scale;
    const qFloat = x / (1.5 * HEX_SIZE);
    const rFloat = (y / (Math.sqrt(3) * HEX_SIZE)) - qFloat / 2;
    let q = qFloat;
    let r = rFloat;
    let s = -q - r;
    const rq = Math.round(q);
    const rr = Math.round(r);
    const rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) {
      q = -rr - rs;
    } else if (rDiff > sDiff) {
      r = -rq - rs;
    }
    return { q: Math.round(q), r: Math.round(r) };
  }

  // Touch handling for mobile controls
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
        const eatCenterX = currentCanvas.width - margin - inward;
        const eatCenterY = baseY - 64;
        const eatRadius = 24;

        const showAct = !isInventory; // ACT always available in world
        let consumed = false;
        const dCap = Math.hypot(x - capCenterX, y - capCenterY);
        if (dCap <= capRadius && showAct) {
          ev.preventDefault();
          actTouchIdRef.current = t.identifier;
          onCapture();
          consumed = true;
        }

        if (!isInventory && gameState.capturedCell) {
          const dEat = Math.hypot(x - eatCenterX, y - eatCenterY);
          if (dEat <= eatRadius) {
            ev.preventDefault();
            onEat();
            consumed = true;
          }
        }

        if (!consumed) {
          const axial = pixelToAxial(x, y);
          onSetCursor(axial.q, axial.r);
          if (!isInventory) {
            // Mirror desktop behavior: pressing a cell also holds ACT
            actTouchIdRef.current = t.identifier;
            onCapture();
          }
        }
      }
    }

    function handleTouchMove(ev: TouchEvent) {
      // Joystick is disabled on mobile; prevent accidental page scroll while swiping.
      ev.preventDefault();
    }

    function handleTouchEnd(ev: TouchEvent) {
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
        const capCenterX = currentCanvas.width - margin - inward;
        const capCenterY = baseY;
        const capRadius = 30;
        const eatCenterX = currentCanvas.width - margin - inward;
        const eatCenterY = baseY - 64;
        const eatRadius = 24;
        // Release action mode if ACT touch ends (regardless of where it ends)
        if (t.identifier === actTouchIdRef.current) {
          actTouchIdRef.current = null;
          ev.preventDefault();
          onRelease();
        } else {
          // Legacy tap detection (fallback) - if user taps ACT without moving finger
          const showAct = !isInventory;
          const dCap = Math.hypot(x - capCenterX, y - capCenterY);
          if (dCap <= capRadius && showAct) {
            ev.preventDefault();
            onCapture();
          } else {
            const axial = pixelToAxial(x, y);
            onSetCursor(axial.q, axial.r);
          }
        }

        if (!isInventory && gameState.capturedCell) {
          const dEat = Math.hypot(x - eatCenterX, y - eatCenterY);
          if (dEat <= eatRadius) {
            ev.preventDefault();
            onEat();
          }
        }

        // Inventory toggle handled on touchstart (press), not on release
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
  }, [gameState.capturedCell, isInventory, onToggleInventory, onCapture, onRelease, onEat, onSetCursor]);

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

      // Compute tight logical bounds
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const cell of gameState.grid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const x = pos.x;
        const y = pos.y;
        const halfW = HEX_SIZE * 1.0;
        const halfH = HEX_SIZE * Math.sqrt(3) * 0.5;
        minX = Math.min(minX, x - halfW);
        maxX = Math.max(maxX, x + halfW);
        minY = Math.min(minY, y - halfH);
        maxY = Math.max(maxY, y + halfH);
      }

      const logicalWidth = maxX - minX;
      const logicalHeight = maxY - minY;

      const padding = 12; // keep a thin margin so hexes are never cut off
      const scale = Math.min(
        (availableWidth - padding * 2) / logicalWidth,
        (availableHeight - padding * 2) / logicalHeight,
      );

      const pixelWidth = availableWidth;
      const pixelHeight = availableHeight;

      canvas.width = Math.max(1, Math.floor(pixelWidth));
      canvas.height = Math.max(1, Math.floor(pixelHeight));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isInventory) {
        // Inventory background as protagonist color
        ctx.fillStyle = params.ColorPalette[params.PlayerBaseColorIndex] || '#000';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }

      const centerX = canvas.width / 2 - ((minX + maxX) / 2) * scale;
      // In portrait (mobile) layout, align grid to the top padding; otherwise keep centered
      const isPortrait = canvas.height > canvas.width;
      const centerY = isPortrait
        ? padding - minY * scale
        : canvas.height / 2 - ((minY + maxY) / 2) * scale;
      scaleRef.current = scale;
      centerXRef.current = centerX;
      centerYRef.current = centerY;

      // Draw world or inventory as full hex grids
      const activeGrid = isInventory ? gameState.inventoryGrid : gameState.grid;
      for (const cell of activeGrid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        let fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
        const isCapturedHere = !isInventory && !!gameState.capturedCell && cell.q === gameState.capturedCell.q && cell.r === gameState.capturedCell.r;
        const strokeColor = isCapturedHere ? '#FFFFFF' : 'transparent';
        const strokeWidth = isCapturedHere ? 2 * scale : 0;
        drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, strokeColor, strokeWidth);
      }

      // Draw grid corner dots
      ctx.fillStyle = GRID_STROKE_COLOR;
      const dotRadius = 1.2 * scale;
      const seenVertices = new Set<string>();
      const emptyCells = Array.from(activeGrid.values()).filter(c => c.colorIndex === null);
      for (const cell of emptyCells) {
        const pos = hexToPixel(cell.q, cell.r);
        const baseX = centerX + pos.x * scale;
        const baseY = centerY + pos.y * scale;
        const angleDeg = 60;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (angleDeg * i);
          const vx = baseX + HEX_SIZE * scale * Math.cos(angle);
          const vy = baseY + HEX_SIZE * scale * Math.sin(angle);
          const key = `${Math.round(vx)}:${Math.round(vy)}`;
          if (seenVertices.has(key)) continue;

          let allEmpty = true;
          for (const other of activeGrid.values()) {
            const otherPos = hexToPixel(other.q, other.r);
            const ox = centerX + otherPos.x * scale;
            const oy = centerY + otherPos.y * scale;
            const dx = ox - vx;
            const dy = oy - vy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(dist - HEX_SIZE * scale) < HEX_SIZE * scale * 0.15) {
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

      // Skip flash overlay rendering; success is indicated by white outline on captured hex.

      // Focus and target visuals
      const protagonistCell = gameState.protagonist;
      const focusCell = gameState.focus;
      const autoMoveTarget = gameState.autoMoveTarget;

      // Draw auto-move target with rotating edges (destination focus cell)
      if (!isInventory && gameState.autoFocusTarget && autoMoveTarget &&
          (autoMoveTarget.q !== protagonistCell.q || autoMoveTarget.r !== protagonistCell.r)) {
        const pos = hexToPixel(gameState.autoFocusTarget.q, gameState.autoFocusTarget.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        const now = performance.now();
        const e = computeEdgeIndex(now);
        drawEdgeHighlight(ctx, scaledX, scaledY, e, HEX_SIZE * scale, '#FFFFFF');
      }

      // Draw focus with highlighted vertices (always, no animation)
      if (!isInventory) {
        const pos = hexToPixel(focusCell.q, focusCell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        
        const isInCooldown = gameState.captureCooldownTicksRemaining > 0;
        const isEatFailed = (gameState as any).eatFailureFlash !== undefined;
        
        if (isEatFailed || isInCooldown) {
          // Show error state with red vertices
          drawVertexHighlights(ctx, scaledX, scaledY, HEX_SIZE * scale, FLASH_FAILURE_EDGE_DARK, 1 * scale);
        } else {
          // Normal focus: white vertices
          drawVertexHighlights(ctx, scaledX, scaledY, HEX_SIZE * scale, '#FFFFFF', 1 * scale);
        }
      }

      // Inventory cursor: keep rotating edges
      if (isInventory) {
        const hover = hoveredCellInventory(gameState);
        if (hover) {
          const pos = hexToPixel(hover.q, hover.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;

          const isInCooldown = gameState.captureCooldownTicksRemaining > 0;
          const isCharging = gameState.captureChargeStartTick !== null;

          const now = performance.now();
          const baseEdge = computeEdgeIndex(now);
          const edges: number[] = [];
          if (isCharging && !isInCooldown) {
            const heldTicks = gameState.tick - (gameState.captureChargeStartTick || 0);
            const fraction = Math.min(1, heldTicks / params.CaptureHoldDurationTicks);
            const edgeCount = Math.max(1, Math.ceil(fraction * 6));
            for (let i = 0; i < edgeCount; i++) edges.push((baseEdge + i) % 6);
          } else {
            edges.push(baseEdge);
          }
          const edgeColor = isInCooldown ? FLASH_FAILURE_EDGE_DARK : '#FFFFFF';
          edges.forEach(e => drawEdgeHighlight(ctx, scaledX, scaledY, e, HEX_SIZE * scale, edgeColor));
        }
      }

      // Turtle (world): pivot around captured hex when carrying; head faces focus.
      if (!isInventory) {
          const carrying = !!gameState.capturedCell;
          const releasing = (gameState as any).isReleasing;
          // Always pivot around protagonist; captured hex is rendered separately with outline.
          const pivotQ = protagonistCell.q;
          const pivotR = protagonistCell.r;
          const pivotPos = hexToPixel(pivotQ, pivotR);
          const pivotX = centerX + pivotPos.x * scale;
          const pivotY = centerY + pivotPos.y * scale;

          const focusPos = hexToPixel(focusCell.q, focusCell.r);
            const hx = centerX + focusPos.x * scale;
            const hy = centerY + focusPos.y * scale;
            const vx = hx - pivotX;
            const vy = hy - pivotY;
            const focusAngle = Math.atan2(vy, vx);

          const parentRadius = HEX_SIZE * scale;
          const centerRadius = parentRadius / 3;
          const shellRadius = parentRadius / Math.sqrt(3);
          const turtleOffsetX = pivotX;
          const turtleOffsetY = pivotY;

          // Petal centers
          const smallCenters: { x: number; y: number }[] = [];
          for (let i = 0; i < 6; i++) {
            const ang = (Math.PI / 180) * (60 * i - 30);
            const ringRadius = centerRadius * 2.05;
            smallCenters.push({
              x: turtleOffsetX + ringRadius * Math.cos(ang),
              y: turtleOffsetY + ringRadius * Math.sin(ang),
            });
          }

          // Choose head toward focus
          let headIndex = 0;
          let bestDiff = Infinity;
          for (let i = 0; i < 6; i++) {
            const c = smallCenters[i];
            const px = c.x - turtleOffsetX;
            const py = c.y - turtleOffsetY;
            const petalAngle = Math.atan2(py, px);
            const diff = Math.abs(Math.atan2(Math.sin(focusAngle - petalAngle), Math.cos(focusAngle - petalAngle)));
            if (diff < bestDiff) {
              bestDiff = diff;
              headIndex = i;
            }
          }
          const tailIndex = (headIndex + 3) % 6;
          const turtleColorIndex = (gameState as any).turtleColorIndex ?? params.PlayerBaseColorIndex;
          const baseColor = params.ColorPalette[turtleColorIndex] || '#FFFFFF';

          for (let i = 0; i < smallCenters.length; i++) {
            if (i === tailIndex) continue;
            const c = smallCenters[i];
            const isHead = i === headIndex;
            const radius = isHead ? centerRadius : parentRadius / 9;
            const fill = isHead ? baseColor : 'rgba(255,255,255,0.6)';
            drawHex(ctx, c.x, c.y, radius, fill, '#FFFFFF', 0.8 * scale);
            if (isHead) {
              // Eyes perpendicular to head direction
              const hx2 = c.x - turtleOffsetX;
              const hy2 = c.y - turtleOffsetY;
              const len = Math.hypot(hx2, hy2) || 1;
              const ux = hx2 / len;
              const uy = hy2 / len;
              const px = -uy;
              const py = ux;
              const eyeOffset = radius * 0.35;
              const eyeSize = radius * 0.12;
              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.arc(c.x + px * eyeOffset, c.y + py * eyeOffset, eyeSize, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(c.x - px * eyeOffset, c.y - py * eyeOffset, eyeSize, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Shell
          ctx.save();
          ctx.translate(turtleOffsetX, turtleOffsetY);
          ctx.rotate((30 * Math.PI) / 180);
          drawHex(ctx, 0, 0, shellRadius, baseColor, '#FFFFFF', 0.8 * scale);
          ctx.restore();
      }

      // Breadcrumbs path: draw tiny hexes along shortest path when turtle not at focus
      if (!isInventory) {
        const atFocus = gameState.protagonist.q === gameState.focus.q && gameState.protagonist.r === gameState.focus.r;
        if (!atFocus) {
          const crumbs = computeBreadcrumbs(gameState, params);
          const tinySize = (HEX_SIZE * scale) / 9;
          ctx.save();
          ctx.globalAlpha = 0.95;
          for (let idx = 0; idx < crumbs.length; idx++) {
            const p = crumbs[idx];
            const pos = hexToPixel(p.q, p.r);
            const x = centerX + pos.x * scale;
            const y = centerY + pos.y * scale;
            const color = idx < 6 ? '#cccccc' : '#999999';
            drawHex(ctx, x, y, tinySize, color, 'transparent', 0);
          }
          ctx.restore();
        }
      }

      // Mobile controls
      const isMobileLayout = window.innerWidth <= 900;
      if (isMobileLayout) {
        const margin = 64;
        const inward = canvas.width * 0.10;
        const baseY = canvas.height - margin;

        // ACT button (action mode hold)
        const capCenterX = canvas.width - margin - inward;
        const capCenterY = baseY;
        const capRadius = 30;
        const showAct = !isInventory; // always available in world
        const actPressed = gameState.isActionMode;
        if (showAct) {
          drawHex(
            ctx,
            capCenterX,
            capCenterY,
            capRadius,
            actPressed ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.95)',
            actPressed ? '#ffffff' : 'transparent',
            3,
          );
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.font = '15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ACT', capCenterX, capCenterY + 1);
        }

        // EAT button
        if (!isInventory && gameState.capturedCell) {
          const eatCenterX = capCenterX;
          const eatCenterY = capCenterY - 64;
          const eatRadius = 24;
          drawHex(ctx, eatCenterX, eatCenterY, eatRadius, 'rgba(255,255,255,0.95)', 'transparent', 2);
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EAT', eatCenterX, eatCenterY + 0);
        }

        // Removed old inventory-above-joystick button (replaced by primary inv button)
      }

      // FPS
      const frameData = frameCounterRef.current;
      frameData.frames++;
      const now = performance.now();
      if (now - frameData.last >= 1000) {
        setFps(frameData.frames);
        frameData.frames = 0;
        frameData.last = now;
      }

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
  }, [gameState, params, fps, setFps, isInventory]);

  // Desktop mouse click focusing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastAxial: { q: number; r: number } | null = null;
    
    function handleMouseDown(ev: MouseEvent) {
      if (ev.button !== 0) return;
      const rect = canvas!.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const axial = pixelToAxial(x, y);
      lastAxial = axial;
      onSetCursor(axial.q, axial.r);
      if (onCellClickDown) {
        onCellClickDown(axial.q, axial.r);
      }
    }
    
    function handleMouseMove(ev: MouseEvent) {
      if (!lastAxial) return; // Not dragging
      const rect = canvas!.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const axial = pixelToAxial(x, y);
      // Only call drag if we moved to a different cell
      if (axial.q !== lastAxial.q || axial.r !== lastAxial.r) {
        lastAxial = axial;
        if (onCellDrag) {
          onCellDrag(axial.q, axial.r);
        }
      }
    }
    
    function handleMouseUp(ev: MouseEvent) {
      if (ev.button !== 0) return;
      const rect = canvas!.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const axial = pixelToAxial(x, y);
      lastAxial = null; // End drag
      if (onCellClickUp) {
        onCellClickUp(axial.q, axial.r);
      }
    }
    
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onSetCursor, onCellClickDown, onCellClickUp, onCellDrag]);

  return (
    <div ref={canvasContainerRef} className="game-field">
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default GameField;
