import { describe, expect, it } from 'vitest';

import {
  buildMatrix,
  DEFAULT_FIELD_PARAMS,
  DEFAULT_FRACTAL_PARAMS,
  evalCellFractalInfluence,
} from '../src/fieldLab/fieldLogic';

function findCellWithInfluence() {
  const matrix = buildMatrix(DEFAULT_FIELD_PARAMS.seed);
  for (let q = -12; q <= 12; q += 1) {
    for (let r = -12; r <= 12; r += 1) {
      const influence = evalCellFractalInfluence(
        q,
        r,
        24,
        DEFAULT_FIELD_PARAMS,
        matrix,
        DEFAULT_FRACTAL_PARAMS,
      );
      if (influence.contributions.length > 0) {
        return { q, r };
      }
    }
  }
  return null;
}

describe('field-lab fractal influence model', () => {
  it('returns bounded metrics and deterministic dominant color', () => {
    const matrix = buildMatrix(DEFAULT_FIELD_PARAMS.seed);
    const result = evalCellFractalInfluence(2, -3, 15, DEFAULT_FIELD_PARAMS, matrix, DEFAULT_FRACTAL_PARAMS);

    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.instability).toBeGreaterThanOrEqual(0);
    expect(result.instability).toBeLessThanOrEqual(1);

    if (result.dominantColor !== null) {
      expect(result.dominantColor).toBeGreaterThanOrEqual(0);
      expect(result.dominantColor).toBeLessThan(DEFAULT_FIELD_PARAMS.K);
    }
  });

  it('respects alpha cutoff and can suppress weak influence', () => {
    const matrix = buildMatrix(DEFAULT_FIELD_PARAMS.seed);
    const result = evalCellFractalInfluence(
      0,
      0,
      12,
      DEFAULT_FIELD_PARAMS,
      matrix,
      {
        ...DEFAULT_FRACTAL_PARAMS,
        alphaCutoff: 1,
      },
    );

    expect(result.alpha).toBe(0);
  });

  it('higher layer gain yields stronger alpha for the same cell', () => {
    const sample = findCellWithInfluence();
    expect(sample).not.toBeNull();

    const matrix = buildMatrix(DEFAULT_FIELD_PARAMS.seed);
    const low = evalCellFractalInfluence(
      sample!.q,
      sample!.r,
      30,
      DEFAULT_FIELD_PARAMS,
      matrix,
      {
        ...DEFAULT_FRACTAL_PARAMS,
        layerGain: 0.2,
      },
    );
    const high = evalCellFractalInfluence(
      sample!.q,
      sample!.r,
      30,
      DEFAULT_FIELD_PARAMS,
      matrix,
      {
        ...DEFAULT_FRACTAL_PARAMS,
        layerGain: 1.6,
      },
    );

    expect(high.alpha).toBeGreaterThanOrEqual(low.alpha);
  });
});
