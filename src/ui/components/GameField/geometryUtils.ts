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

const SCREEN_VERTEX_KEY_PRECISION = 100;

function axialDistanceLocal(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs((a.q + a.r) - (b.q + b.r))) / 2;
}

export function createScreenVertexKey(x: number, y: number): string {
  return `${Math.round(x * SCREEN_VERTEX_KEY_PRECISION)}:${Math.round(y * SCREEN_VERTEX_KEY_PRECISION)}`;
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

function getTargetFacingEdgePoints(
  fieldCenter: { x: number; y: number },
  targetScreen: { x: number; y: number },
  targetHexRadius: number,
): {
  edgeStart: { x: number; y: number };
  edgeEnd: { x: number; y: number };
  edgeMidpoint: { x: number; y: number };
} {
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
    edgeStart: startVertex,
    edgeEnd: endVertex,
    edgeMidpoint: { x: midpointX, y: midpointY },
  };
}

function sortBoundaryVerticesAroundCenter(
  boundaryVertices: ScreenBoundaryVertex[],
  fieldCenter: { x: number; y: number },
): ScreenBoundaryVertex[] {
  return [...boundaryVertices]
    .map((vertex) => ({
      ...vertex,
      angle: Math.atan2(vertex.y - fieldCenter.y, vertex.x - fieldCenter.x),
    }))
    .sort((a, b) => a.angle - b.angle);
}

function getClosestPointOnSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  const abx = end.x - start.x;
  const aby = end.y - start.y;
  const abLengthSq = abx * abx + aby * aby;
  if (abLengthSq <= 1e-9) {
    return { x: start.x, y: start.y };
  }

  const apx = point.x - start.x;
  const apy = point.y - start.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLengthSq));
  return {
    x: start.x + abx * t,
    y: start.y + aby * t,
  };
}

