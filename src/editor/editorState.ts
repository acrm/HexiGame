import { keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';

export interface EditorCell extends Axial {
  relativeColor: number | null;
}

export interface EditorLayer {
  id: string;
  color: string;
  rawValue: string;
  cells: EditorCell[];
  paintRelativeColor: number | null;
  parseError: string | null;
}

export interface EditorDocumentState {
  layers: EditorLayer[];
  selectedLayerId: string;
}

export interface CellOwner {
  layerId: string;
  color: string;
  relativeColor: number | null;
}

const DEFAULT_LAYER_COLORS = ['black', 'white', '#f97316', '#2563eb', '#16a34a', '#a855f7'];

let nextLayerId = 1;

export function normalizeCells(cells: EditorCell[]): EditorCell[] {
  const unique = new Map<string, EditorCell>();

  for (const cell of cells) {
    unique.set(keyOfAxial(cell), {
      q: cell.q,
      r: cell.r,
      relativeColor: cell.relativeColor ?? null,
    });
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.q !== right.q) return left.q - right.q;
    return right.r - left.r;
  });
}

export function serializeCells(cells: EditorCell[]): string {
  const normalized = normalizeCells(cells);
  const serializable = normalized.map(cell => {
    if (cell.relativeColor === null) {
      return { q: cell.q, r: cell.r };
    }

    return {
      q: cell.q,
      r: cell.r,
      relativeColor: cell.relativeColor,
    };
  });

  return JSON.stringify(serializable, null, 2);
}

function parseRelaxedArray(rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    const relaxedJson = trimmed
      .replace(/([{,]\s*)(q|r|relativeColor)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    return JSON.parse(relaxedJson);
  }
}

export function parseCells(rawValue: string): { cells: EditorCell[]; parseError: string | null } {
  try {
    const parsed = parseRelaxedArray(rawValue);
    if (!Array.isArray(parsed)) {
      return {
        cells: [],
        parseError: 'Coordinates must be an array of { q, r, relativeColor? } objects.',
      };
    }

    const cells: EditorCell[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        return {
          cells: [],
          parseError: 'Each coordinate must be an object with numeric q and r fields and optional relativeColor.',
        };
      }

      const candidate = item as Partial<Record<'q' | 'r' | 'relativeColor', unknown>>;
      if (typeof candidate.q !== 'number' || typeof candidate.r !== 'number') {
        return {
          cells: [],
          parseError: 'Each coordinate must contain numeric q and r values.',
        };
      }

      if (!Number.isFinite(candidate.q) || !Number.isFinite(candidate.r)) {
        return {
          cells: [],
          parseError: 'q and r values must be finite numbers.',
        };
      }

      let relativeColor: number | null = null;
      if ('relativeColor' in candidate && candidate.relativeColor !== undefined) {
        if (candidate.relativeColor === null) {
          relativeColor = null;
        } else if (typeof candidate.relativeColor === 'number' && Number.isFinite(candidate.relativeColor)) {
          relativeColor = candidate.relativeColor;
        } else {
          return {
            cells: [],
            parseError: 'relativeColor must be a finite number or null.',
          };
        }
      }

      cells.push({
        q: candidate.q,
        r: candidate.r,
        relativeColor,
      });
    }

    return {
      cells: normalizeCells(cells),
      parseError: null,
    };
  } catch {
    return {
      cells: [],
      parseError: 'Unable to parse coordinates. Paste a JSON array or a TypeScript-style array of { q, r, relativeColor? } objects.',
    };
  }
}

export function createEditorLayer(
  color: string = 'black',
  cells: EditorCell[] = [],
  paintRelativeColor: number | null = 0,
): EditorLayer {
  const normalizedCells = normalizeCells(cells);

  return {
    id: `layer-${nextLayerId++}`,
    color,
    rawValue: serializeCells(normalizedCells),
    cells: normalizedCells,
    paintRelativeColor,
    parseError: null,
  };
}

export function createInitialEditorDocument(): EditorDocumentState {
  const initialLayer = createEditorLayer('black');
  return {
    layers: [initialLayer],
    selectedLayerId: initialLayer.id,
  };
}

