// Test setup file
import { expect } from 'vitest';

// Extend expect with custom matchers
expect.extend({
  toBeAdjacentTo(received: { q: number; r: number }, expected: { q: number; r: number }) {
    const dq = Math.abs(received.q - expected.q);
    const dr = Math.abs(received.r - expected.r);
    const ds = Math.abs((-received.q - received.r) - (-expected.q - expected.r));
    const distance = Math.max(dq, dr, ds);
    const pass = distance === 1;
    
    return {
      pass,
      message: () => pass
        ? `Expected (${received.q}, ${received.r}) not to be adjacent to (${expected.q}, ${expected.r})`
        : `Expected (${received.q}, ${received.r}) to be adjacent to (${expected.q}, ${expected.r}) but distance was ${distance}`,
    };
  },
  
  toBeInRadius(received: { q: number; r: number }, radius: number) {
    const s = -received.q - received.r;
    const pass = Math.abs(received.q) <= radius && 
                 Math.abs(received.r) <= radius && 
                 Math.abs(s) <= radius;
    
    return {
      pass,
      message: () => pass
        ? `Expected (${received.q}, ${received.r}) to be outside radius ${radius}`
        : `Expected (${received.q}, ${received.r}) to be within radius ${radius}`,
    };
  },
});

// Declare custom matchers for TypeScript
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeAdjacentTo(expected: { q: number; r: number }): T;
    toBeInRadius(radius: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeAdjacentTo(expected: { q: number; r: number }): any;
    toBeInRadius(radius: number): any;
  }
}
