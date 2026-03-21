import { keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';

export interface EditorCell extends Axial {
  relativeColor: number | null;
}

export interface EditorDocumentState {
  cells: EditorCell[];
  rawValue: string;
  parseError: string | null;
}

export function normalizeCells(cells: EditorCell[]): EditorCell[] {
  const unique = new Map<string, EditorCell>();

  for (const cell of cells) {
    unique.set(keyOfAxial(cell), {
      q: cell.q,
      r: cell.r,
      relativeColor: cell.relativeColor ?? null,
    });
  }

  // Group by r, sort by q within each group
  const grouped = new Map<number, EditorCell[]>();
  for (const cell of unique.values()) {
    if (!grouped.has(cell.r)) {
      grouped.set(cell.r, []);
    }
    grouped.get(cell.r)!.push(cell);
  }

  // Sort each r-group by q
  for (const cellGroup of grouped.values()) {
    cellGroup.sort((a, b) => a.q - b.q);
  }

  // Return sorted by r (ascending)
  const sortedRValues = Array.from(grouped.keys()).sort((a, b) => a - b);
  const result: EditorCell[] = [];
  for (const r of sortedRValues) {
    result.push(...grouped.get(r)!);
  }

  return result;
}

export function serializeCells(cells: EditorCell[]): string {
  const normalized = normalizeCells(cells);
  const lines: string[] = [];

  for (const cell of normalized) {
    if (cell.relativeColor === null) {
      lines.push(`{ q: ${cell.q}, r: ${cell.r} },`);
    } else {
      lines.push(`{ q: ${cell.q}, r: ${cell.r}, relativeColor: ${cell.relativeColor} },`);
    }
  }

  // Remove trailing comma from last line if present
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = lastLine.replace(/,\s*$/, '');
  }

  return `[\n  ${lines.join('\n  ')}\n]`;
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

export function createInitialEditorDocument(): EditorDocumentState {
  const defaultCells: EditorCell[] = [
    // Yin-Yang pattern (Инь-Янь)
    { q: 0, r: -4, relativeColor: 50 },
    { q: 1, r: -4, relativeColor: 50 },
    { q: 2, r: -4, relativeColor: 50 },

    { q: -1, r: -3, relativeColor: 50 },
    { q: 0, r: -3, relativeColor: 50 },
    { q: 1, r: -3, relativeColor: 50 },
    { q: 2, r: -3, relativeColor: 0 },

    { q: -2, r: -2, relativeColor: 50 },
    { q: -1, r: -2, relativeColor: 50 },
    { q: 0, r: -2, relativeColor: 0 },
    { q: 1, r: -2, relativeColor: 50 },
    { q: 2, r: -2, relativeColor: 0 },

    { q: -2, r: -1, relativeColor: 50 },
    { q: -1, r: -1, relativeColor: 0 },
    { q: 0, r: -1, relativeColor: 0 },
    { q: 1, r: -1, relativeColor: 0 },

    { q: -2, r: 0, relativeColor: 0 },
    { q: -1, r: 0, relativeColor: 0 },
    { q: 0, r: 0, relativeColor: 0 },
  ];

  return {
    cells: defaultCells,
    rawValue: serializeCells(defaultCells),
    parseError: null,
  };
}

export function toggleCell(cells: EditorCell[], cell: Axial, relativeColor: number | null): EditorCell[] {
  const cellKey = keyOfAxial(cell);
  const normalized = normalizeCells(cells);

  const existingIndex = normalized.findIndex(c => keyOfAxial(c) === cellKey);
  if (existingIndex >= 0) {
    // Remove cell
    return normalized.filter((_, i) => i !== existingIndex);
  }

  // Add cell
  return normalizeCells([...normalized, { q: cell.q, r: cell.r, relativeColor }]);
}
