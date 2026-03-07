/**
 * useViewport — Viewport/camera state management for GameField canvas.
 *
 * Provides:
 *  - Scale, centerX, centerY refs for pixel/axial coordinate conversion
 *  - pixelToAxial converter function
 *  - detectHotbarSlotClick helper
 *
 * Extracted from GameField.tsx (2026-03-07).
 */

import { useRef } from 'react';
import { pixelToAxial as pixelToAxialUtil, detectHotbarSlotClick as detectHotbarSlotClickUtil } from './geometryUtils';

export interface ViewportState {
  scaleRef: React.MutableRefObject<number>;
  centerXRef: React.MutableRefObject<number>;
  centerYRef: React.MutableRefObject<number>;
  pixelToAxial: (px: number, py: number) => { q: number; r: number };
  detectHotbarSlotClick: (px: number, py: number) => number | null;
}

export interface UseViewportOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInventory: boolean;
  hideHotbar: boolean;
  isLeftHanded: boolean;
}

export function useViewport(options: UseViewportOptions): ViewportState {
  const { canvasRef, isInventory, hideHotbar, isLeftHanded } = options;

  const scaleRef = useRef<number>(1);
  const centerXRef = useRef<number>(0);
  const centerYRef = useRef<number>(0);

  function pixelToAxial(px: number, py: number): { q: number; r: number } {
    return pixelToAxialUtil(px, py, scaleRef, centerXRef, centerYRef);
  }

  function detectHotbarSlotClick(px: number, py: number): number | null {
    if (!canvasRef.current) return null;
    return detectHotbarSlotClickUtil(px, py, canvasRef.current, isInventory, hideHotbar, isLeftHanded);
  }

  return {
    scaleRef,
    centerXRef,
    centerYRef,
    pixelToAxial,
    detectHotbarSlotClick,
  };
}
