#!/usr/bin/env node
/**
 * One-time setup: creates src/fieldLab/ and field-lab/ directories
 * with all required source files.
 *
 * Run from the project root:
 *   node scripts/setup-field-lab.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function write(relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log('  wrote', relPath);
}

// ── src/fieldLab/fieldLogic.ts ───────────────────────────────────────────────
write('src/fieldLab/fieldLogic.ts', `/**
 * Multidimensional Field Logic
 *
 * Deterministic, seed-based, time-evolving hex field.
 * Each cell is EMPTY or has one of K colors.
 * state(q, r, tick) is a pure function — no stored history required.
 *
 * The 2D hex grid is embedded in 6D space:
 *   X0 = t * timeScale        (time axis)
 *   X1..X5 = M * [q, r]^T    (spatial axes via seed-derived matrix)
 *   X4, X5 also receive user offsets u1, u2
 *
 * Two noise modes:
 *   'value'  — 6D multilinear value noise (smooth, cloud-like)
 *   'hash'   — 6D hash noise (crispy, cellular)
 */

export interface FieldMatrix {
  /** 10 coefficients in row-major order: [a11, a12, a21, a22, a31, a32, a41, a42, a51, a52] */
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
  baseFreq: 1.0,
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
  for (let i = 0; i < 10; i++) {
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
  for (let mask = 0; mask < 64; mask++) {
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

  const density  = noiseFn(X0 * f, X1 * f, X2 * f, X3 * f, X4 * f, X5 * f, seed ^ 0x12345678);
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
    for (let k = 1; k <= P; k++) {
      const future = evalCell(q, r, currentTick + k, params, matrix);
      if (!future.isEmpty) {
        return { isEmpty: true, colorIndex: 0, echoColor: future.colorIndex, echoDepth: k, decayDepth: null, blinkOn };
      }
    }
    return { isEmpty: true, colorIndex: 0, echoColor: null, echoDepth: 0, decayDepth: null, blinkOn };
  } else {
    for (let k = 1; k <= P; k++) {
      const future = evalCell(q, r, currentTick + k, params, matrix);
      if (future.isEmpty) {
        return { isEmpty: false, colorIndex: base.colorIndex, echoColor: null, echoDepth: 0, decayDepth: k, blinkOn };
      }
    }
    return { isEmpty: false, colorIndex: base.colorIndex, echoColor: null, echoDepth: 0, decayDepth: null, blinkOn };
  }
}
`);

// ── src/fieldLab/FieldLabPage.css ────────────────────────────────────────────
write('src/fieldLab/FieldLabPage.css', `html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  font-family: 'Roboto', sans-serif;
  background: #0a0e1a;
  color: #c8d4e8;
}

* {
  box-sizing: border-box;
}

button,
input,
select,
textarea {
  font: inherit;
}

.field-lab {
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr 340px;
  overflow: hidden;
}

/* ---- Canvas panel ---- */
.field-lab__canvas-panel {
  position: relative;
  overflow: hidden;
  background: #050810;
}

.field-lab__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.field-lab__overlay {
  position: absolute;
  bottom: 12px;
  left: 12px;
  font-size: 11px;
  color: rgba(200, 212, 232, 0.5);
  pointer-events: none;
  user-select: none;
}

/* ---- Controls panel ---- */
.field-lab__controls {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: #0d1120;
}

.field-lab__controls-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-lab__controls-header h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #e0eaf8;
  flex: 1;
}

.field-lab__playback {
  display: flex;
  gap: 4px;
}

.field-lab__playback button {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #c8d4e8;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.field-lab__playback button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.field-lab__playback button.active {
  background: rgba(100, 160, 255, 0.2);
  border-color: rgba(100, 160, 255, 0.4);
  color: #a8c8ff;
}

/* ---- Sections ---- */
.field-lab__section {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.field-lab__section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(200, 212, 232, 0.4);
  margin: 0 0 10px;
}

/* ---- Form rows ---- */
.field-lab__row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-lab__row:last-child {
  margin-bottom: 0;
}

.field-lab__label {
  font-size: 12px;
  color: rgba(200, 212, 232, 0.7);
  width: 110px;
  flex-shrink: 0;
  user-select: none;
}

.field-lab__slider {
  flex: 1;
  accent-color: #5a9af0;
  cursor: pointer;
}

