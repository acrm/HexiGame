import React, { useEffect, useMemo, useRef, useState } from 'react';
import { axialDistance, keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';
import { DefaultParams } from '../gameLogic/core/params';
import { getAbsoluteColor } from '../templates/templateLogic';
import {
  createInitialEditorDocument,
  parseCells,
  serializeCells,
  toggleCell,
  type EditorDocumentState,
  type EditorCell,
} from './editorState';
import './HexGridEditorPage.css';

const ORIGIN: Axial = { q: 0, r: 0 };
const HEX_SIZE = 34;
const MIN_GRID_RADIUS = 8;
const EDITOR_PALETTE = DefaultParams.ColorPalette;

function projectAxial(cell: Axial): { x: number; y: number } {
  return {
    x: HEX_SIZE * 1.5 * cell.q,
    y: HEX_SIZE * Math.sqrt(3) * (cell.r + cell.q / 2),
  };
}

function createHexPoints(x: number, y: number): string {
  const points: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index);
    points.push(`${x + HEX_SIZE * Math.cos(angle)},${y + HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function createGridCells(radius: number): Axial[] {
  const cells: Axial[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      const candidate = { q, r };
      if (axialDistance(ORIGIN, candidate) <= radius) {
        cells.push(candidate);
      }
    }
  }
  return cells;
}

function isColorSupported(value: string): boolean {
  if (!value.trim()) return false;
  if (typeof window === 'undefined' || typeof window.CSS === 'undefined') return true;
  return window.CSS.supports('color', value);
}

function getDisplayColor(value: string): string {
  return isColorSupported(value) ? value : '#111827';
}

function getPaletteColorByRelative(relativeColor: number, basePaletteIndex: number): string {
  if (EDITOR_PALETTE.length === 0) return '#111827';
  const resolvedIndex = getAbsoluteColor(relativeColor, basePaletteIndex, EDITOR_PALETTE.length);
  return EDITOR_PALETTE[resolvedIndex] ?? '#111827';
}

function computeGridRadius(state: EditorDocumentState): number {
  const farthestCellDistance = state.cells.reduce((maxDistance, cell) => {
    return Math.max(maxDistance, axialDistance(ORIGIN, cell));
  }, MIN_GRID_RADIUS - 2);

  return Math.max(MIN_GRID_RADIUS, farthestCellDistance + 2);
}

export default function HexGridEditorPage() {
  const [documentState, setDocumentState] = useState<EditorDocumentState>(createInitialEditorDocument);
  const [basePaletteIndex, setBasePaletteIndex] = useState<number>(DefaultParams.PlayerBaseColorIndex);
  const [paintRelativeColor, setPaintRelativeColor] = useState<number | null>(0);
  const [zoom, setZoom] = useState(1);
  const boardRef = useRef<HTMLDivElement>(null);

  const gridRadius = useMemo(() => computeGridRadius(documentState), [documentState]);

  const gridLayout = useMemo(() => {
    const cells = createGridCells(gridRadius);
    const positionedCells = cells.map(cell => ({
      cell,
      ...projectAxial(cell),
    }));
    const padding = HEX_SIZE * 2.6;

    const bounds = positionedCells.reduce(
      (accumulator, positionedCell) => ({
        minX: Math.min(accumulator.minX, positionedCell.x - HEX_SIZE),
        maxX: Math.max(accumulator.maxX, positionedCell.x + HEX_SIZE),
        minY: Math.min(accumulator.minY, positionedCell.y - HEX_SIZE),
        maxY: Math.max(accumulator.maxY, positionedCell.y + HEX_SIZE),
      }),
      {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
      },
    );

    return {
      positionedCells,
      viewBox: `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.maxX - bounds.minX + padding * 2} ${bounds.maxY - bounds.minY + padding * 2}`,
    };
  }, [gridRadius]);

  const cellMap = useMemo(() => {
    const map = new Map<string, EditorCell>();
    for (const cell of documentState.cells) {
      map.set(keyOfAxial(cell), cell);
    }
    return map;
  }, [documentState.cells]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.25, Math.min(4, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    board.addEventListener('wheel', onWheel, { passive: false });
    return () => board.removeEventListener('wheel', onWheel);
  }, []);

  const handleCoordinatesChange = (rawValue: string) => {
    const { cells, parseError } = parseCells(rawValue);
    setDocumentState({
      cells,
      rawValue,
      parseError,
    });
  };

  const handleCoordinatesBlur = () => {
    setDocumentState(previousState => ({
      ...previousState,
      rawValue: serializeCells(previousState.cells),
    }));
  };

  const handleCellClick = (cell: Axial) => {
    const nextCells = toggleCell(documentState.cells, cell, paintRelativeColor);
    setDocumentState({
      cells: nextCells,
      rawValue: serializeCells(nextCells),
      parseError: null,
    });
  };

  const handleBasePaletteIndexChange = (newIndex: number) => {
    setBasePaletteIndex(newIndex);
  };

  const handlePaintRelativeColorChange = (rawValue: string) => {
    const trimmed = rawValue.trim();
    const nextRelativeColor = trimmed === '' ? null : Number(trimmed);

    if (trimmed !== '' && !Number.isFinite(nextRelativeColor)) {
      return;
    }

    setPaintRelativeColor(nextRelativeColor);
  };

  const handlePaletteSwatchClick = (index: number) => {
    // Clicking a palette swatch sets the paintRelativeColor to that palette position
    const relativeColor = (index * 100) / EDITOR_PALETTE.length;
    setPaintRelativeColor(relativeColor);
  };

  const handleClearCoordinates = () => {
    setDocumentState({
      cells: [],
      rawValue: '[\n  \n]',
      parseError: null,
    });
  };

  const getRelativeColorForPaletteIndex = (colorIndex: number): number => {
    const offset = (colorIndex - basePaletteIndex + EDITOR_PALETTE.length) % EDITOR_PALETTE.length;
    return (offset * 100) / EDITOR_PALETTE.length;
  };

  const handleZoomIn = () => setZoom(z => Math.min(4, z * 1.2));
  const handleZoomOut = () => setZoom(z => Math.max(0.25, z / 1.2));

  return (
    <div className="editor-page">
      <div className="editor-grid-panel" ref={boardRef}>
        <div className="editor-zoom-controls">
          <button type="button" className="editor-zoom-btn" onClick={handleZoomOut} title="Zoom out">−</button>
          <span className="editor-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="editor-zoom-btn" onClick={handleZoomIn} title="Zoom in">+</button>
        </div>
        <div className="editor-grid-zoom-wrapper" style={{ transform: `scale(${zoom})` }}>
          <svg className="editor-grid-svg" viewBox={gridLayout.viewBox} role="img" aria-label="Editable axial hex grid">
            {gridLayout.positionedCells.map(({ cell, x, y }) => {
              const cellKey = keyOfAxial(cell);
              const cellData = cellMap.get(cellKey);
              const isEditorCell = cellData !== undefined;
              const fillColor = isEditorCell
                ? getPaletteColorByRelative(cellData!.relativeColor ?? 0, basePaletteIndex)
                : '#f5efe2';
              const strokeColor = isEditorCell ? '#114b5f' : '#7c6a58';
              const strokeWidth = isEditorCell ? 3 : 1.6;

              return (
                <g
                  key={cellKey}
                  className="editor-grid-cell"
                  onClick={() => handleCellClick(cell)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleCellClick(cell);
                    }
                  }}
                >
                  <polygon
                    points={createHexPoints(x, y)}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={isEditorCell ? 0.96 : 1}
                  />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    className="editor-grid-label"
                    fill="#1a120a"
                  >
                    ({cell.q}, {cell.r})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <aside className="editor-sidebar">
        <div className="editor-sidebar-header">
          <div className="editor-kicker">Auxiliary Tool</div>
          <h1 className="editor-title">Hex Grid Editor</h1>
          <p className="editor-description">
            Click hexes to toggle them. The coordinates panel updates instantly. Choose a palette base color (0%)
            and a painting color (relativeColor %), then click cells to add them.
          </p>
          <div className="editor-stage-actions">
            <div className="editor-stat-pill">Cells: {documentState.cells.length}</div>
            <a className="editor-back-link" href="../">Open game</a>
          </div>
        </div>

        <div className="editor-control-section">
          <label className="editor-field-label">
            Palette (click to select paint color)
            <div className="editor-palette-row">
              {EDITOR_PALETTE.map((paletteColor, index) => {
                const relativeColor = getRelativeColorForPaletteIndex(index);
                const isActive = paintRelativeColor === relativeColor;
                const isBaseColor = basePaletteIndex === index;
                return (
                  <div key={`${paletteColor}-${index}`} className="editor-palette-swatch-wrapper">
                    <button
                      type="button"
                      className={`editor-palette-swatch ${isActive ? 'active' : ''}`}
                      style={{ backgroundColor: paletteColor }}
                      onClick={() => handlePaletteSwatchClick(index)}
                      aria-label={`Paint with relativeColor ${relativeColor.toFixed(2)}%`}
                      title={`relativeColor: ${relativeColor.toFixed(2)}%`}
                    />
                    <div className="editor-palette-label">
                      {isBaseColor ? '0%' : `${relativeColor.toFixed(0)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="editor-palette-caption">
              Paint color: {paintRelativeColor?.toFixed(2) ?? 'none'}%
            </div>
          </label>

          <label className="editor-field-label editor-slider-label">
            Base color (0%)
            <div className="editor-slider-container">
              <input
                className="editor-slider-input"
                type="range"
                min="0"
                max={EDITOR_PALETTE.length - 1}
                value={basePaletteIndex}
                onChange={(event) => setBasePaletteIndex(Number(event.target.value))}
                step="1"
                title="Shift palette: which color counts as 0%"
              />
            </div>
            <div className="editor-palette-caption">
              Base: {EDITOR_PALETTE[basePaletteIndex]}
            </div>
          </label>
        </div>

        <div className="editor-control-section">
          <div className="editor-coordinates-header">
            <label className="editor-field-label">
              Coordinates (grouped by r, sorted by q)
            </label>
            <button
              className="editor-clear-button"
              type="button"
              onClick={handleClearCoordinates}
              title="Clear all coordinates"
            >
              Clear
            </button>
          </div>
          <textarea
            className="editor-textarea"
            value={documentState.rawValue}
            onChange={(event) => handleCoordinatesChange(event.target.value)}
            onBlur={handleCoordinatesBlur}
            spellCheck={false}
            rows={14}
          />
          {documentState.parseError && (
            <div className="editor-inline-error">{documentState.parseError}</div>
          )}
        </div>
      </aside>
    </div>
  );
}
