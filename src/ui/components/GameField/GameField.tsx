import React, { useEffect, useRef } from 'react';
import type { Params } from '../../../gameLogic/core/params';
import type { GameState, Axial } from '../../../gameLogic/core/types';
import { computeBreadcrumbs } from '../../../gameLogic/systems/movement';
import { axialDistance } from '../../../gameLogic/core/grid';
import { renderTemplateOverlay } from '../TemplateRenderer';
import ColorPaletteWidget from '../ColorPaletteWidget';
import {
  drawHex,
  drawCornerDots,
  drawFrozenFocus,
  drawRotatingOppositeFaces,
  drawEdgeHighlight,
} from './drawingUtils';
import {
  HEX_SIZE,
  hexToPixel,
  getHotbarGeometry,
} from './geometryUtils';
import { useViewport } from './useViewport';
import { useTouchInput } from './useTouchInput';
import { useMouseInput } from './useMouseInput';

const GRID_STROKE_COLOR = '#635572ff';

export function shouldDrawWorldFocusOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && !isTurtleMoving && !hasAutoFocusTarget;
}

export function shouldDrawAutoFocusTargetOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && isTurtleMoving && hasAutoFocusTarget;
}

export function isAutoMoveInProgress(protagonist: Axial, autoFocusTarget?: Axial | null): boolean {
  if (!autoFocusTarget) return false;
  return axialDistance(protagonist, autoFocusTarget) > 1;
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
  paletteTopOffset?: number;
  selectedColorIndex?: number;
  relativeBaseColorIndex?: number | null;
  isAutoBaseColorEnabled?: boolean;
  onColorSelect?: (index: number) => void;
  onToggleAutoBaseColor?: () => void;
  onNavigateToPalette?: () => void;
  showColorWidget?: boolean;
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
  paletteTopOffset = 8,
  selectedColorIndex,
  relativeBaseColorIndex,
  isAutoBaseColorEnabled = false,
  onColorSelect,
  onToggleAutoBaseColor,
  onNavigateToPalette,
  showColorWidget = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const frameCounterRef = useRef({ last: performance.now(), frames: 0 });

  // Viewport management (scale, centerX, centerY)
  const viewport = useViewport({
    canvasRef,
    isInventory,
    hideHotbar,
    isLeftHanded,
  });
  const { scaleRef, centerXRef, centerYRef, pixelToAxial, detectHotbarSlotClick } = viewport;

  // Touch input handling
  useTouchInput({
    canvasRef,
    gameState,
    isInventory,
    hideHotbar,
    isLeftHanded,
    pixelToAxial,
    detectHotbarSlotClick,
    onHotbarSlotClick,
    onCapture,
    onRelease,
    onCellClickDown,
  });

  // Mouse input handling
  useMouseInput({
    canvasRef,
    pixelToAxial,
    detectHotbarSlotClick,
    onSetCursor,
    onCellClickDown,
    onCellClickUp,
    onCellDrag,
    onHotbarSlotClick,
  });

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

      const worldViewCenter = gameState.worldViewCenter ?? gameState.protagonist;
      const visibleRadius = Math.max(1, params.GridRadius);
      const worldVisibleCells = Array.from(gameState.grid.values()).filter(
        cell => axialDistance({ q: cell.q, r: cell.r }, worldViewCenter) <= visibleRadius,
      );

      // Fixed logical world window (radius R) for stable camera scale in infinite world mode
      let worldMinX = Infinity;
      let worldMaxX = -Infinity;
      let worldMinY = Infinity;
      let worldMaxY = -Infinity;
      for (let q = -visibleRadius; q <= visibleRadius; q++) {
        for (let r = -visibleRadius; r <= visibleRadius; r++) {
          if (axialDistance({ q: 0, r: 0 }, { q, r }) > visibleRadius) continue;
          const pos = hexToPixel(q, r);
          const x = pos.x;
          const y = pos.y;
          const halfW = HEX_SIZE * 1.0;
          const halfH = HEX_SIZE * Math.sqrt(3) * 0.5;
          worldMinX = Math.min(worldMinX, x - halfW);
          worldMaxX = Math.max(worldMaxX, x + halfW);
          worldMinY = Math.min(worldMinY, y - halfH);
          worldMaxY = Math.max(worldMaxY, y + halfH);
        }
      }

      const worldLogicalWidth = worldMaxX - worldMinX;
      const worldLogicalHeight = worldMaxY - worldMinY;

      // Compute active grid bounds for inventory; world uses camera center instead
      const activeBoundsGrid = isInventory ? gameState.inventoryGrid : null;
      let activeMinX = Infinity;
      let activeMaxX = -Infinity;
      let activeMinY = Infinity;
      let activeMaxY = -Infinity;
      if (activeBoundsGrid) {
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

      const centerX = isInventory
        ? canvas.width / 2 - ((activeMinX + activeMaxX) / 2) * scale
        : canvas.width / 2 - hexToPixel(worldViewCenter.q, worldViewCenter.r).x * scale;
      // Always center vertically for both world and inventory
      const centerY = isInventory
        ? canvas.height / 2 - ((activeMinY + activeMaxY) / 2) * scale
        : canvas.height / 2 - hexToPixel(worldViewCenter.q, worldViewCenter.r).y * scale;
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
      const isTurtleMoving = isAutoMoveInProgress(protagonistCell, gameState.autoFocusTarget);

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
        for (const cell of worldVisibleCells) {
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          let fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
          drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, 'transparent', 0);
        }
      }

      // Draw grid corner dots (for world or inventory) AFTER turtle/background so dots stay visible
      {
        const activeGridValues = isInventory ? Array.from(gameState.inventoryGrid.values()) : worldVisibleCells;
        ctx.fillStyle = GRID_STROKE_COLOR;
        const dotRadius = 1.2 * scale;
        const seenVertices = new Set<string>();
        const emptyCells = activeGridValues.filter(c => c.colorIndex === null);
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
            for (const other of activeGridValues) {
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
        const {
          centerX: hotbarCenterX,
          centerY: hotbarCenterY,
          hexSize: hotbarHexSize,
          ringRadius: hotbarRingRadius,
        } = getHotbarGeometry(canvas, isLeftHanded);

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

      // === DRAW FOCUS AND PATH MARKERS ON TOP OF EVERYTHING ===
      const drawFocusOverlay = shouldDrawWorldFocusOverlay(isInventory, Boolean(isTurtleMoving), Boolean(gameState.autoFocusTarget));

      // Draw focus cell with rotating opposite faces ONLY when turtle is not moving and no auto-focus target exists
      if (drawFocusOverlay) {
        const pos = hexToPixel(focusCell.q, focusCell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        
        // Use game tick for animation (12 ticks/sec, 1 edge every 4 ticks)
        drawRotatingOppositeFaces(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick, '#FFFFFF');
      }

      // Draw path markers (white dots on intermediate path cells, same size as grid dots)
      if (!isInventory && gameState.autoMovePath && gameState.autoMovePath.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        const pathDotRadius = 0.8 * scale;
        gameState.autoMovePath.forEach((pathCell) => {
          const pos = hexToPixel(pathCell.q, pathCell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          ctx.beginPath();
          ctx.arc(scaledX, scaledY, pathDotRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      const drawAutoFocusTargetOverlay = shouldDrawAutoFocusTargetOverlay(isInventory, Boolean(isTurtleMoving), Boolean(gameState.autoFocusTarget));
      if (drawAutoFocusTargetOverlay && gameState.autoFocusTarget) {
        const pos = hexToPixel(gameState.autoFocusTarget.q, gameState.autoFocusTarget.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        drawFrozenFocus(ctx, scaledX, scaledY, HEX_SIZE * scale, '#FFFFFF');
      }

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

  return (
    <div ref={canvasContainerRef} className="game-field" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {showColorWidget && (
        <ColorPaletteWidget
          colorPalette={params.ColorPalette}
          selectedColorIndex={selectedColorIndex ?? params.PlayerBaseColorIndex}
          relativeBaseColorIndex={relativeBaseColorIndex ?? null}
          playerBaseColorIndex={params.PlayerBaseColorIndex}
          isAutoBaseColorEnabled={isAutoBaseColorEnabled}
          topOffset={paletteTopOffset}
          onColorSelect={onColorSelect}
          onToggleAutoBaseColor={onToggleAutoBaseColor}
          onNavigateToPalette={onNavigateToPalette}
        />
      )}
    </div>
  );
};

export default GameField;