.field-lab__value {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #c8d4e8;
  min-width: 44px;
  text-align: right;
}

.field-lab__number {
  width: 72px;
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #c8d4e8;
  font-size: 12px;
}

.field-lab__number:focus {
  outline: none;
  border-color: rgba(100, 160, 255, 0.5);
}

.field-lab__radio-group {
  display: flex;
  gap: 12px;
}

.field-lab__radio-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: rgba(200, 212, 232, 0.7);
  cursor: pointer;
  user-select: none;
}

.field-lab__radio-group input {
  accent-color: #5a9af0;
  cursor: pointer;
}

.field-lab__mode-select {
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #c8d4e8;
  font-size: 12px;
  cursor: pointer;
}

.field-lab__mode-select:focus {
  outline: none;
  border-color: rgba(100, 160, 255, 0.5);
}

/* ---- Tick display ---- */
.field-lab__tick {
  padding: 8px 16px;
  font-size: 11px;
  color: rgba(200, 212, 232, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
}

/* ---- Perspective toggle ---- */
.field-lab__toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-lab__toggle {
  position: relative;
  width: 34px;
  height: 18px;
  flex-shrink: 0;
}

.field-lab__toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.field-lab__toggle-track {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.2s;
}

.field-lab__toggle input:checked + .field-lab__toggle-track {
  background: rgba(100, 160, 255, 0.5);
}

.field-lab__toggle-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #e0eaf8;
  border-radius: 50%;
  transition: transform 0.2s;
}

.field-lab__toggle input:checked + .field-lab__toggle-track::after {
  transform: translateX(16px);
}
`);

// ── src/fieldLab/FieldLabPage.tsx ────────────────────────────────────────────
write('src/fieldLab/FieldLabPage.tsx', `import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMatrix,
  evalCell,
  evalCellPerspective,
  DEFAULT_FIELD_PARAMS,
  type FieldMatrix,
  type FieldParams,
} from './fieldLogic';
import './FieldLabPage.css';

