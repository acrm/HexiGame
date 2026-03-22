/**
 * Drawing utilities for GameField canvas rendering
 */

// Draw single hex on canvas
export function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
  lineWidth = 2,
) {
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
export function computeEdgeIndexForFocusCell(tickCount: number, edgesPerCycle = 6) {
  // 1 edge rotates every 4 ticks, so cycle = 6 * 4 = 24 ticks
  const cycleLength = edgesPerCycle * 1;
  const phase = (tickCount % cycleLength) / cycleLength;
  return Math.floor(phase * edgesPerCycle) % edgesPerCycle;
}

// Compute flicker alpha (oscillates 0..1 with period)
export function computeFlickerAlpha(tickCount: number, period: number = 8): number {
  const phase = (tickCount % period) / period;
  // Flicker: 0 to 1 to 0 over period
  return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
}

// Draw frozen focus with three static edges (no rotation, no flicker)
export function drawFrozenFocus(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string,
) {
  drawEdgeHighlight(ctx, centerX, centerY, 0, size, color);
  drawEdgeHighlight(ctx, centerX, centerY, 2, size, color);
  drawEdgeHighlight(ctx, centerX, centerY, 4, size, color);
}

// Draw two opposite rotating edges (edges 0 and 3 at cycle start)
export function drawRotatingOppositeFaces(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  tickCount: number,
  color: string,
) {
  const currentEdge = computeEdgeIndexForFocusCell(tickCount, 6);
  const oppositeEdge = (currentEdge + 3) % 6;

  // Draw current rotating edge
  drawEdgeHighlight(ctx, centerX, centerY, currentEdge, size, color);
  // Draw opposite edge (always opposite)
  drawEdgeHighlight(ctx, centerX, centerY, oppositeEdge, size, color);
}

export function drawEdgeHighlight(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  edge: number,
  size: number,
  color: string,
) {
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
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Draw 5-pointed star
export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
  color: string,
) {
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

export function drawCornerDots(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  tickCount: number,
) {
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

export function drawHighlightDotsAtPositions(
  ctx: CanvasRenderingContext2D,
  dots: Array<{ x: number; y: number }>,
  tickCount: number,
  options?: {
    color?: string;
    dotRadius?: number;
    alphaOn?: number;
    alphaOff?: number;
    glowBlur?: number;
  },
) {
  if (dots.length === 0) return;

  const blinkOn = (tickCount % 12) < 6;
  const alphaOn = options?.alphaOn ?? 1;
  const alphaOff = options?.alphaOff ?? 0.35;
  const alpha = blinkOn ? alphaOn : alphaOff;
  const dotRadius = options?.dotRadius ?? 3;
  const color = options?.color ?? '255, 200, 100';
  const glowBlur = options?.glowBlur ?? 0;

  ctx.save();
  if (glowBlur > 0) {
    ctx.shadowBlur = glowBlur;
    ctx.shadowColor = `rgba(${color}, ${Math.min(1, alpha * 0.95)})`;
  }
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draw highlight dots on screen boundary for off-screen target
 * dotCount determines how many dots to draw
 * Dots are clamped to stay within canvas bounds
 */
export function drawBoundaryHighlightDots(
  ctx: CanvasRenderingContext2D,
  boundaryX: number,
  boundaryY: number,
  boundaryMarginPx: number,
  dotCount: number,
  tickCount: number,
  options?: {
    side?: 'top' | 'bottom' | 'left' | 'right';
    bounds?: { left: number; right: number; top: number; bottom: number };
  },
) {
  const blinkOn = (tickCount % 12) < 6;
  const alpha = blinkOn ? 1 : 0.35;
  const dotRadius = 3;

  if (dotCount === 0) return;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const left = options?.bounds?.left ?? 0;
  const right = options?.bounds?.right ?? canvasWidth;
  const top = options?.bounds?.top ?? 0;
  const bottom = options?.bounds?.bottom ?? canvasHeight;

  const clampX = (x: number) => Math.max(left, Math.min(right, x));
  const clampY = (y: number) => Math.max(top, Math.min(bottom, y));

  ctx.save();
  ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;

  // Distribute dots along the boundary
  // Single dot or two dots will be placed strategically
  const dots: { x: number; y: number }[] = [];

  if (dotCount === 1) {
    dots.push({
      x: clampX(boundaryX),
      y: clampY(boundaryY),
    });
  } else if (dotCount === 2) {
    // Two dots, slightly offset perpendicular to boundary
    // Determine if boundary is horizontal or vertical
    const isVertical = options?.side
      ? options.side === 'left' || options.side === 'right'
      : (boundaryX <= left + 0.5 || boundaryX >= right - 0.5);
    if (isVertical) {
      // Vertical boundary, offset vertically (keep X on boundary)
      dots.push({
        x: clampX(boundaryX),
        y: clampY(boundaryY - boundaryMarginPx),
      });
      dots.push({
        x: clampX(boundaryX),
        y: clampY(boundaryY + boundaryMarginPx),
      });
    } else {
      // Horizontal boundary, offset horizontally (keep Y on boundary)
      dots.push({
        x: clampX(boundaryX - boundaryMarginPx),
        y: clampY(boundaryY),
      });
      dots.push({
        x: clampX(boundaryX + boundaryMarginPx),
        y: clampY(boundaryY),
      });
    }
  }

  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