export function getNextLayerColor(layers: EditorLayer[]): string {
  for (const color of DEFAULT_LAYER_COLORS) {
    if (!layers.some(layer => layer.color === color)) {
      return color;
    }
  }

  const hue = (layers.length * 47) % 360;
  return `hsl(${hue} 75% 52%)`;
}

export function updateLayerColor(layers: EditorLayer[], layerId: string, color: string): EditorLayer[] {
  return layers.map(layer => {
    if (layer.id !== layerId) return layer;
    return {
      ...layer,
      color,
    };
  });
}

export function updateLayerRawValue(layers: EditorLayer[], layerId: string, rawValue: string): EditorLayer[] {
  return layers.map(layer => {
    if (layer.id !== layerId) return layer;

    const parsed = parseCells(rawValue);
    if (parsed.parseError) {
      return {
        ...layer,
        rawValue,
        parseError: parsed.parseError,
      };
    }

    const firstRelativeColor = parsed.cells.find(cell => cell.relativeColor !== null)?.relativeColor ?? null;

    return {
      ...layer,
      rawValue,
      cells: parsed.cells,
      paintRelativeColor: firstRelativeColor ?? layer.paintRelativeColor,
      parseError: null,
    };
  });
}

export function updateLayerPaintRelativeColor(
  layers: EditorLayer[],
  layerId: string,
  relativeColor: number | null,
): EditorLayer[] {
  return layers.map(layer => {
    if (layer.id !== layerId) return layer;
    return {
      ...layer,
      paintRelativeColor: relativeColor,
    };
  });
}

export function normalizeLayerRawValue(layers: EditorLayer[], layerId: string): EditorLayer[] {
  return layers.map(layer => {
    if (layer.id !== layerId || layer.parseError) return layer;
    return {
      ...layer,
      rawValue: serializeCells(layer.cells),
    };
  });
}

export function removeLayer(layers: EditorLayer[], layerId: string): EditorLayer[] {
  if (layers.length <= 1) return layers;
  return layers.filter(layer => layer.id !== layerId);
}

export function toggleCellInLayer(layers: EditorLayer[], layerId: string, cell: Axial): EditorLayer[] {
  const cellKey = keyOfAxial(cell);
  const selectedLayer = layers.find(layer => layer.id === layerId);
  if (!selectedLayer) return layers;

  const selectedHasCell = selectedLayer.cells.some(candidate => keyOfAxial(candidate) === cellKey);

  return layers.map(layer => {
    const filteredCells = layer.cells.filter(candidate => keyOfAxial(candidate) !== cellKey);

    if (selectedHasCell) {
      if (layer.id !== layerId) return layer;
      const nextCells = normalizeCells(filteredCells);
      return {
        ...layer,
        cells: nextCells,
        rawValue: serializeCells(nextCells),
        parseError: null,
      };
    }

    if (layer.id === layerId) {
      const nextCells = normalizeCells([
        ...filteredCells,
        {
          q: cell.q,
          r: cell.r,
          relativeColor: selectedLayer.paintRelativeColor,
        },
      ]);
      return {
        ...layer,
        cells: nextCells,
        rawValue: serializeCells(nextCells),
        parseError: null,
      };
    }

    if (filteredCells.length === layer.cells.length) {
      return layer;
    }

    const nextCells = normalizeCells(filteredCells);
    return {
      ...layer,
      cells: nextCells,
      rawValue: serializeCells(nextCells),
      parseError: null,
    };
  });
}

export function buildCellOwnership(layers: EditorLayer[]): { ownership: Map<string, CellOwner>; duplicates: Set<string> } {
  const ownership = new Map<string, CellOwner>();
  const duplicates = new Set<string>();

  for (const layer of layers) {
    for (const cell of layer.cells) {
      const key = keyOfAxial(cell);
      if (ownership.has(key)) {
        duplicates.add(key);
      }
      ownership.set(key, {
        layerId: layer.id,
        color: layer.color,
        relativeColor: cell.relativeColor,
      });
    }
  }

  return { ownership, duplicates };
}
