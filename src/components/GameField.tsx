import React, { useEffect, useRef } from 'react';
import { Params, GameState, Axial, computeBreadcrumbs } from '../logic/pureLogic';
import { renderTemplateOverlay } from './TemplateRenderer';
import ColorPaletteWidget from './ColorPaletteWidget';

const HEX_SIZE = 10; // pixels
const GRID_STROKE_COLOR = '#635572ff';
const HOTBAR_HEX_SIZE = 30;
const HOTBAR_RING_RADIUS_MULT = 1.7;

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

// Visual rotating edge highlight index with custom period (4 ticks = 1 edge rotation)
function computeEdgeIndexForFocusCell(tickCount: number, edgesPerCycle = 6) {
  // 1 edge rotates every 4 ticks, so cycle = 6 * 4 = 24 ticks
  const cycleLength = edgesPerCycle * 1;
  const phase = (tickCount % cycleLength) / cycleLength;
  return Math.floor(phase * edgesPerCycle) % edgesPerCycle;
}

// Draw two opposite rotating edges (edges 0 and 3 at cycle start)
function drawRotatingOppositeFaces(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, tickCount: number, color: string) {
  const currentEdge = computeEdgeIndexForFocusCell(tickCount, 6);
  const oppositeEdge = (currentEdge + 3) % 6;
  
  // Draw current rotating edge
  drawEdgeHighlight(ctx, centerX, centerY, currentEdge, size, color);
  // Draw opposite edge (always opposite)
  drawEdgeHighlight(ctx, centerX, centerY, oppositeEdge, size, color);
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

// Draw 5-pointed star
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number, color: string) {
  const angle = Math.PI / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - angle;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCornerDots(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, tickCount: number) {
  const angleDeg = 60;
  const blinkOn = (tickCount % 12) < 6;
  const alpha = blinkOn ? 1 : 0.35;
  const dotRadius = Math.max(1.4, size * 0.12);
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (angleDeg * i);
    const vx = centerX + size * Math.cos(angle);
    const vy = centerY + size * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(vx, vy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

interface GameFieldProps {
  gameState: GameState;
  params: Params;
  fps: number;
  setFps: (fps: number) => void;
  showFPS?: boolean;
  isInventory: boolean;
  onToggleInventory: () => void;
  onCapture: () => void;
  onRelease: () => void;
  onEat: () => void;
  onSetCursor: (q: number, r: number) => void;
  onCellClickDown?: (q: number, r: number) => void;
  onCellClickUp?: (q: number, r: number) => void;
  onCellDrag?: (q: number, r: number) => void;
  onHotbarSlotClick?: (slotIdx: number) => void;
  isLeftHanded?: boolean;
  tutorialTargetCells?: Axial[];
  visitedTutorialCells?: Set<string>;
  hideHotbar?: boolean;
}

export const GameField: React.FC<GameFieldProps> = ({
  gameState,
  params,
  fps,
  setFps,
  showFPS = false,
  isInventory,
  onToggleInventory,
  onCapture,
  onRelease,
  onEat,
  onSetCursor,
  onCellClickDown,
  onCellClickUp,
  onCellDrag,
  onHotbarSlotClick,
  isLeftHanded = false,
  tutorialTargetCells = [],
  visitedTutorialCells = new Set(),
  hideHotbar = false,
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

  // Detect if a click is on a hotbar ring slot (mobile only)
  function detectHotbarSlotClick(px: number, py: number): number | null {
    if (isInventory || hideHotbar) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const margin = 64;
    const inward = canvas.width * 0.10;
    const baseY = canvas.height - margin;
    const hotbarCenterX = isLeftHanded ? margin + inward : canvas.width - margin - inward;
    const hotbarCenterY = baseY;
    const hotbarHexSize = HOTBAR_HEX_SIZE;
    const hotbarRingRadius = hotbarHexSize * HOTBAR_RING_RADIUS_MULT;

    // Check distance to each slot
    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
      const angle = (Math.PI / 3) * slotIndex - 3 * Math.PI / 6;
      const slotX = hotbarCenterX + hotbarRingRadius * Math.cos(angle);
      const slotY = hotbarCenterY + hotbarRingRadius * Math.sin(angle);
      const dist = Math.hypot(px - slotX, py - slotY);
      if (dist < hotbarHexSize * 1.1) {
        return slotIndex;
      }
    }
    return null;
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

        // Check hotbar first
        const hotbarSlotIdx = detectHotbarSlotClick(x, y);
        if (hotbarSlotIdx !== null && onHotbarSlotClick) {
          ev.preventDefault();
          onHotbarSlotClick(hotbarSlotIdx);
          continue;
        }

        const margin = 64;
        const inward = currentCanvas.width * 0.10;
        const baseY = currentCanvas.height - margin;
        const hotbarCenterX = isLeftHanded ? margin + inward : currentCanvas.width - margin - inward;
        const capCenterX = hotbarCenterX;
        const capCenterY = baseY;
        const capRadius = HOTBAR_HEX_SIZE;

        const showAct = !isInventory; // ACT always available in world
        let consumed = false;
        const dCap = Math.hypot(x - capCenterX, y - capCenterY);
        if (dCap <= capRadius && showAct) {
          ev.preventDefault();
          actTouchIdRef.current = t.identifier;
          onCapture();
          consumed = true;
        }

        if (!consumed) {
          const axial = pixelToAxial(x, y);
          if (onCellClickDown) {
            onCellClickDown(axial.q, axial.r);
          }
          // If tapping on focus cell in world mode, also start action mode
          if (!isInventory && axial.q === gameState.focus.q && axial.r === gameState.focus.r) {
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
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        // Release action mode if ACT touch ends (regardless of where it ends)
        if (t.identifier === actTouchIdRef.current) {
          actTouchIdRef.current = null;
          ev.preventDefault();
          onRelease();
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
  }, [gameState.focus, isInventory, onToggleInventory, onCapture, onRelease, onEat, onSetCursor, onCellClickDown]);

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

      // Compute world bounds for consistent cell scaling across views
      let worldMinX = Infinity;
      let worldMaxX = -Infinity;
      let worldMinY = Infinity;
      let worldMaxY = -Infinity;
      for (const cell of gameState.grid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const x = pos.x;
        const y = pos.y;
        const halfW = HEX_SIZE * 1.0;
        const halfH = HEX_SIZE * Math.sqrt(3) * 0.5;
        worldMinX = Math.min(worldMinX, x - halfW);
        worldMaxX = Math.max(worldMaxX, x + halfW);
        worldMinY = Math.min(worldMinY, y - halfH);
        worldMaxY = Math.max(worldMaxY, y + halfH);
      }

      const worldLogicalWidth = worldMaxX - worldMinX;
      const worldLogicalHeight = worldMaxY - worldMinY;

      // Compute active grid bounds (world or inventory) for centering
      const activeBoundsGrid = isInventory ? gameState.inventoryGrid : gameState.grid;
      let activeMinX = Infinity;
      let activeMaxX = -Infinity;
      let activeMinY = Infinity;
      let activeMaxY = -Infinity;
      for (const cell of activeBoundsGrid.values()) {
        const pos = hexToPixel(cell.q, cell.r);
        const x = pos.x;
        const y = pos.y;
        const halfW = HEX_SIZE * 1.0;
        const halfH = HEX_SIZE * Math.sqrt(3) * 0.5;
        activeMinX = Math.min(activeMinX, x - halfW);
        activeMaxX = Math.max(activeMaxX, x + halfW);
        activeMinY = Math.min(activeMinY, y - halfH);
        activeMaxY = Math.max(activeMaxY, y + halfH);
      }

      const padding = 12; // keep a thin margin so hexes are never cut off
      const scale = Math.min(
        (availableWidth - padding * 2) / worldLogicalWidth,
        (availableHeight - padding * 2) / worldLogicalHeight,
      );

      const pixelWidth = availableWidth;
      const pixelHeight = availableHeight;

      canvas.width = Math.max(1, Math.floor(pixelWidth));
      canvas.height = Math.max(1, Math.floor(pixelHeight));

      ctx.clearRect(0, 0, canvas.width, canvas.height);


      const centerX = canvas.width / 2 - ((activeMinX + activeMaxX) / 2) * scale;
      // Always center vertically for both world and inventory
      const centerY = canvas.height / 2 - ((activeMinY + activeMaxY) / 2) * scale;
      scaleRef.current = scale;
      centerXRef.current = centerX;
      centerYRef.current = centerY;

      // Draw grid corner dots (for world or inventory)
      const activeGridDots = isInventory ? gameState.inventoryGrid : gameState.grid;
      ctx.fillStyle = GRID_STROKE_COLOR;
      const dotRadius = 1.2 * scale;
      // Removed early grid-dot rendering to allow for later redraws

      // Focus and target visuals
      const protagonistCell = gameState.protagonist;
      const focusCell = gameState.focus;
      const autoMoveTarget = gameState.autoMoveTarget;

      // Check if turtle is moving (has auto-move target and is not at turtle position)
      const isTurtleMoving = !isInventory && autoMoveTarget &&
          (autoMoveTarget.q !== protagonistCell.q || autoMoveTarget.r !== protagonistCell.r);

      // Draw focus cell with rotating opposite faces ONLY if not moving
      if (!isInventory && !isTurtleMoving) {
        const pos = hexToPixel(focusCell.q, focusCell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        
        // Use game tick for animation (12 ticks/sec, 1 edge every 4 ticks)
        drawRotatingOppositeFaces(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick, '#FFFFFF');
      }

      // Draw auto-move target (cursor) with rotating edges 2x faster when moving
      if (!isInventory && gameState.autoFocusTarget && autoMoveTarget &&
          (autoMoveTarget.q !== protagonistCell.q || autoMoveTarget.r !== protagonistCell.r)) {
        const pos = hexToPixel(gameState.autoFocusTarget.q, gameState.autoFocusTarget.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        // 2x faster: multiply tick by 2 for 2x rotation speed
        drawRotatingOppositeFaces(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick * 2, '#FFFFFF');
      }

      // In inventory mode: draw turtle background first, then inventoryGrid naturally
      if (isInventory) {
        // Inventory Turtle: centered below the grid, drawn under all cells
        const INV_TURTLE_SCALE = 12.0;     // controls turtle size relative to HEX_SIZE
        const INV_TURTLE_MARGIN_HEX = -6;  // vertical gap below grid in hex units

        const invBgShellColor = '#570546ff'; 
        const baseColor = params.ColorPalette[params.PlayerBaseColorIndex] || '#FFFFFF';

        // Position turtle just below bottom of inventory grid
        const pivotX = centerX;
        const pivotY = centerY + (activeMaxY + HEX_SIZE * INV_TURTLE_MARGIN_HEX) * scale;

        const parentRadius = HEX_SIZE * scale * INV_TURTLE_SCALE;
        const centerRadius = parentRadius / 3;
        const shellRadius = parentRadius / Math.sqrt(3);
        const turtleStroke = '#FFFFFF';
        const turtleLineWidth = 0.1 * scale;

        // Fix orientation: head strictly upward, ignore rotation param
        const rotationRad = 0;
        const smallCenters: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 180) * (60 * i - 30) + rotationRad;
          const ringRadius = centerRadius * 2.05;
          smallCenters.push({
            x: pivotX + ringRadius * Math.cos(ang),
            y: pivotY + ringRadius * Math.sin(ang),
          });
        }

        // Choose head strictly upward: pick petal with minimal y (most negative vy)
        let headIndex = 0;
        let minVy = Infinity;
        for (let i = 0; i < 6; i++) {
          const c = smallCenters[i];
          const vy = c.y - pivotY;
          if (vy < minVy) {
            minVy = vy;
            headIndex = i;
          }
        }
        const tailIndex = (headIndex + 3) % 6;

        // Draw head + other petals (outlines only), under cells
        for (let i = 0; i < smallCenters.length; i++) {
          if (i === tailIndex) continue;
          const c = smallCenters[i];
          const isHead = i === headIndex;
          const radius = isHead ? centerRadius : parentRadius / 9;
          drawHex(ctx, c.x, c.y, radius, 'transparent', turtleStroke, turtleLineWidth);
        }

        // Shell: filled with inventory background color to occlude inner hexes
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate((30 * Math.PI) / 180 + rotationRad);
        drawHex(ctx, 0, 0, shellRadius, invBgShellColor, turtleStroke, turtleLineWidth);
        ctx.restore();

        const activeGrid = gameState.inventoryGrid;
        
        for (const cell of activeGrid.values()) {
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          
          let fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
          drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, 'transparent', 0);
        }
      } else {
        // World mode: draw normal grid
        const activeGrid = gameState.grid;
        for (const cell of activeGrid.values()) {
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          let fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
          drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, 'transparent', 0);
        }
      }

      // Draw grid corner dots (for world or inventory) AFTER turtle/background so dots stay visible
      {
        const activeGrid = isInventory ? gameState.inventoryGrid : gameState.grid;
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
      }

      // Tutorial target cells: blinking corner dots (only unvisited)
      if (!isInventory && tutorialTargetCells.length > 0) {
        for (const cell of tutorialTargetCells) {
          const cellKey = `${cell.q},${cell.r}`;
          if (visitedTutorialCells.has(cellKey)) continue; // Skip visited cells
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          drawCornerDots(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick);
        }
      }

      // Turtle (world): head faces focus
      if (!isInventory) {
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
          const baseColor = params.ColorPalette[params.PlayerBaseColorIndex] || '#FFFFFF';

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

      // Hotbar ring (mirrored based on handedness) - 6 slots with ACT in center
      if (!isInventory && !hideHotbar) {
        const margin = 90;
        const inward = canvas.width * 0.03;
        const baseY = canvas.height - margin;
        const hotbarCenterX = isLeftHanded ? margin + inward : canvas.width - margin - inward;
        const hotbarCenterY = baseY;
        const hotbarHexSize = HOTBAR_HEX_SIZE;
        const hotbarRingRadius = hotbarHexSize * HOTBAR_RING_RADIUS_MULT;

        // Determine ACT button text based on focus cell
        const focusKey = `${gameState.focus.q},${gameState.focus.r}`;
        const focusCell = gameState.grid.get(focusKey);
        const focusHasHex = focusCell && focusCell.colorIndex !== null;
        const actText = focusHasHex ? 'DROP' : 'SPAWN';

        // Draw ACT button in center with rotating animation
        drawHex(
          ctx,
          hotbarCenterX,
          hotbarCenterY,
          hotbarHexSize,
          'rgba(255,255,255,0.95)',
          'transparent',
          3,
        );
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(actText, hotbarCenterX, hotbarCenterY + 1);
        
        // Draw rotation animation on ACT button
        drawRotatingOppositeFaces(ctx, hotbarCenterX, hotbarCenterY, hotbarHexSize, gameState.tick, '#FFFFFF');

        // Draw 6 hotbar slots in a ring with command labels
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
          const angle = (Math.PI / 3) * slotIndex - 3 * Math.PI / 6; // 60 degrees apart
          const slotX = hotbarCenterX + hotbarRingRadius * Math.cos(angle);
          const slotY = hotbarCenterY + hotbarRingRadius * Math.sin(angle);

          const colorIndex = gameState.hotbarSlots[slotIndex];
          const isEmpty = colorIndex === null || colorIndex === undefined;
          const fill = !isEmpty ? params.ColorPalette[colorIndex] : 'transparent';
          
          drawHex(ctx, slotX, slotY, hotbarHexSize, fill, 'rgba(255,255,255,0.5)', 1.5);

          // Determine command text for this slot
          let commandText = '';
          if (isEmpty && focusHasHex) {
            commandText = 'EAT';
          } else if (!isEmpty && focusHasHex) {
            commandText = 'SWAP';
          } else if (!isEmpty && !focusHasHex) {
            commandText = 'PUT';
          }

          // Draw command text
          if (commandText) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(commandText, slotX, slotY);
          }
        }
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

      // Render template overlay if active
      renderTemplateOverlay(ctx, gameState, params, centerX, centerY, gameState.tick, scale);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (showFPS) {
        ctx.fillText(`FPS: ${fps}`, canvas.width / 2, canvas.height - 4);
      }
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
      
      // Check if click is on hotbar slot first
      const hotbarSlotIdx = detectHotbarSlotClick(x, y);
      if (hotbarSlotIdx !== null && onHotbarSlotClick) {
        onHotbarSlotClick(hotbarSlotIdx);
        return;
      }
      
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
    <div ref={canvasContainerRef} className="game-field" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <ColorPaletteWidget
        colorPalette={params.ColorPalette}
        focusColorIndex={
          gameState.grid.get(`${gameState.focus.q},${gameState.focus.r}`)?.colorIndex ?? params.PlayerBaseColorIndex
        }
      />
    </div>
  );
};

export default GameField;
