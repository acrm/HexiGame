import { describe, expect, it } from 'vitest';
import { shouldDrawWorldFocusOverlay } from '../src/components/GameField';

describe('World focus overlay rendering', () => {
  it('draws focus overlay in normal world state', () => {
    expect(shouldDrawWorldFocusOverlay(false, false, false)).toBe(true);
  });

  it('does not draw focus overlay while turtle is auto-moving', () => {
    expect(shouldDrawWorldFocusOverlay(false, true, true)).toBe(false);
    expect(shouldDrawWorldFocusOverlay(false, true, false)).toBe(false);
  });

  it('does not draw focus overlay in inventory mode', () => {
    expect(shouldDrawWorldFocusOverlay(true, false, false)).toBe(false);
  });

  it('does not draw focus overlay when auto focus target exists', () => {
    expect(shouldDrawWorldFocusOverlay(false, false, true)).toBe(false);
  });
});
