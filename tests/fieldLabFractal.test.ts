import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MANUAL_LAYER_TEXT,
  parseManualLayerDefinition,
} from '../src/fieldLab/fieldLogic';

describe('field-lab manual fractal structures', () => {
  it('parses default manual layers without errors', () => {
    for (const text of Object.values(DEFAULT_MANUAL_LAYER_TEXT)) {
      const result = parseManualLayerDefinition(text, 6);
      expect(result.errors).toEqual([]);
      expect(result.cells.length).toBeGreaterThan(0);
    }
  });

  it('reports malformed lines and invalid color index', () => {
    const result = parseManualLayerDefinition('0 0\n1 2 99\na b c', 6);
    expect(result.cells).toHaveLength(0);
    expect(result.errors.length).toBe(3);
  });

  it('last duplicate coordinate wins for deterministic edits', () => {
    const result = parseManualLayerDefinition('0 0 1\n0 0 3\n1 0 2', 6);
    expect(result.errors).toEqual([]);
    expect(result.cells).toHaveLength(2);
    const atOrigin = result.cells.find((cell) => cell.q === 0 && cell.r === 0);
    expect(atOrigin?.colorIndex).toBe(3);
  });
});
