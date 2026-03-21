import { describe, expect, it } from 'vitest';
import {
  buildCellOwnership,
  createEditorLayer,
  parseCells,
  serializeCells,
  toggleCellInLayer,
  updateLayerRawValue,
} from '../src/editor/editorState';

describe('editorState', () => {
  it('parses TypeScript-style coordinate arrays', () => {
    const parsed = parseCells(`[
      { q: 3, r: 1 },
      { q: 3, r: -1 },
      { q: 4, r: 0 },
    ]`);

    expect(parsed.parseError).toBeNull();
    expect(parsed.cells).toEqual([
      { q: 3, r: 1 },
      { q: 3, r: -1 },
      { q: 4, r: 0 },
    ]);
  });

  it('serializes cells as sorted pretty JSON', () => {
    expect(serializeCells([
      { q: 4, r: 0 },
      { q: 3, r: -1 },
      { q: 3, r: 1 },
      { q: 3, r: -1 },
    ])).toBe(`[
  {
    "q": 3,
    "r": 1
  },
  {
    "q": 3,
    "r": -1
  },
  {
    "q": 4,
    "r": 0
  }
]`);
  });

  it('reassigns a clicked cell to the active layer', () => {
    const black = createEditorLayer('black', [{ q: 1, r: 0 }]);
    const white = createEditorLayer('white', [{ q: 0, r: 0 }]);

    const updated = toggleCellInLayer([black, white], white.id, { q: 1, r: 0 });

    expect(updated[0].cells).toEqual([]);
    expect(updated[1].cells).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
  });

  it('keeps the previous parsed cells when raw text becomes invalid', () => {
    const layer = createEditorLayer('black', [{ q: 2, r: -1 }]);
    const updated = updateLayerRawValue([layer], layer.id, '[{ q: 2, r: -1 }');

    expect(updated[0].cells).toEqual([{ q: 2, r: -1 }]);
    expect(updated[0].parseError).not.toBeNull();
  });

  it('tracks duplicate coordinates across layers', () => {
    const black = createEditorLayer('black', [{ q: 2, r: -1 }]);
    const white = createEditorLayer('white', [{ q: 2, r: -1 }]);

    const { duplicates } = buildCellOwnership([black, white]);

    expect(Array.from(duplicates)).toEqual(['2,-1']);
  });
});
