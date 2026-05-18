import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FIELD_PARAMS,
  buildMatrix,
  evalCell,
  evalCellPerspective,
} from '../src/fieldLab/fieldLogic';

describe('field-lab noise logic', () => {
  it('buildMatrix is deterministic for the same seed', () => {
    const first = buildMatrix(42);
    const second = buildMatrix(42);

    expect(Array.from(first.coeffs)).toEqual(Array.from(second.coeffs));
  });

  it('evalCell returns stable output and valid color index range', () => {
    const matrix = buildMatrix(1337);
    const params = {
      ...DEFAULT_FIELD_PARAMS,
      K: 6,
    };

    const first = evalCell(2, -3, 25, params, matrix);
    const second = evalCell(2, -3, 25, params, matrix);

    expect(first).toEqual(second);
    expect(first.colorIndex).toBeGreaterThanOrEqual(0);
    expect(first.colorIndex).toBeLessThan(params.K);
  });

  it('evalCellPerspective follows base state when lookahead is disabled', () => {
    const matrix = buildMatrix(5);
    const params = {
      ...DEFAULT_FIELD_PARAMS,
      P: 0,
      blinkOnTicks: 1,
      blinkOffTicks: 1,
    };

    const base = evalCell(1, 1, 7, params, matrix);
    const perspective = evalCellPerspective(1, 1, 7, params, matrix);

    expect(perspective.isEmpty).toBe(base.isEmpty);
    expect(perspective.echoColor).toBeNull();
    expect(perspective.echoDepth).toBe(0);
    expect(perspective.blinkOn).toBe(false);

    if (!base.isEmpty) {
      expect(perspective.colorIndex).toBe(base.colorIndex);
    }
  });
});
