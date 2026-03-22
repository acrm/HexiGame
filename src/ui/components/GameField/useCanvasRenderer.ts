/**
 * useCanvasRenderer — Canvas render loop extraction for GameField.
 *
 * Handles:
 *  - World/inventory camera and scaling
 *  - Turtle, grid, overlays, breadcrumbs and hotbar rendering
 *  - Template overlay rendering
 *  - FPS tracking
 *
 * Extracted from GameField.tsx (2026-03-07).
 */

import { useEffect, useRef } from 'react';
import type { Params } from '../../../gameLogic/core/params';
import type { GameState, Axial } from '../../../gameLogic/core/types';
import { computeBreadcrumbs } from '../../../gameLogic/systems/movement';
import { axialDistance } from '../../../gameLogic/core/grid';
import { renderTemplateOverlay } from '../TemplateRenderer';
import {
  drawHex,
  drawCornerDots,
  drawHighlightDotsAtPositions,
  drawFrozenFocus,
  drawRotatingOppositeFaces,
} from './drawingUtils';
import {
  HEX_SIZE,
  hexToPixel,
  getHotbarGeometry,
  calculateDistanceToBoundary,
  calculateHighlightDotCount,
  getFieldCenterScreenPosition,
  computeVisibleFieldBoundaryVertices,
  selectBoundaryHighlightVertices,
} from './geometryUtils';

const GRID_STROKE_COLOR = '#635572ff';

function shouldDrawWorldFocusOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && !isTurtleMoving && !hasAutoFocusTarget;
}

function shouldDrawAutoFocusTargetOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && isTurtleMoving && hasAutoFocusTarget;
}

function isAutoMoveInProgress(protagonist: Axial, autoFocusTarget?: Axial | null): boolean {
  if (!autoFocusTarget) return false;
  return axialDistance(protagonist, autoFocusTarget) > 1;
}

export interface UseCanvasRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  gameState: GameState;
  params: Params;
  fps: number;
  setFps: (fps: number) => void;
  showFPS: boolean;
  isInventory: boolean;
  hideHotbar: boolean;
  isLeftHanded: boolean;
  highlightTargets: Axial[];
  visitedHighlightTargets: Set<string>;
  scaleRef: React.MutableRefObject<number>;
  centerXRef: React.MutableRefObject<number>;
  centerYRef: React.MutableRefObject<number>;
}

