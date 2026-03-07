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
