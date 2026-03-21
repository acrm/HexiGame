import { keyOfAxial } from '../gameLogic/core/grid';
import type { Axial } from '../gameLogic/core/types';

export interface EditorCell extends Axial {
  relativeColor: number | null;
}

export interface EditorDocumentState {
  cells: EditorCell[];
  anchorCell: Axial | null;
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

function buildSerializedCellLines(cells: EditorCell[], indent: string): string[] {
  const normalized = normalizeCells(cells);
  const lines: string[] = [];

  for (const cell of normalized) {
    if (cell.relativeColor === null) {
      lines.push(`${indent}{ q: ${cell.q}, r: ${cell.r} },`);
    } else {
      lines.push(`${indent}{ q: ${cell.q}, r: ${cell.r}, relativeColor: ${cell.relativeColor} },`);
    }
  }

  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = lastLine.replace(/,\s*$/, '');
  }

  return lines;
}

export function serializeCells(cells: EditorCell[], anchorCell: Axial | null = null): string {
  if (anchorCell !== null) {
    const cellLines = buildSerializedCellLines(cells, '    ');
    const serializedCellsBlock = cellLines.length > 0 ? `${cellLines.join('\n')}\n` : '    \n';

    return `{
  anchorCell: { q: ${anchorCell.q}, r: ${anchorCell.r} },
  cells: [
${serializedCellsBlock}  ]
}`;
  }

  const cellLines = buildSerializedCellLines(cells, '  ');
  const serializedCellsBlock = cellLines.length > 0 ? `${cellLines.join('\n')}\n` : '  \n';

  return `[\n${serializedCellsBlock}]`;
}

function parseRelaxedValue(rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  const normalizedSource = /^[a-zA-Z_$][\w$]*\s*:/.test(trimmed)
    ? `{${trimmed}}`
    : trimmed;

  try {
    return JSON.parse(normalizedSource);
  } catch {
    const relaxedJson = normalizedSource
      .replace(/([{,]\s*)(q|r|relativeColor|anchorCell|cells)(\s*:)/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    return JSON.parse(relaxedJson);
  }
}

function parseCellArray(parsed: unknown): { cells: EditorCell[]; parseError: string | null } {
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
}

function parseAnchorCell(candidate: unknown): { anchorCell: Axial | null; parseError: string | null } {
  if (candidate === null || candidate === undefined) {
    return {
      anchorCell: null,
      parseError: null,
    };
  }

  if (typeof candidate !== 'object') {
    return {
      anchorCell: null,
      parseError: 'anchorCell must be an object with numeric q and r values.',
    };
  }

  const anchor = candidate as Partial<Record<'q' | 'r', unknown>>;
  if (typeof anchor.q !== 'number' || typeof anchor.r !== 'number') {
    return {
      anchorCell: null,
      parseError: 'anchorCell must contain numeric q and r values.',
    };
  }

  if (!Number.isFinite(anchor.q) || !Number.isFinite(anchor.r)) {
    return {
      anchorCell: null,
      parseError: 'anchorCell q and r values must be finite numbers.',
    };
  }

  return {
    anchorCell: { q: anchor.q, r: anchor.r },
    parseError: null,
  };
}

export function parseCells(rawValue: string): { cells: EditorCell[]; anchorCell: Axial | null; parseError: string | null } {
  try {
    const parsed = parseRelaxedValue(rawValue);

    if (Array.isArray(parsed)) {
      const parsedCells = parseCellArray(parsed);
      return {
        cells: parsedCells.cells,
        anchorCell: null,
        parseError: parsedCells.parseError,
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        cells: [],
        anchorCell: null,
        parseError: 'Coordinates must be either an array or an object with anchorCell and cells.',
      };
    }

    const parsedObject = parsed as Partial<Record<'anchorCell' | 'cells', unknown>>;
    const parsedCells = parseCellArray(parsedObject.cells);
    if (parsedCells.parseError !== null) {
      return {
        cells: [],
        anchorCell: null,
        parseError: parsedCells.parseError,
      };
    }

    const parsedAnchorCell = parseAnchorCell(parsedObject.anchorCell);
    if (parsedAnchorCell.parseError !== null) {
      return {
        cells: [],
        anchorCell: null,
        parseError: parsedAnchorCell.parseError,
      };
    }

    return {
      cells: parsedCells.cells,
      anchorCell: parsedAnchorCell.anchorCell,
      parseError: null,
    };
  } catch {
    return {
      cells: [],
      anchorCell: null,
      parseError: 'Unable to parse coordinates. Paste an array of cells or an object with anchorCell and cells.',
    };
  }
}

export function createInitialEditorDocument(): EditorDocumentState {
  const defaultAnchorCell: Axial = { q: -1, r: -1 };
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
    anchorCell: defaultAnchorCell,
    rawValue: serializeCells(defaultCells, defaultAnchorCell),
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
