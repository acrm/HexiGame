/**
 * Geometry utilities for hex grid calculations and coordinate transformations
 */

export const HEX_SIZE = 10; // pixels
export const HOTBAR_HEX_SIZE = 30;
export const HOTBAR_RING_RADIUS_MULT = 1.7;

export interface ScreenBoundaryRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ScreenBoundaryVertex {
  x: number;
  y: number;
  key: string;
  angle: number;
}

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function axialDistanceLocal(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs((a.q + a.r) - (b.q + b.r))) / 2;
}

function createScreenVertexKey(x: number, y: number): string {
  return `${Math.round(x)}:${Math.round(y)}`;
}

function normalizeAngleDiff(a: number, b: number): number {
  const raw = Math.abs(a - b) % (Math.PI * 2);
  return raw > Math.PI ? Math.PI * 2 - raw : raw;
}

function addVertex(
  map: Map<string, { x: number; y: number }>,
  x: number,
  y: number,
): void {
  const key = createScreenVertexKey(x, y);
  if (!map.has(key)) {
    map.set(key, { x, y });
  }
}

function computeHexScreenVertices(
  centerX: number,
  centerY: number,
  radius: number,
): Array<{ x: number; y: number }> {
  const vertices: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    vertices.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return vertices;
}

function findClosestBoundaryVertex(
  boundaryVertices: ScreenBoundaryVertex[],
  targetAngle: number,
  excludedKeys: Set<string>,
): ScreenBoundaryVertex | null {
  let bestVertex: ScreenBoundaryVertex | null = null;
  let bestAngleDiff = Infinity;

  for (const vertex of boundaryVertices) {
    if (excludedKeys.has(vertex.key)) continue;
    const angleDiff = normalizeAngleDiff(vertex.angle, targetAngle);
    if (angleDiff < bestAngleDiff) {
      bestVertex = vertex;
      bestAngleDiff = angleDiff;
    }
  }

  return bestVertex;
}

function getTargetFacingEdgeAngles(
  fieldCenter: { x: number; y: number },
  targetScreen: { x: number; y: number },
  targetHexRadius: number,
): { vertexAngles: [number, number]; midpointAngle: number } {
  const targetVertices = computeHexScreenVertices(targetScreen.x, targetScreen.y, targetHexRadius);
  const facingAngle = Math.atan2(fieldCenter.y - targetScreen.y, fieldCenter.x - targetScreen.x);

  let bestEdgeIndex = 0;
  let bestAngleDiff = Infinity;

  for (let i = 0; i < targetVertices.length; i++) {
    const startVertex = targetVertices[i];
    const endVertex = targetVertices[(i + 1) % targetVertices.length];
    if (!startVertex || !endVertex) continue;

    const midpointX = (startVertex.x + endVertex.x) / 2;
    const midpointY = (startVertex.y + endVertex.y) / 2;
    const edgeAngle = Math.atan2(midpointY - targetScreen.y, midpointX - targetScreen.x);
    const angleDiff = normalizeAngleDiff(edgeAngle, facingAngle);
    if (angleDiff < bestAngleDiff) {
      bestAngleDiff = angleDiff;
      bestEdgeIndex = i;
    }
  }

  const startVertex = targetVertices[bestEdgeIndex] ?? targetVertices[0]!;
  const endVertex = targetVertices[(bestEdgeIndex + 1) % targetVertices.length] ?? targetVertices[1]!;
  const midpointX = (startVertex.x + endVertex.x) / 2;
  const midpointY = (startVertex.y + endVertex.y) / 2;

  return {
    vertexAngles: [
      Math.atan2(startVertex.y - fieldCenter.y, startVertex.x - fieldCenter.x),
      Math.atan2(endVertex.y - fieldCenter.y, endVertex.x - fieldCenter.x),
    ],
    midpointAngle: Math.atan2(midpointY - fieldCenter.y, midpointX - fieldCenter.x),
  };
}

export function getFieldCenterScreenPosition(
  worldViewCenter: { q: number; r: number },
  scale: number,
  centerX: number,
  centerY: number,
): { x: number; y: number } {
  const centerWorldPos = hexToPixel(worldViewCenter.q, worldViewCenter.r);
  return {
    x: centerX + centerWorldPos.x * scale,
    y: centerY + centerWorldPos.y * scale,
  };
}

