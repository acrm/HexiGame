export interface FieldMatrix {
  coeffs: Float64Array;
}

export interface FieldParams {
  seed: number;
  K: number;
  timeScale: number;
  baseFreq: number;
  densityThreshold: number;
  u1: number;
  u2: number;
  P: number;
  blinkOnTicks: number;
  blinkOffTicks: number;
  mode: 'value' | 'hash';
}

export const DEFAULT_FIELD_PARAMS: FieldParams = {
  seed: 42,
  K: 6,
  timeScale: 0.5,
  baseFreq: 1,
  densityThreshold: 0.55,
  u1: 0,
  u2: 0,
  P: 12,
  blinkOnTicks: 4,
  blinkOffTicks: 3,
  mode: 'value',
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMatrix(seed: number): FieldMatrix {
  const rng = mulberry32(seed ^ 0xDEADBEEF);
  const coeffs = new Float64Array(10);
  for (let i = 0; i < 10; i += 1) {
    coeffs[i] = (rng() * 2 - 1) * 1.5;
  }
  return { coeffs };
}

function hash6i(
  i0: number, i1: number, i2: number,
  i3: number, i4: number, i5: number,
  seed: number,
): number {
  let h = (seed ^ 0x9e3779b9) | 0;
  h = Math.imul(h ^ i0, 0x6d2b79f5) | 0;
  h ^= h >>> 16;
  h = Math.imul(h ^ i1, 0x85ebca6b) | 0;
  h ^= h >>> 13;
  h = Math.imul(h ^ i2, 0xc2b2ae35) | 0;
  h ^= h >>> 16;
  h = Math.imul(h ^ i3, 0x27d4eb2f) | 0;
  h ^= h >>> 15;
  h = Math.imul(h ^ i4, 0x1a2b3c4d) | 0;
  h ^= h >>> 16;
  h = Math.imul(h ^ i5, 0x3d4d5e6f) | 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function valueNoise6D(
  x0: number, x1: number, x2: number,
  x3: number, x4: number, x5: number,
  seed: number,
): number {
  const ix0 = Math.floor(x0), fx0 = x0 - ix0;
  const ix1 = Math.floor(x1), fx1 = x1 - ix1;
  const ix2 = Math.floor(x2), fx2 = x2 - ix2;
  const ix3 = Math.floor(x3), fx3 = x3 - ix3;
  const ix4 = Math.floor(x4), fx4 = x4 - ix4;
  const ix5 = Math.floor(x5), fx5 = x5 - ix5;

  const w0 = fade(fx0), w1 = fade(fx1), w2 = fade(fx2);
  const w3 = fade(fx3), w4 = fade(fx4), w5 = fade(fx5);

  const c0 = [1 - w0, w0];
  const c1 = [1 - w1, w1];
  const c2 = [1 - w2, w2];
  const c3 = [1 - w3, w3];
  const c4 = [1 - w4, w4];
  const c5 = [1 - w5, w5];

  let result = 0;
  for (let mask = 0; mask < 64; mask += 1) {
    const b0 = (mask >> 0) & 1;
    const b1 = (mask >> 1) & 1;
    const b2 = (mask >> 2) & 1;
    const b3 = (mask >> 3) & 1;
    const b4 = (mask >> 4) & 1;
    const b5 = (mask >> 5) & 1;
    const corner = hash6i(ix0 + b0, ix1 + b1, ix2 + b2, ix3 + b3, ix4 + b4, ix5 + b5, seed);
    const weight = c0[b0] * c1[b1] * c2[b2] * c3[b3] * c4[b4] * c5[b5];
    result += corner * weight;
  }
  return result;
}

function hashNoise6D(
  x0: number, x1: number, x2: number,
  x3: number, x4: number, x5: number,
  seed: number,
): number {
  return hash6i(
    Math.floor(x0), Math.floor(x1), Math.floor(x2),
    Math.floor(x3), Math.floor(x4), Math.floor(x5),
    seed,
  );
}

export interface CellEvalResult {
  isEmpty: boolean;
  colorIndex: number;
  density: number;
  hueNoise: number;
}

export function evalCell(
  q: number,
  r: number,
  tick: number,
  params: FieldParams,
  matrix: FieldMatrix,
): CellEvalResult {
  const { seed, K, timeScale, baseFreq, densityThreshold, u1, u2, mode } = params;
  const c = matrix.coeffs;

  const t = tick / 12;
  const X0 = t * timeScale;
  const X1 = c[0] * q + c[1] * r;
  const X2 = c[2] * q + c[3] * r;
  const X3 = c[4] * q + c[5] * r;
  const X4 = c[6] * q + c[7] * r + u1;
  const X5 = c[8] * q + c[9] * r + u2;

  const f = baseFreq;
  const noiseFn = mode === 'value' ? valueNoise6D : hashNoise6D;
  const density = noiseFn(X0 * f, X1 * f, X2 * f, X3 * f, X4 * f, X5 * f, seed ^ 0x12345678);
  const hueNoise = noiseFn((X0 + 100) * f, X1 * f, X2 * f, X3 * f, X4 * f, X5 * f, seed ^ 0x9ABCDEF0);

  const isEmpty = density < densityThreshold;
  const colorIndex = isEmpty ? 0 : Math.min(K - 1, Math.floor(hueNoise * K));
  return { isEmpty, colorIndex, density, hueNoise };
}

export interface PerspectiveResult {
  isEmpty: boolean;
  colorIndex: number;
  echoColor: number | null;
  echoDepth: number;
  decayDepth: number | null;
  blinkOn: boolean;
}

export function evalCellPerspective(
  q: number,
  r: number,
  currentTick: number,
  params: FieldParams,
  matrix: FieldMatrix,
): PerspectiveResult {
  const base = evalCell(q, r, currentTick, params, matrix);
  const { P, blinkOnTicks, blinkOffTicks } = params;
  const blinkCycle = blinkOnTicks + blinkOffTicks;
  const blinkOn = blinkCycle > 0 ? (currentTick % blinkCycle) < blinkOnTicks : true;

  if (base.isEmpty) {
    for (let k = 1; k <= P; k += 1) {
      const future = evalCell(q, r, currentTick + k, params, matrix);
      if (!future.isEmpty) {
        return {
          isEmpty: true,
          colorIndex: 0,
          echoColor: future.colorIndex,
          echoDepth: k,
          decayDepth: null,
          blinkOn,
        };
      }
    }
    return { isEmpty: true, colorIndex: 0, echoColor: null, echoDepth: 0, decayDepth: null, blinkOn };
  }

  for (let k = 1; k <= P; k += 1) {
    const future = evalCell(q, r, currentTick + k, params, matrix);
    if (future.isEmpty) {
      return {
        isEmpty: false,
        colorIndex: base.colorIndex,
        echoColor: null,
        echoDepth: 0,
        decayDepth: k,
        blinkOn,
      };
    }
  }
  return { isEmpty: false, colorIndex: base.colorIndex, echoColor: null, echoDepth: 0, decayDepth: null, blinkOn };
}
