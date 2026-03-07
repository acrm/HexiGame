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
