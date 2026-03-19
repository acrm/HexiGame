import React, { useRef } from 'react';
import type { Params } from '../../../gameLogic/core/params';
import type { GameState, Axial } from '../../../gameLogic/core/types';
import { axialDistance } from '../../../gameLogic/core/grid';
import { useViewport } from './useViewport';
import { useTouchInput } from './useTouchInput';
import { useMouseInput } from './useMouseInput';
import { useCanvasRenderer } from './useCanvasRenderer';

export function shouldDrawWorldFocusOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && !isTurtleMoving && !hasAutoFocusTarget;
}

export function shouldDrawAutoFocusTargetOverlay(isInventory: boolean, isTurtleMoving: boolean, hasAutoFocusTarget: boolean): boolean {
  return !isInventory && isTurtleMoving && hasAutoFocusTarget;
}

export function isAutoMoveInProgress(protagonist: Axial, autoFocusTarget?: Axial | null): boolean {
  if (!autoFocusTarget) return false;
  return axialDistance(protagonist, autoFocusTarget) > 1;
}

interface GameFieldProps {
  gameState: GameState;
  params: Params;
  fps: number;
  setFps: (fps: number) => void;
  showFPS?: boolean;
  isInventory: boolean;
  onToggleInventory: () => void;
  onCapture: () => void;
  onRelease: () => void;
  onEat: () => void;
  onSetCursor: (q: number, r: number) => void;
  onCellClickDown?: (q: number, r: number) => void;
  onCellClickUp?: (q: number, r: number) => void;
  onCellDrag?: (q: number, r: number) => void;
  onHotbarSlotClick?: (slotIdx: number) => void;
  isLeftHanded?: boolean;
  tutorialTargetCells?: Axial[];
  visitedTutorialCells?: Set<string>;
  hideHotbar?: boolean;
}

export const GameField: React.FC<GameFieldProps> = ({
  gameState,
  params,
  fps,
  setFps,
  showFPS = false,
  isInventory,
  onToggleInventory,
  onCapture,
  onRelease,
  onEat,
  onSetCursor,
  onCellClickDown,
  onCellClickUp,
  onCellDrag,
  onHotbarSlotClick,
  isLeftHanded = false,
  tutorialTargetCells = [],
  visitedTutorialCells = new Set(),
  hideHotbar = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Viewport management (scale, centerX, centerY)
  const viewport = useViewport({
    canvasRef,
    isInventory,
    hideHotbar,
    isLeftHanded,
  });
  const { scaleRef, centerXRef, centerYRef, pixelToAxial, detectHotbarSlotClick } = viewport;

  // Touch input handling
  useTouchInput({
    canvasRef,
    gameState,
    isInventory,
    hideHotbar,
    isLeftHanded,
    pixelToAxial,
    detectHotbarSlotClick,
    onHotbarSlotClick,
    onCapture,
    onRelease,
    onCellClickDown,
  });

  // Mouse input handling
  useMouseInput({
    canvasRef,
    pixelToAxial,
    detectHotbarSlotClick,
    onSetCursor,
    onCellClickDown,
    onCellClickUp,
    onCellDrag,
    onHotbarSlotClick,
  });

  useCanvasRenderer({
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
    tutorialTargetCells,
    visitedTutorialCells,
    scaleRef,
    centerXRef,
    centerYRef,
  });

  return (
    <div ref={canvasContainerRef} className="game-field" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default GameField;