const TICK_RATE = 12;
const TICK_MS = 1000 / TICK_RATE;

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const hex = (n: number) => {
    const s = Math.round((n + m) * 255).toString(16);
    return s.length === 1 ? '0' + s : s;
  };
  return \`#\${hex(r)}\${hex(g)}\${hex(b)}\`;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function buildPalette(K: number): string[] {
  const step = 360 / K;
  return Array.from({ length: K }, (_, i) => hsvToHex((30 + i * step) % 360, 70, 75));
}

function projectAxial(q: number, r: number, size: number): [number, number] {
  return [size * 1.5 * q, size * Math.sqrt(3) * (r + q / 2)];
}

function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function axialDistance(q: number, r: number): number {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

function generateGrid(radius: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (axialDistance(q, r) <= radius) cells.push([q, r]);
    }
  }
  return cells;
}

interface ViewState {
  gridRadius: number;
  hexSize: number;
  showPerspective: boolean;
  speed: number; // 0=paused, 1, 2, 4
}

const DEFAULT_VIEW: ViewState = {
  gridRadius: 8,
  hexSize: 26,
  showPerspective: true,
  speed: 1,
};

function Slider({ label, min, max, step, value, onChange, format }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="field-lab__row">
      <span className="field-lab__label">{label}</span>
      <input
        className="field-lab__slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className="field-lab__value">{format ? format(value) : value}</span>
    </div>
  );
}

export default function FieldLabPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const lastTickTimeRef = useRef(Date.now());
  const rafRef = useRef(0);
  const matrixRef = useRef<FieldMatrix>(buildMatrix(DEFAULT_FIELD_PARAMS.seed));
  const paletteRef = useRef<string[]>(buildPalette(DEFAULT_FIELD_PARAMS.K));

  const [params, setParams] = useState<FieldParams>(DEFAULT_FIELD_PARAMS);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [displayTick, setDisplayTick] = useState(0);

  const paramsRef = useRef(params);
  const viewRef = useRef(view);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { viewRef.current = view; }, [view]);

  const setParam = useCallback(<K extends keyof FieldParams>(key: K, value: FieldParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const setView_ = useCallback(<K extends keyof ViewState>(key: K, value: ViewState[K]) => {
    setView(prev => ({ ...prev, [key]: value }));
  }, []);

  // Rebuild matrix when seed changes
  useEffect(() => {
    matrixRef.current = buildMatrix(params.seed);
  }, [params.seed]);

  // Rebuild palette when K changes
  useEffect(() => {
    paletteRef.current = buildPalette(params.K);
  }, [params.K]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const params = paramsRef.current;
    const { gridRadius, hexSize, showPerspective } = viewRef.current;
    const matrix = matrixRef.current;
    const palette = paletteRef.current;
    const tick = tickRef.current;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    const cells = generateGrid(gridRadius);

    for (const [q, r] of cells) {
      const [px, py] = projectAxial(q, r, hexSize);
      const x = cx + px;
      const y = cy + py;

      if (showPerspective) {
        const pres = evalCellPerspective(q, r, tick, params, matrix);

        if (pres.isEmpty) {
          if (pres.echoColor !== null && pres.blinkOn) {
            const alpha = 1 - (pres.echoDepth - 1) / Math.max(1, params.P);
            const [er, eg, eb] = hexToRgb(palette[pres.echoColor % palette.length]);
            ctx.fillStyle = \`rgba(\${er},\${eg},\${eb},\${(alpha * 0.6).toFixed(3)})\`;
          } else {
            ctx.fillStyle = '#0a0e1a';
          }
          drawHexPath(ctx, x, y, hexSize - 1.5);
          ctx.fill();
          // faint border
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          const baseColor = palette[pres.colorIndex % palette.length];
          drawHexPath(ctx, x, y, hexSize - 1.5);
          if (pres.decayDepth !== null && pres.blinkOn) {
            // white overlay
            const proximity = (params.P - (pres.decayDepth - 1)) / Math.max(1, params.P);
            const overlayAlpha = 0.2 + 0.4 * proximity;
            const [br, bg, bb] = hexToRgb(baseColor);
            const wr = Math.round(br + (255 - br) * overlayAlpha);
            const wg = Math.round(bg + (255 - bg) * overlayAlpha);
            const wb = Math.round(bb + (255 - bb) * overlayAlpha);
            ctx.fillStyle = \`rgb(\${wr},\${wg},\${wb})\`;
          } else {
            ctx.fillStyle = baseColor;
          }
          ctx.fill();
        }
      } else {
        // Plain mode: no perspective
        const res = evalCell(q, r, tick, params, matrix);
        if (res.isEmpty) {
          ctx.fillStyle = '#0a0e1a';
          drawHexPath(ctx, x, y, hexSize - 1.5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = palette[res.colorIndex % palette.length];
          drawHexPath(ctx, x, y, hexSize - 1.5);
          ctx.fill();
        }
      }
    }
  }, []);

  // Animation loop
  useEffect(() => {
    let active = true;

    function loop() {
      if (!active) return;

      const { speed } = viewRef.current;
      if (speed > 0) {
        const now = Date.now();
        const elapsed = now - lastTickTimeRef.current;
        const ticksElapsed = Math.floor(elapsed / (TICK_MS / speed));
        if (ticksElapsed > 0) {
          tickRef.current += ticksElapsed;
          lastTickTimeRef.current += ticksElapsed * (TICK_MS / speed);
          setDisplayTick(tickRef.current);
          drawFrame();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    lastTickTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(loop);
    drawFrame();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawFrame();
    });
    ro.observe(parent);
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    drawFrame();

    return () => ro.disconnect();
  }, [drawFrame]);

  // Redraw when params or view change
  useEffect(() => {
    drawFrame();
  }, [params, view, drawFrame]);

  const fmt2 = (v: number) => v.toFixed(2);
  const fmt0 = (v: number) => String(Math.round(v));

  return (
    <div className="field-lab">
      <div className="field-lab__canvas-panel">
        <canvas ref={canvasRef} className="field-lab__canvas" />
        <div className="field-lab__overlay">
          tick {displayTick} · t={((displayTick / 12)).toFixed(1)}s
        </div>
      </div>

      <div className="field-lab__controls">
        <div className="field-lab__controls-header">
          <h1>Field Lab</h1>
          <div className="field-lab__playback">
            {([0, 1, 2, 4] as const).map(s => (
              <button
                key={s}
                className={view.speed === s ? 'active' : ''}
                onClick={() => { setView_('speed', s); lastTickTimeRef.current = Date.now(); }}
              >
                {s === 0 ? '⏸' : \`\${s}×\`}
              </button>
            ))}
          </div>
        </div>

        {/* Seed & World */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">World</p>

          <div className="field-lab__row">
            <span className="field-lab__label">Seed</span>
            <input
              className="field-lab__number"
              type="number"
              value={params.seed}
              onChange={e => setParam('seed', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="field-lab__row">
            <span className="field-lab__label">Colors (K)</span>
            <input
              className="field-lab__slider"
              type="range"
              min={2}
              max={16}
              step={1}
              value={params.K}
              onChange={e => setParam('K', parseInt(e.target.value))}
            />
            <span className="field-lab__value">{params.K}</span>
          </div>

          <div className="field-lab__row">
            <span className="field-lab__label">Mode</span>
            <select
              className="field-lab__mode-select"
              value={params.mode}
              onChange={e => setParam('mode', e.target.value as 'value' | 'hash')}
            >
              <option value="value">Value (smooth)</option>
              <option value="hash">Hash (crispy)</option>
            </select>
          </div>
        </div>

        {/* Dynamics */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">Dynamics</p>
          <Slider label="Time Scale" min={0} max={5} step={0.05} value={params.timeScale} onChange={v => setParam('timeScale', v)} format={fmt2} />
        </div>

        {/* Structure */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">Structure</p>
          <Slider label="Base Freq" min={0.1} max={4} step={0.05} value={params.baseFreq} onChange={v => setParam('baseFreq', v)} format={fmt2} />
          <Slider label="Density Thr." min={0} max={1} step={0.01} value={params.densityThreshold} onChange={v => setParam('densityThreshold', v)} format={fmt2} />
        </div>

        {/* Exploration */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">Exploration (extra dims)</p>
          <Slider label="u1 (X4 offset)" min={-10} max={10} step={0.1} value={params.u1} onChange={v => setParam('u1', v)} format={fmt2} />
          <Slider label="u2 (X5 offset)" min={-10} max={10} step={0.1} value={params.u2} onChange={v => setParam('u2', v)} format={fmt2} />
        </div>

        {/* Perspective */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">Time Perspective</p>
          <div className="field-lab__toggle-row">
            <span className="field-lab__label">Enable</span>
            <label className="field-lab__toggle">
              <input
                type="checkbox"
                checked={view.showPerspective}
                onChange={e => setView_('showPerspective', e.target.checked)}
              />
              <span className="field-lab__toggle-track" />
            </label>
          </div>
          <Slider label="Lookahead P" min={0} max={60} step={1} value={params.P} onChange={v => setParam('P', v)} format={fmt0} />
          <Slider label="Blink ON" min={1} max={24} step={1} value={params.blinkOnTicks} onChange={v => setParam('blinkOnTicks', v)} format={fmt0} />
          <Slider label="Blink OFF" min={1} max={24} step={1} value={params.blinkOffTicks} onChange={v => setParam('blinkOffTicks', v)} format={fmt0} />
        </div>

        {/* View */}
        <div className="field-lab__section">
          <p className="field-lab__section-title">View</p>
          <Slider label="Grid Radius" min={3} max={14} step={1} value={view.gridRadius} onChange={v => setView_('gridRadius', v)} format={fmt0} />
          <Slider label="Hex Size" min={10} max={50} step={1} value={view.hexSize} onChange={v => setView_('hexSize', v)} format={fmt0} />
        </div>

        {/* Reset */}
        <div className="field-lab__section">
          <div className="field-lab__row">
            <button
              style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#c8d4e8', cursor: 'pointer' }}
              onClick={() => {
                tickRef.current = 0;
                lastTickTimeRef.current = Date.now();
                setDisplayTick(0);
                setParams(DEFAULT_FIELD_PARAMS);
                setView(DEFAULT_VIEW);
              }}
            >
              Reset all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// ── field-lab/index.html ─────────────────────────────────────────────────────
write('field-lab/index.html', \`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Field Lab — Hexi Dev Tool</title>
    <link rel="icon" type="image/x-icon" href="../favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/fieldLab.tsx"></script>
  </body>
</html>
\`);

console.log('\\nDone! All field-lab files created.');
console.log('You can delete this script: scripts/setup-field-lab.js');