export function computeVisibleFieldBoundaryVertices(
  worldViewCenter: { q: number; r: number },
  visibleRadius: number,
  scale: number,
  centerX: number,
  centerY: number,
): ScreenBoundaryVertex[] {
  const boundaryVertexMap = new Map<string, { x: number; y: number }>();
  const vertexRadius = HEX_SIZE * scale;
  const angleStep = Math.PI / 3;
  const fieldCenter = getFieldCenterScreenPosition(worldViewCenter, scale, centerX, centerY);

  for (let dq = -visibleRadius; dq <= visibleRadius; dq++) {
    for (let dr = -visibleRadius; dr <= visibleRadius; dr++) {
      if (axialDistanceLocal({ q: 0, r: 0 }, { q: dq, r: dr }) > visibleRadius) continue;

      const absCell = { q: worldViewCenter.q + dq, r: worldViewCenter.r + dr };
      const cellPos = hexToPixel(absCell.q, absCell.r);
      const screenX = centerX + cellPos.x * scale;
      const screenY = centerY + cellPos.y * scale;

      for (let dirIndex = 0; dirIndex < AXIAL_DIRECTIONS.length; dirIndex++) {
        const dir = AXIAL_DIRECTIONS[dirIndex];
        const neighborRel = { q: dq + dir.q, r: dr + dir.r };
        const neighborInside = axialDistanceLocal({ q: 0, r: 0 }, neighborRel) <= visibleRadius;
        if (neighborInside) continue;

        const a1 = angleStep * dirIndex;
        const a2 = angleStep * ((dirIndex + 1) % 6);
        addVertex(boundaryVertexMap, screenX + vertexRadius * Math.cos(a1), screenY + vertexRadius * Math.sin(a1));
        addVertex(boundaryVertexMap, screenX + vertexRadius * Math.cos(a2), screenY + vertexRadius * Math.sin(a2));
      }
    }
  }

  return Array.from(boundaryVertexMap.entries())
    .map(([key, v]) => ({
      x: v.x,
      y: v.y,
      key,
      angle: Math.atan2(v.y - fieldCenter.y, v.x - fieldCenter.x),
    }))
    .sort((a, b) => a.angle - b.angle);
}

export function selectBoundaryHighlightVertices(
  boundaryVertices: ScreenBoundaryVertex[],
  fieldCenter: { x: number; y: number },
  targetScreen: { x: number; y: number },
  targetHexRadius: number,
  dotCount: number,
): Array<{ x: number; y: number }> {
  if (dotCount <= 0 || boundaryVertices.length === 0) return [];

  const targetFace = getTargetFacingEdgeAngles(fieldCenter, targetScreen, targetHexRadius);
  const selectedDots: Array<{ x: number; y: number }> = [];
  const usedKeys = new Set<string>();

  if (dotCount >= 2) {
    for (const targetAngle of targetFace.vertexAngles) {
      const boundaryVertex = findClosestBoundaryVertex(boundaryVertices, targetAngle, usedKeys);
      if (!boundaryVertex) continue;

      usedKeys.add(boundaryVertex.key);
      selectedDots.push({ x: boundaryVertex.x, y: boundaryVertex.y });
    }
  }

  while (selectedDots.length < dotCount) {
    const fallbackVertex = findClosestBoundaryVertex(boundaryVertices, targetFace.midpointAngle, usedKeys);
    if (!fallbackVertex) break;

    usedKeys.add(fallbackVertex.key);
    selectedDots.push({ x: fallbackVertex.x, y: fallbackVertex.y });
  }

  return selectedDots;
}

// Helper: axial -> pixel (pointy-top)
export function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * 1.5 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

export function getHotbarGeometry(canvas: HTMLCanvasElement, isLeftHanded: boolean) {
  const margin = 90;
  const inward = canvas.width * 0.03;
  const baseY = canvas.height - margin;
  const centerX = isLeftHanded ? margin + inward : canvas.width - margin - inward;
  const centerY = baseY;
  const hexSize = HOTBAR_HEX_SIZE;
  const ringRadius = hexSize * HOTBAR_RING_RADIUS_MULT;
  return { centerX, centerY, hexSize, ringRadius };
}

