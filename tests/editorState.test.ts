import { describe, expect, it } from 'vitest';
import {
  parseCells,
  serializeCells,
  toggleCell,
  normalizeCells,
} from '../src/editor/editorState';

describe('editorState', () => {
  it('parses TypeScript-style coordinate arrays', () => {
    const parsed = parseCells(`[
      { q: 3, r: 1 },
      { q: 3, r: -1 },
      { q: 4, r: 0 },
    ]`);

    expect(parsed.parseError).toBeNull();
    expect(parsed.cells).toHaveLength(3);
    expect(parsed.cells[0]).toEqual({ q: 3, r: -1, relativeColor: null });
  });

  it('parses relativeColor values when provided', () => {
    const parsed = parseCells(`[
      { q: 0, r: -4, relativeColor: 50 },
      { q: 2, r: -3, relativeColor: 0 }
    ]`);

    expect(parsed.parseError).toBeNull();
    expect(parsed.cells).toHaveLength(2);
  });

  it('serializes cells grouped by r, sorted by q, one per line', () => {
    const serialized = serializeCells([
      { q: 4, r: 0, relativeColor: 0 },
      { q: 3, r: -1, relativeColor: 50 },
      { q: 3, r: 1, relativeColor: 50 },
      { q: 3, r: -1, relativeColor: 50 },  // duplicate, should be deduplicated
    ]);

    // Should be grouped by r (ascending), sorted by q within each group
    expect(serialized).toContain('{ q: 3, r: -1');
    expect(serialized).toContain('{ q: 3, r: 1');
    expect(serialized).toContain('{ q: 4, r: 0');
    expect(serialized.match(/\{ q:/g)).toHaveLength(3); // Should have 3 unique cells
  });

  it('toggleCell adds and removes cells', () => {
    let cells = [{ q: 0, r: 0, relativeColor: null }];

    // Add a cell
    cells = toggleCell(cells, { q: 1, r: 0 }, 50);
    expect(cells).toHaveLength(2);

    // Remove a cell
    cells = toggleCell(cells, { q: 1, r: 0 }, 0);
    expect(cells).toHaveLength(1);
  });

  it('normalizes cells by grouping by r and sorting by q', () => {
    const normalized = normalizeCells([
      { q: 4, r: 0, relativeColor: 0 },
      { q: 1, r: 0, relativeColor: 0 },
      { q: 0, r: -1, relativeColor: 0 },
    ]);

    expect(normalized[0].r).toBeLessThanOrEqual(normalized[1].r);
    expect(normalized[1].r).toBeLessThanOrEqual(normalized[2].r);
  });

  it('returns parse error for invalid JSON', () => {
    const parsed = parseCells('[{ q: 2, r: -1 ');
    expect(parsed.parseError).not.toBeNull();
    expect(parsed.cells).toHaveLength(0);
  });
});