function findClosestBoundarySegmentIndex(
  boundaryVertices: ScreenBoundaryVertex[],
  point: { x: number; y: number },
): number {
  let bestIndex = 0;
  let bestDistSq = Infinity;

  for (let i = 0; i < boundaryVertices.length; i++) {
    const segmentStart = boundaryVertices[i];
    const segmentEnd = boundaryVertices[(i + 1) % boundaryVertices.length];
    if (!segmentStart || !segmentEnd) continue;

    const closestPoint = getClosestPointOnSegment(point, segmentStart, segmentEnd);
    const dx = point.x - closestPoint.x;
    const dy = point.y - closestPoint.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function findClosestBoundaryVertexToPoint(
  boundaryVertices: ScreenBoundaryVertex[],
  point: { x: number; y: number },
): { vertex: ScreenBoundaryVertex; distanceSq: number } | null {
  let bestVertex: ScreenBoundaryVertex | null = null;
  let bestDistanceSq = Infinity;

  for (const vertex of boundaryVertices) {
    const dx = point.x - vertex.x;
    const dy = point.y - vertex.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestVertex = vertex;
    }
  }

  return bestVertex ? { vertex: bestVertex, distanceSq: bestDistanceSq } : null;
}

function selectBoundaryVerticesByClosestSegment(
  boundaryVertices: ScreenBoundaryVertex[],
  fieldCenter: { x: number; y: number },
  targetScreen: { x: number; y: number },
  targetHexRadius: number,
  dotCount: number,
): Array<{ x: number; y: number }> {
  const sortedBoundary = sortBoundaryVerticesAroundCenter(boundaryVertices, fieldCenter);
  const targetFace = getTargetFacingEdgePoints(fieldCenter, targetScreen, targetHexRadius);
  const selectedDots: Array<{ x: number; y: number }> = [];
  const usedKeys = new Set<string>();

  const pushUniqueVertex = (vertex: ScreenBoundaryVertex | undefined) => {
    if (!vertex || usedKeys.has(vertex.key)) return;
    usedKeys.add(vertex.key);
    selectedDots.push({ x: vertex.x, y: vertex.y });
  };

  const segmentIndex = findClosestBoundarySegmentIndex(sortedBoundary, targetFace.edgeMidpoint);
  const segmentStart = sortedBoundary[segmentIndex];
  const segmentEnd = sortedBoundary[(segmentIndex + 1) % sortedBoundary.length];
  if (!segmentStart || !segmentEnd) return [];

  const distStartSq = (segmentStart.x - targetFace.edgeMidpoint.x) ** 2 + (segmentStart.y - targetFace.edgeMidpoint.y) ** 2;
  const distEndSq = (segmentEnd.x - targetFace.edgeMidpoint.x) ** 2 + (segmentEnd.y - targetFace.edgeMidpoint.y) ** 2;
  const primary = distStartSq <= distEndSq ? segmentStart : segmentEnd;
  const secondary = distStartSq <= distEndSq ? segmentEnd : segmentStart;

  pushUniqueVertex(primary);
  if (dotCount >= 2) {
    pushUniqueVertex(secondary);
  }

  if (dotCount >= 3) {
    const prevVertex = sortedBoundary[(segmentIndex - 1 + sortedBoundary.length) % sortedBoundary.length];
    const nextVertex = sortedBoundary[(segmentIndex + 2) % sortedBoundary.length];
    const distA = prevVertex
      ? (prevVertex.x - targetFace.edgeMidpoint.x) ** 2 + (prevVertex.y - targetFace.edgeMidpoint.y) ** 2
      : Infinity;
    const distB = nextVertex
      ? (nextVertex.x - targetFace.edgeMidpoint.x) ** 2 + (nextVertex.y - targetFace.edgeMidpoint.y) ** 2
      : Infinity;
    pushUniqueVertex(distA <= distB ? prevVertex : nextVertex);
  }

  return selectedDots.slice(0, dotCount);
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
  turtleAxial: { q: number; r: number },
  targetAxial: { q: number; r: number },
  worldViewCenter: { q: number; r: number },
  visibleRadius: number,
  scale: number,
  centerX: number,
  centerY: number,
): Array<{ x: number; y: number }> {
  if (boundaryVertices.length === 0) return [];

  const boundaryByKey = new Map<string, ScreenBoundaryVertex>();
  for (const vertex of boundaryVertices) {
    boundaryByKey.set(vertex.key, vertex);
  }

  function buildHexPathIgnoringObstacles(start: { q: number; r: number }, end: { q: number; r: number }): Array<{ q: number; r: number }> {
    const distance = axialDistanceLocal(start, end);
    if (distance <= 0) return [{ q: start.q, r: start.r }];

    const result: Array<{ q: number; r: number }> = [{ q: start.q, r: start.r }];
    let current = { q: start.q, r: start.r };

    // No obstacles: shortest path can be built greedily by stepping to any neighbor
    // that strictly decreases hex distance to the target.
    const maxSteps = distance + 4;
    for (let step = 0; step < maxSteps; step++) {
      if (current.q === end.q && current.r === end.r) {
        break;
      }

      const currentDistance = axialDistanceLocal(current, end);
      let bestNeighbor: { q: number; r: number } | null = null;
      let bestDistance = currentDistance;

      for (const dir of AXIAL_DIRECTIONS) {
        const neighbor = { q: current.q + dir.q, r: current.r + dir.r };
        const neighborDistance = axialDistanceLocal(neighbor, end);
        if (neighborDistance < bestDistance) {
          bestDistance = neighborDistance;
          bestNeighbor = neighbor;
        }
      }

      if (!bestNeighbor) {
        break;
      }

      current = bestNeighbor;
      result.push(current);
    }

    return result;
  }

  function getBoundaryCornersForCell(cell: { q: number; r: number }): Array<{ x: number; y: number }> {
    const pos = hexToPixel(cell.q, cell.r);
    const cellCenterX = centerX + pos.x * scale;
    const cellCenterY = centerY + pos.y * scale;
    const cellCorners = computeHexScreenVertices(cellCenterX, cellCenterY, HEX_SIZE * scale);
    const unique = new Set<string>();
    const result: Array<{ x: number; y: number }> = [];

    for (const corner of cellCorners) {
      const key = createScreenVertexKey(corner.x, corner.y);
      if (unique.has(key)) continue;
      const boundaryVertex = boundaryByKey.get(key);
      if (!boundaryVertex) continue;
      unique.add(key);
      result.push({ x: boundaryVertex.x, y: boundaryVertex.y });
    }

    return result;
  }

  const path = buildHexPathIgnoringObstacles(turtleAxial, targetAxial);
  for (let i = path.length - 1; i >= 0; i--) {
    const cell = path[i];
    if (!cell) continue;
    if (axialDistanceLocal(cell, worldViewCenter) > visibleRadius) continue;

    const boundaryCorners = getBoundaryCornersForCell(cell);
    if (boundaryCorners.length > 0) {
      return boundaryCorners;
    }
  }

  return [];
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
 * - Partially visible (distance > 0): show 3 dots
 * - Far away: show 2 dots
 */
export function calculateHighlightDotCount(distanceToBoundary: number, visibleRadius: number): number {
  const visibleFieldDiameter = Math.max(2, visibleRadius * 2 + 1);
  const nearBoundaryThreshold = Math.max(1, Math.round(visibleFieldDiameter / 2));

  if (distanceToBoundary <= 0) {
    return 6; // Fully visible, all corners
  } else if (distanceToBoundary <= nearBoundaryThreshold) {
    return 3; // Close to boundary, 3 dots
  } else {
    return 2; // Far away, 2 dots
  }
}