// Convert pixel coordinates to axial hex coordinates
export function pixelToAxial(px: number, py: number, scaleRef: { current: number }, centerXRef: { current: number }, centerYRef: { current: number }): { q: number; r: number } {
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
export function detectHotbarSlotClick(px: number, py: number, canvas: HTMLCanvasElement, isInventory: boolean, hideHotbar: boolean, isLeftHanded: boolean): number | null {
  if (isInventory || hideHotbar) return null;

  const {
    centerX: hotbarCenterX,
    centerY: hotbarCenterY,
    hexSize: hotbarHexSize,
    ringRadius: hotbarRingRadius,
  } = getHotbarGeometry(canvas, isLeftHanded);

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

/**
 * Check if a hex is fully visible on screen
 */
export function isHexFullyVisibleOnScreen(
  hexWorldPos: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  centerX: number,
  centerY: number,
  boundary?: ScreenBoundaryRect,
): boolean {
  const scaledX = centerX + hexWorldPos.x * scale;
  const scaledY = centerY + hexWorldPos.y * scale;
  const hexRadius = HEX_SIZE * scale;

  const left = boundary?.left ?? 0;
  const right = boundary?.right ?? canvasWidth;
  const top = boundary?.top ?? 0;
  const bottom = boundary?.bottom ?? canvasHeight;

  const padding = hexRadius;
  return (
    scaledX - padding >= left &&
    scaledX + padding <= right &&
    scaledY - padding >= top &&
    scaledY + padding <= bottom
  );
}

/**
 * Project hex position onto the screen boundary
 * Returns pixel coordinates of the projection point on the boundary
 */
export function projectHexOnBoundary(
  hexWorldPos: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  centerX: number,
  centerY: number,
  boundary?: ScreenBoundaryRect,
): { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  const scaledX = centerX + hexWorldPos.x * scale;
  const scaledY = centerY + hexWorldPos.y * scale;

  const left = boundary?.left ?? 0;
  const right = boundary?.right ?? canvasWidth;
  const top = boundary?.top ?? 0;
  const bottom = boundary?.bottom ?? canvasHeight;

  const centerCanvasX = (left + right) / 2;
  const centerCanvasY = (top + bottom) / 2;

  // Vector from canvas center to hex
  const dx = scaledX - centerCanvasX;
  const dy = scaledY - centerCanvasY;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    return { x: centerCanvasX, y: top, side: 'top' };
  }

  // Normalize vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Find intersection with boundary
  let projX: number;
  let projY: number;
  let side: 'top' | 'bottom' | 'left' | 'right';

  const absNx = Math.abs(nx);
  const absNy = Math.abs(ny);

  if (absNx > absNy) {
    // Intersects left or right
    projX = nx > 0 ? right : left;
    projY = centerCanvasY + ny * (projX - centerCanvasX) / nx;
    side = nx > 0 ? 'right' : 'left';
  } else {
    // Intersects top or bottom
    projY = ny > 0 ? bottom : top;
    projX = centerCanvasX + nx * (projY - centerCanvasY) / ny;
    side = ny > 0 ? 'bottom' : 'top';
  }

  return {
    x: Math.max(left, Math.min(right, projX)),
    y: Math.max(top, Math.min(bottom, projY)),
    side,
  };
}

/**
 * Calculate distance from hex to boundary in world units (considering visible radius)
 */
export function calculateDistanceToBoundary(
  hexAxial: { q: number; r: number },
  worldViewCenter: { q: number; r: number },
  visibleRadius: number,
): number {
  // Calculate distance from hex to center
  const dq = hexAxial.q - worldViewCenter.q;
  const dr = hexAxial.r - worldViewCenter.r;
  const ds = -dq - dr;

  // Cube distance (axial -> cube)
  const cubeDist = (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;

  // Distance from boundary
  const distToBoundary = Math.max(0, cubeDist - visibleRadius);
  return distToBoundary;
}

/**
 * Calculate how many highlight dots should be shown based on distance
 * - Fully visible (distance = 0): show all 6 dots
 * - Partially visible (distance > 0): show 2 dots
 * - Far away (distance > 3 * diameters): show 1 dot
 */
export function calculateHighlightDotCount(distanceToBoundary: number, visibleRadius: number): number {
  const visibleFieldDiameter = Math.max(2, visibleRadius * 2 + 1);
  const nearBoundaryThreshold = Math.max(1, Math.round(visibleFieldDiameter / 2));

  if (distanceToBoundary <= 0) {
    return 6; // Fully visible, all corners
  } else if (distanceToBoundary <= nearBoundaryThreshold) {
    return 2; // Close to boundary, 2 dots
  } else {
    return 1; // Far away, 1 dot
  }
}