export function useCanvasRenderer(options: UseCanvasRendererOptions): void {
  const {
    canvasRef,
    canvasContainerRef,
    gameState,
    params,
    fps,
    setFps,
    showFPS,
    isInventory,
    hideHotbar,
    isLeftHanded,
    highlightTargets,
    visitedHighlightTargets,
    scaleRef,
    centerXRef,
    centerYRef,
  } = options;

  const frameCounterRef = useRef({ last: performance.now(), frames: 0 });

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

      const padding = 12;
      const scale = Math.min(
        (availableWidth - padding * 2) / worldLogicalWidth,
        (availableHeight - padding * 2) / worldLogicalHeight,
      );

      canvas.width = Math.max(1, Math.floor(availableWidth));
      canvas.height = Math.max(1, Math.floor(availableHeight));
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = isInventory
        ? canvas.width / 2 - ((activeMinX + activeMaxX) / 2) * scale
        : canvas.width / 2 - hexToPixel(worldViewCenter.q, worldViewCenter.r).x * scale;

      const centerY = isInventory
        ? canvas.height / 2 - ((activeMinY + activeMaxY) / 2) * scale
        : canvas.height / 2 - hexToPixel(worldViewCenter.q, worldViewCenter.r).y * scale;

      const fieldCenter = getFieldCenterScreenPosition(worldViewCenter, scale, centerX, centerY);
      const visibleBoundaryVertices = computeVisibleFieldBoundaryVertices(
        worldViewCenter,
        visibleRadius,
        scale,
        centerX,
        centerY,
      );
      const boundaryVertexKeySet = new Set(visibleBoundaryVertices.map(vertex => vertex.key));
      const renderedBoundaryVertices: Array<{ x: number; y: number; key: string; angle: number }> = [];

      scaleRef.current = scale;
      centerXRef.current = centerX;
      centerYRef.current = centerY;

      const protagonistCell = gameState.protagonist;
      const focusCell = gameState.focus;
      const isTurtleMoving = isAutoMoveInProgress(protagonistCell, gameState.autoFocusTarget);

      if (isInventory) {
        const INV_TURTLE_SCALE = 12.0;
        const INV_TURTLE_MARGIN_HEX = -6;

        const invBgShellColor = '#570546ff';
        const baseColor = params.ColorPalette[params.PlayerBaseColorIndex] || '#FFFFFF';

        const pivotX = centerX;
        const pivotY = centerY + (activeMaxY + HEX_SIZE * INV_TURTLE_MARGIN_HEX) * scale;

        const parentRadius = HEX_SIZE * scale * INV_TURTLE_SCALE;
        const centerRadius = parentRadius / 3;
        const shellRadius = parentRadius / Math.sqrt(3);
        const turtleStroke = '#FFFFFF';
        const turtleLineWidth = 0.1 * scale;

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

        for (let i = 0; i < smallCenters.length; i++) {
          if (i === tailIndex) continue;
          const c = smallCenters[i];
          const isHead = i === headIndex;
          const radius = isHead ? centerRadius : parentRadius / 9;
          drawHex(ctx, c.x, c.y, radius, 'transparent', turtleStroke, turtleLineWidth);
        }

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate((30 * Math.PI) / 180 + rotationRad);
        drawHex(ctx, 0, 0, shellRadius, invBgShellColor, turtleStroke, turtleLineWidth);
        ctx.restore();

        for (const cell of gameState.inventoryGrid.values()) {
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          const fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
          drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, 'transparent', 0);
        }
      } else {
        for (const cell of worldVisibleCells) {
          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          const fill = cell.colorIndex !== null ? params.ColorPalette[cell.colorIndex] : 'transparent';
          drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, fill, 'transparent', 0);
        }
      }

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

            if (!isInventory && boundaryVertexKeySet.has(key)) {
              renderedBoundaryVertices.push({
                x: vx,
                y: vy,
                key,
                angle: Math.atan2(vy - fieldCenter.y, vx - fieldCenter.x),
              });
            }
          }
        }
      }

      const highlightBoundaryVertices = renderedBoundaryVertices.length > 0
        ? renderedBoundaryVertices
        : visibleBoundaryVertices;

      if (!isInventory && highlightTargets.length > 0) {
        for (const cell of highlightTargets) {
          const cellKey = `${cell.q},${cell.r}`;
          if (visitedHighlightTargets.has(cellKey)) continue;

          const pos = hexToPixel(cell.q, cell.r);
          const scaledX = centerX + pos.x * scale;
          const scaledY = centerY + pos.y * scale;
          const isInsideVisibleField = axialDistance(cell, worldViewCenter) <= visibleRadius;

          if (isInsideVisibleField) {
            // Draw all 6 corner dots as normal
            drawCornerDots(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick);
          } else {
            const distToBoundary = calculateDistanceToBoundary(cell, worldViewCenter, visibleRadius);
            const dotCount = calculateHighlightDotCount(distToBoundary, visibleRadius);
            const boundaryDots = selectBoundaryHighlightVertices(
              highlightBoundaryVertices,
              fieldCenter,
              { x: scaledX, y: scaledY },
              HEX_SIZE * scale,
              dotCount,
            );

            drawHighlightDotsAtPositions(ctx, boundaryDots, gameState.tick, {
              color: '255, 255, 255',
              dotRadius: Math.max(1.8, scale * 0.16),
              alphaOn: 1,
              alphaOff: 0.8,
              glowBlur: Math.max(4, scale * 1.8),
            });
          }
        }
      }

      if (!isInventory) {
        const pivotPos = hexToPixel(protagonistCell.q, protagonistCell.r);
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

        const smallCenters: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 180) * (60 * i - 30);
          const ringRadius = centerRadius * 2.05;
          smallCenters.push({
            x: pivotX + ringRadius * Math.cos(ang),
            y: pivotY + ringRadius * Math.sin(ang),
          });
        }

        let headIndex = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < 6; i++) {
          const c = smallCenters[i];
          const px = c.x - pivotX;
          const py = c.y - pivotY;
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
            const hx2 = c.x - pivotX;
            const hy2 = c.y - pivotY;
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

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate((30 * Math.PI) / 180);
        drawHex(ctx, 0, 0, shellRadius, baseColor, '#FFFFFF', 0.8 * scale);
        ctx.restore();
      }

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

      if (!isInventory && !hideHotbar) {
        const {
          centerX: hotbarCenterX,
          centerY: hotbarCenterY,
          hexSize: hotbarHexSize,
          ringRadius: hotbarRingRadius,
        } = getHotbarGeometry(canvas, isLeftHanded);

        const focusKey = `${gameState.focus.q},${gameState.focus.r}`;
        const focusCellData = gameState.grid.get(focusKey);
        const focusHasHex = focusCellData && focusCellData.colorIndex !== null;
        const actText = focusHasHex ? 'DROP' : 'SPAWN';

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

        drawRotatingOppositeFaces(ctx, hotbarCenterX, hotbarCenterY, hotbarHexSize, gameState.tick, '#FFFFFF');

        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
          const angle = (Math.PI / 3) * slotIndex - 3 * Math.PI / 6;
          const slotX = hotbarCenterX + hotbarRingRadius * Math.cos(angle);
          const slotY = hotbarCenterY + hotbarRingRadius * Math.sin(angle);

          const colorIndex = gameState.hotbarSlots[slotIndex];
          const isEmpty = colorIndex === null || colorIndex === undefined;
          const fill = !isEmpty ? params.ColorPalette[colorIndex] : 'transparent';

          drawHex(ctx, slotX, slotY, hotbarHexSize, fill, 'rgba(255,255,255,0.5)', 1.5);

          let commandText = '';
          if (isEmpty && focusHasHex) {
            commandText = 'EAT';
          } else if (!isEmpty && focusHasHex) {
            commandText = 'SWAP';
          } else if (!isEmpty && !focusHasHex) {
            commandText = 'PUT';
          }

          if (commandText) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(commandText, slotX, slotY);
          }
        }
      }

      const frameData = frameCounterRef.current;
      frameData.frames++;
      const now = performance.now();
      if (now - frameData.last >= 1000) {
        setFps(frameData.frames);
        frameData.frames = 0;
        frameData.last = now;
      }

      renderTemplateOverlay(ctx, gameState, params, centerX, centerY, gameState.tick, scale);

      const drawFocusOverlay = shouldDrawWorldFocusOverlay(isInventory, Boolean(isTurtleMoving), Boolean(gameState.autoFocusTarget));
      if (drawFocusOverlay) {
        const pos = hexToPixel(focusCell.q, focusCell.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        drawRotatingOppositeFaces(ctx, scaledX, scaledY, HEX_SIZE * scale, gameState.tick, '#FFFFFF');
      }

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

      const drawAutoFocusTarget = shouldDrawAutoFocusTargetOverlay(isInventory, Boolean(isTurtleMoving), Boolean(gameState.autoFocusTarget));
      if (drawAutoFocusTarget && gameState.autoFocusTarget) {
        const pos = hexToPixel(gameState.autoFocusTarget.q, gameState.autoFocusTarget.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        drawFrozenFocus(ctx, scaledX, scaledY, HEX_SIZE * scale, '#FFFFFF');
      }

      if (!isInventory && gameState.invalidMoveTarget) {
        const pos = hexToPixel(gameState.invalidMoveTarget.position.q, gameState.invalidMoveTarget.position.r);
        const scaledX = centerX + pos.x * scale;
        const scaledY = centerY + pos.y * scale;
        ctx.save();
        ctx.globalAlpha = 0.9;
        drawHex(ctx, scaledX, scaledY, HEX_SIZE * scale, 'transparent', '#ff4d4d', 1.2 * scale);
        ctx.restore();
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
  }, [
    canvasRef,
    canvasContainerRef,
    gameState,
    params,
    fps,
    setFps,
    showFPS,
    isInventory,
    hideHotbar,
    isLeftHanded,
    highlightTargets,
    visitedHighlightTargets,
    scaleRef,
    centerXRef,
    centerYRef,
  ]);
}
