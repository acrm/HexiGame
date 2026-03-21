/**
 * useMouseInput — Mouse event handling for desktop GameField controls.
 *
 * Handles:
 *  - Hotbar slot clicks
 *  - Cell click, drag, and release
 *  - Mouse-based cell focusing
 *
 * Extracted from GameField.tsx (2026-03-07).
 */

import { useEffect, useRef } from 'react';

export interface MouseInputHandlers {
  onSetCursor: (q: number, r: number) => void;
  onCellClickDown?: (q: number, r: number) => void;
  onCellClickUp?: (q: number, r: number) => void;
  onCellDrag?: (q: number, r: number) => void;
  onHotbarSlotClick?: (slotIdx: number) => void;
}

export interface MouseInputOptions extends MouseInputHandlers {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  pixelToAxial: (px: number, py: number) => { q: number; r: number };
  isCellInteractable: (q: number, r: number) => boolean;
  detectHotbarSlotClick: (px: number, py: number) => number | null;
}

export function useMouseInput(options: MouseInputOptions): void {
  const {
    canvasRef,
    pixelToAxial,
    isCellInteractable,
    detectHotbarSlotClick,
    onSetCursor,
    onCellClickDown,
    onCellClickUp,
    onCellDrag,
    onHotbarSlotClick,
  } = options;

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
      if (!isCellInteractable(axial.q, axial.r)) {
        lastAxial = null;
        return;
      }
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
      if (!isCellInteractable(axial.q, axial.r)) return;
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
      const releaseAxial = isCellInteractable(axial.q, axial.r) ? axial : lastAxial;
      lastAxial = null; // End drag
      if (onCellClickUp && releaseAxial) {
        onCellClickUp(releaseAxial.q, releaseAxial.r);
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
  }, [canvasRef, pixelToAxial, isCellInteractable, detectHotbarSlotClick, onSetCursor, onCellClickDown, onCellClickUp, onCellDrag, onHotbarSlotClick]);
}
