import React, { useMemo, useState } from 'react';
import { axialDistance, keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';
import { DefaultParams } from '../gameLogic/core/params';
import { getAbsoluteColor } from '../templates/templateLogic';
import {
  buildCellOwnership,
  createEditorLayer,
  createInitialEditorDocument,
  getNextLayerColor,
  normalizeLayerRawValue,
  removeLayer,
  toggleCellInLayer,
  updateLayerColor,
  updateLayerPaintRelativeColor,
  updateLayerRawValue,
  type EditorDocumentState,
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
  const farthestCellDistance = state.layers.reduce((maxDistance, layer) => {
    return layer.cells.reduce((layerMaxDistance, cell) => {
      return Math.max(layerMaxDistance, axialDistance(ORIGIN, cell));
    }, maxDistance);
  }, MIN_GRID_RADIUS - 2);

  return Math.max(MIN_GRID_RADIUS, farthestCellDistance + 2);
}

export default function HexGridEditorPage() {
  const [documentState, setDocumentState] = useState<EditorDocumentState>(createInitialEditorDocument);
  const [basePaletteIndex, setBasePaletteIndex] = useState<number>(DefaultParams.PlayerBaseColorIndex);

  const activeLayer = documentState.layers.find(layer => layer.id === documentState.selectedLayerId) ?? documentState.layers[0];
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

  const { ownership, duplicates } = useMemo(() => buildCellOwnership(documentState.layers), [documentState.layers]);
  const activeCellCount = activeLayer?.cells.length ?? 0;
  const totalCellCount = documentState.layers.reduce((count, layer) => count + layer.cells.length, 0);

  const selectLayer = (layerId: string) => {
    setDocumentState(previousState => ({
      ...previousState,
      selectedLayerId: layerId,
    }));
  };

  const handleAddLayer = () => {
    setDocumentState(previousState => {
      const nextLayer = createEditorLayer(getNextLayerColor(previousState.layers));
      return {
        layers: [...previousState.layers, nextLayer],
        selectedLayerId: nextLayer.id,
      };
    });
  };

  const handleRemoveLayer = (layerId: string) => {
    setDocumentState(previousState => {
      if (previousState.layers.length <= 1) return previousState;

      const removedIndex = previousState.layers.findIndex(layer => layer.id === layerId);
      const nextLayers = removeLayer(previousState.layers, layerId);
      const nextSelectedLayerId = previousState.selectedLayerId === layerId
        ? nextLayers[Math.max(0, removedIndex - 1)]?.id ?? nextLayers[0].id
        : previousState.selectedLayerId;

      return {
        layers: nextLayers,
        selectedLayerId: nextSelectedLayerId,
      };
    });
  };

  const handleColorChange = (layerId: string, color: string) => {
    setDocumentState(previousState => ({
      ...previousState,
      layers: updateLayerColor(previousState.layers, layerId, color),
    }));
  };

  const handleCoordinatesChange = (layerId: string, rawValue: string) => {
    setDocumentState(previousState => ({
      ...previousState,
      layers: updateLayerRawValue(previousState.layers, layerId, rawValue),
    }));
  };

  const handleCoordinatesBlur = (layerId: string) => {
    setDocumentState(previousState => ({
      ...previousState,
      layers: normalizeLayerRawValue(previousState.layers, layerId),
    }));
  };

  const handlePaintRelativeColorChange = (layerId: string, rawValue: string) => {
    const trimmed = rawValue.trim();
    const nextRelativeColor = trimmed === '' ? null : Number(trimmed);

    if (trimmed !== '' && !Number.isFinite(nextRelativeColor)) {
      return;
    }

    setDocumentState(previousState => ({
      ...previousState,
      layers: updateLayerPaintRelativeColor(previousState.layers, layerId, nextRelativeColor),
    }));
  };

  const handleCellClick = (cell: Axial) => {
    if (!activeLayer) return;

    setDocumentState(previousState => ({
      ...previousState,
      layers: toggleCellInLayer(previousState.layers, previousState.selectedLayerId, cell),
    }));
  };

  return (
    <div className="editor-page">
      <section className="editor-stage">
        <header className="editor-stage-header">
          <div>
            <div className="editor-kicker">Auxiliary Tool</div>
            <h1 className="editor-title">Hex Grid Editor</h1>
            <p className="editor-description">
              Click hexes to toggle them for the active layer. The coordinates panel updates instantly and supports
              optional relativeColor values for template-style editing.
            </p>
          </div>
          <div className="editor-stage-actions">
            <div className="editor-stat-pill">Active cells: {activeCellCount}</div>
            <div className="editor-stat-pill">Total cells: {totalCellCount}</div>
            <a className="editor-back-link" href="../">
              Open game
            </a>
          </div>
        </header>

        <div className="editor-board">
          <svg className="editor-grid-svg" viewBox={gridLayout.viewBox} role="img" aria-label="Editable axial hex grid">
            {gridLayout.positionedCells.map(({ cell, x, y }) => {
              const cellKey = keyOfAxial(cell);
              const owner = ownership.get(cellKey);
              const isActiveLayerCell = owner?.layerId === activeLayer?.id;
              const isDuplicate = duplicates.has(cellKey);
              const fillColor = owner
                ? (owner.relativeColor === null
                  ? getDisplayColor(owner.color)
                  : getPaletteColorByRelative(owner.relativeColor, basePaletteIndex))
                : '#f5efe2';
              const strokeColor = isDuplicate
                ? '#c2410c'
                : isActiveLayerCell
                  ? '#114b5f'
                  : '#7c6a58';
              const strokeWidth = isDuplicate ? 4 : isActiveLayerCell ? 3 : 1.6;

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
                    opacity={owner ? 0.96 : 1}
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
      </section>

      <aside className="editor-sidebar">
        <div className="editor-sidebar-header">
          <div>
            <h2 className="editor-sidebar-title">Color layers</h2>
            <p className="editor-sidebar-note">Choose a palette base color for 0%, then paint cells with relativeColor values.</p>
          </div>
          <button className="editor-add-button" type="button" onClick={handleAddLayer}>
            Add color
          </button>
        </div>

        <div className="editor-palette-card">
          <div className="editor-palette-title">Base palette color (0%)</div>
          <div className="editor-palette-row">
            {EDITOR_PALETTE.map((paletteColor, index) => (
              <button
                key={`${paletteColor}-${index}`}
                type="button"
                className={`editor-palette-swatch ${index === basePaletteIndex ? 'active' : ''}`}
                style={{ backgroundColor: paletteColor }}
                onClick={() => setBasePaletteIndex(index)}
                aria-label={`Use palette color ${index} as 0%`}
                title={`Palette ${index}: ${paletteColor}`}
              />
            ))}
          </div>
          <div className="editor-palette-caption">
            Selected 0%: index {basePaletteIndex} ({EDITOR_PALETTE[basePaletteIndex]})
          </div>
        </div>

        {duplicates.size > 0 && (
          <div className="editor-warning-banner">
            Duplicate coordinates detected: {duplicates.size}. The last layer wins visually, but the orange outline shows
            conflicts.
          </div>
        )}

        <div className="editor-layer-list">
          {documentState.layers.map(layer => {
            const isActive = layer.id === activeLayer?.id;
            const isValidColor = isColorSupported(layer.color);
            const hasInvalidFallback = layer.paintRelativeColor === null && !isValidColor;
            const swatchColor = layer.paintRelativeColor === null
              ? getDisplayColor(layer.color)
              : getPaletteColorByRelative(layer.paintRelativeColor, basePaletteIndex);

            return (
              <section
                key={layer.id}
                className={`editor-layer-card ${isActive ? 'active' : ''}`}
                onClick={() => selectLayer(layer.id)}
              >
                <div className="editor-layer-header">
                  <div className="editor-layer-heading">
                    <span
                      className={`editor-layer-swatch ${hasInvalidFallback ? 'invalid' : ''}`}
                      style={{ backgroundColor: swatchColor }}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="editor-layer-name">{layer.color || 'Unnamed color'}</div>
                      <div className="editor-layer-meta">
                        {layer.cells.length} cells · paint {layer.paintRelativeColor ?? 'none'}%{isActive ? ' · active' : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className="editor-remove-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveLayer(layer.id);
                    }}
                    disabled={documentState.layers.length === 1}
                  >
                    Remove
                  </button>
                </div>

                <label className="editor-field-label">
                  Paint relativeColor (%)
                  <input
                    className="editor-text-input"
                    type="number"
                    value={layer.paintRelativeColor ?? ''}
                    onChange={(event) => handlePaintRelativeColorChange(layer.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="0"
                    step="1"
                    spellCheck={false}
                  />
                </label>

                <label className="editor-field-label">
                  Fallback color (used when relativeColor is missing)
                  <input
                    className="editor-text-input"
                    type="text"
                    value={layer.color}
                    onChange={(event) => handleColorChange(layer.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    placeholder="black"
                    spellCheck={false}
                  />
                </label>

                {hasInvalidFallback && (
                  <div className="editor-inline-warning">This color name is not supported by the browser. A fallback swatch is used.</div>
                )}

                <label className="editor-field-label">
                  Coordinates
                  <textarea
                    className="editor-textarea"
                    value={layer.rawValue}
                    onChange={(event) => handleCoordinatesChange(layer.id, event.target.value)}
                    onBlur={() => handleCoordinatesBlur(layer.id)}
                    onClick={(event) => event.stopPropagation()}
                    spellCheck={false}
                    rows={10}
                  />
                </label>

                {layer.parseError && <div className="editor-inline-error">{layer.parseError}</div>}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
