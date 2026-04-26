import { describe, expect, it } from 'vitest';

import {
  createFractalEditorPaintState,
  createFractalEditorTemplate,
  getFractalLayerCellKey,
} from '../src/fieldLab/fieldLogic';

describe('field-lab interactive fractal editor', () => {
  it('creates top layer with exactly seven cells', () => {
    const template = createFractalEditorTemplate();
    expect(template[2]).toHaveLength(7);
  });

  it('expands template down to layer -2 with full and partial cells', () => {
    const template = createFractalEditorTemplate();
    expect(template[-2].length).toBeGreaterThan(template[2].length);
    const hasPartial = template[-2].some((cell) => cell.coverage === 'partial');
    const hasFull = template[-2].some((cell) => cell.coverage === 'full');
    expect(hasPartial).toBe(true);
    expect(hasFull).toBe(true);
  });

  it('initial paint state contains all cells as empty', () => {
    const template = createFractalEditorTemplate();
    const state = createFractalEditorPaintState(template);
    for (const layer of [-2, -1, 0, 1, 2] as const) {
      for (const cell of template[layer]) {
        const key = getFractalLayerCellKey(cell.q, cell.r);
        expect(state[layer][key]).toBeNull();
      }
    }
  });
});
