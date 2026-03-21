/**
 * Geometry utilities for hex grid calculations and coordinate transformations
 */

export const HEX_SIZE = 10; // pixels
export const HOTBAR_HEX_SIZE = 30;
export const HOTBAR_RING_RADIUS_MULT = 1.7;

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
): boolean {
  const scaledX = centerX + hexWorldPos.x * scale;
  const scaledY = centerY + hexWorldPos.y * scale;
  const hexRadius = HEX_SIZE * scale;

  const padding = hexRadius;
  return (
    scaledX - padding >= 0 &&
    scaledX + padding <= canvasWidth &&
    scaledY - padding >= 0 &&
    scaledY + padding <= canvasHeight
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
): { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' } {
  const scaledX = centerX + hexWorldPos.x * scale;
  const scaledY = centerY + hexWorldPos.y * scale;

  const halfW = canvasWidth / 2;
  const halfH = canvasHeight / 2;
  const centerCanvasX = halfW;
  const centerCanvasY = halfH;

  // Vector from canvas center to hex
  const dx = scaledX - centerCanvasX;
  const dy = scaledY - centerCanvasY;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    return { x: centerCanvasX, y: 0, side: 'top' };
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
    projX = nx > 0 ? canvasWidth : 0;
    projY = centerCanvasY + ny * (projX - centerCanvasX) / nx;
    side = nx > 0 ? 'right' : 'left';
  } else {
    // Intersects top or bottom
    projY = ny > 0 ? canvasHeight : 0;
    projX = centerCanvasX + nx * (projY - centerCanvasY) / ny;
    side = ny > 0 ? 'bottom' : 'top';
  }

  return {
    x: Math.max(0, Math.min(canvasWidth, projX)),
    y: Math.max(0, Math.min(canvasHeight, projY)),
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
export function calculateHighlightDotCount(distanceToBoundary: number): number {
  const DIAMETER_IN_HEX_UNITS = 2; // Approximate diameter of visible area in hex units
  const FADE_DISTANCE = 3 * DIAMETER_IN_HEX_UNITS;

  if (distanceToBoundary <= 0) {
    return 6; // Fully visible, all corners
  } else if (distanceToBoundary <= FADE_DISTANCE) {
    return 2; // Close to boundary, 2 dots
  } else {
    return 1; // Far away, 1 dot
  }
}
