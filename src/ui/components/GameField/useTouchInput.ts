/**
 * useTouchInput — Touch event handling for mobile GameField controls.
 *
 * Handles:
 *  - Hotbar slot taps
 *  - ACT button touch (action mode)
 *  - Cell taps and drags
 *  - Touch-to-release action mode
 *
 * Extracted from GameField.tsx (2026-03-07).
 */

import { useEffect, useRef } from 'react';
import type { GameState } from '../../../gameLogic/core/types';
import { getHotbarGeometry } from './geometryUtils';

export interface TouchInputHandlers {
  onHotbarSlotClick?: (slotIdx: number) => void;
  onCapture: () => void;
  onRelease: () => void;
  onPreviewCursor?: (q: number, r: number) => void;
  onTouchCommitCell?: (q: number, r: number) => void;
}

export interface TouchInputOptions extends TouchInputHandlers {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameState: GameState;
  isInventory: boolean;
  hideHotbar: boolean;
  isLeftHanded: boolean;
  pixelToAxial: (px: number, py: number) => { q: number; r: number };
  isCellInteractable: (q: number, r: number) => boolean;
  detectHotbarSlotClick: (px: number, py: number) => number | null;
}

export function useTouchInput(options: TouchInputOptions): void {
  const {
    canvasRef,
    gameState,
    isInventory,
    hideHotbar,
    isLeftHanded,
    pixelToAxial,
    isCellInteractable,
    detectHotbarSlotClick,
    onHotbarSlotClick,
    onCapture,
    onRelease,
    onPreviewCursor,
    onTouchCommitCell,
  } = options;

  // Track active ACT (action mode) touch so release outside button still ends action mode
  const actTouchIdRef = useRef<number | null>(null);
  const navTouchIdRef = useRef<number | null>(null);
  const navTouchCellRef = useRef<{ q: number; r: number } | null>(null);

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

        const {
          centerX: capCenterX,
          centerY: capCenterY,
          hexSize: capRadius,
        } = getHotbarGeometry(currentCanvas, isLeftHanded);

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
          if (navTouchIdRef.current !== null) {
            continue;
          }

          const axial = pixelToAxial(x, y);
          if (!isCellInteractable(axial.q, axial.r)) {
            continue;
          }

          ev.preventDefault();
          navTouchIdRef.current = t.identifier;
          navTouchCellRef.current = axial;
          onPreviewCursor?.(axial.q, axial.r);
        }
      }
    }

    function handleTouchMove(ev: TouchEvent) {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const rect = currentCanvas.getBoundingClientRect();

      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        if (t.identifier !== navTouchIdRef.current) continue;

        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const axial = pixelToAxial(x, y);
        if (!isCellInteractable(axial.q, axial.r)) {
          continue;
        }

        navTouchCellRef.current = axial;
        onPreviewCursor?.(axial.q, axial.r);
        ev.preventDefault();
      }
    }

    function handleTouchEnd(ev: TouchEvent) {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const rect = currentCanvas.getBoundingClientRect();

      for (let i = 0; i < ev.changedTouches.length; i++) {
        const t = ev.changedTouches[i];
        // Release action mode if ACT touch ends (regardless of where it ends)
        if (t.identifier === actTouchIdRef.current) {
          actTouchIdRef.current = null;
          ev.preventDefault();
          onRelease();
        }

        if (t.identifier === navTouchIdRef.current) {
          const x = t.clientX - rect.left;
          const y = t.clientY - rect.top;
          const releaseAxial = pixelToAxial(x, y);
          const finalAxial = isCellInteractable(releaseAxial.q, releaseAxial.r)
            ? releaseAxial
            : navTouchCellRef.current;

          navTouchIdRef.current = null;
          navTouchCellRef.current = null;

          if (!finalAxial) continue;

          ev.preventDefault();
          onPreviewCursor?.(finalAxial.q, finalAxial.r);
          onTouchCommitCell?.(finalAxial.q, finalAxial.r);
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
  }, [
    canvasRef,
    gameState.focus,
    isInventory,
    hideHotbar,
    isLeftHanded,
    pixelToAxial,
    isCellInteractable,
    detectHotbarSlotClick,
    onHotbarSlotClick,
    onCapture,
    onRelease,
    onPreviewCursor,
    onTouchCommitCell,
  ]);
}
