import { keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';

export interface EditorLayer {
  id: string;
  color: string;
  rawValue: string;
  cells: Axial[];
  parseError: string | null;
}

export interface EditorDocumentState {
  layers: EditorLayer[];
  selectedLayerId: string;
}

export interface CellOwner {
  layerId: string;
  color: string;
}

const DEFAULT_LAYER_COLORS = ['black', 'white', '#f97316', '#2563eb', '#16a34a', '#a855f7'];

let nextLayerId = 1;

export function normalizeCells(cells: Axial[]): Axial[] {
  const unique = new Map<string, Axial>();

  for (const cell of cells) {
    unique.set(keyOfAxial(cell), { q: cell.q, r: cell.r });
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.q !== right.q) return left.q - right.q;
    return right.r - left.r;
  });
}

export function serializeCells(cells: Axial[]): string {
  return JSON.stringify(normalizeCells(cells), null, 2);
}

function parseRelaxedArray(rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  try {
    return JSON.parse(trimmed);
  } catch {
    const relaxedJson = trimmed
      .replace(/([{,]\s*)(q|r)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    return JSON.parse(relaxedJson);
  }
}

export function parseCells(rawValue: string): { cells: Axial[]; parseError: string | null } {
  try {
    const parsed = parseRelaxedArray(rawValue);
    if (!Array.isArray(parsed)) {
      return {
        cells: [],
        parseError: 'Coordinates must be an array of { q, r } objects.',
      };
    }

    const cells: Axial[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        return {
          cells: [],
          parseError: 'Each coordinate must be an object with numeric q and r fields.',
        };
      }

      const candidate = item as Partial<Record<'q' | 'r', unknown>>;
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

      cells.push({ q: candidate.q, r: candidate.r });
    }

    return {
      cells: normalizeCells(cells),
      parseError: null,
    };
  } catch {
    return {
      cells: [],
      parseError: 'Unable to parse coordinates. Paste a JSON array or a TypeScript-style array of { q, r } objects.',
    };
  }
}

export function createEditorLayer(color: string = 'black', cells: Axial[] = []): EditorLayer {
  const normalizedCells = normalizeCells(cells);

  return {
    id: `layer-${nextLayerId++}`,
    color,
    rawValue: serializeCells(normalizedCells),
    cells: normalizedCells,
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

    return {
      ...layer,
      rawValue,
      cells: parsed.cells,
      parseError: null,
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
      const nextCells = normalizeCells([...filteredCells, cell]);
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
      });
    }
  }

  return { ownership, duplicates };
}
