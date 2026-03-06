import { describe, expect, it } from 'vitest';
import { isAutoMoveInProgress, shouldDrawAutoFocusTargetOverlay, shouldDrawWorldFocusOverlay } from '../src/ui/components/GameField';

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

  it('draws frozen target marker only during auto-move with target', () => {
    expect(shouldDrawAutoFocusTargetOverlay(false, true, true)).toBe(true);
    expect(shouldDrawAutoFocusTargetOverlay(false, false, true)).toBe(false);
    expect(shouldDrawAutoFocusTargetOverlay(false, true, false)).toBe(false);
    expect(shouldDrawAutoFocusTargetOverlay(true, true, true)).toBe(false);
  });

  it('treats movement as in progress only when target is farther than one hex', () => {
    expect(isAutoMoveInProgress({ q: 0, r: 0 }, null)).toBe(false);
    expect(isAutoMoveInProgress({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(false);
    expect(isAutoMoveInProgress({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(true);
  });
});
