import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vv - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const hex = (n: number) => {
    const sHex = Math.round((n + m) * 255).toString(16);
    return sHex.length === 1 ? `0${sHex}` : sHex;
  };
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function buildPalette(k: number): string[] {
  const step = 360 / k;
  return Array.from({ length: k }, (_, i) => hsvToHex((30 + i * step) % 360, 70, 75));
}

function projectAxial(q: number, r: number, size: number): [number, number] {
  return [size * 1.5 * q, size * Math.sqrt(3) * (r + q / 2)];
}

function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function axialDistance(q: number, r: number): number {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

function generateGrid(radius: number): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      if (axialDistance(q, r) <= radius) cells.push([q, r]);
    }
  }
  return cells;
}

interface ViewState {
  gridRadius: number;
  hexSize: number;
  showPerspective: boolean;
  speed: number;
}

const DEFAULT_VIEW: ViewState = {
  gridRadius: 8,
  hexSize: 26,
  showPerspective: true,
  speed: 1,
};

function Slider(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const { label, min, max, step, value, onChange, format } = props;
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
        onChange={(e) => onChange(parseFloat(e.target.value))}
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
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setViewValue = useCallback(<K extends keyof ViewState>(key: K, value: ViewState[K]) => {
    setView((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    matrixRef.current = buildMatrix(params.seed);
  }, [params.seed]);

  useEffect(() => {
    paletteRef.current = buildPalette(params.K);
  }, [params.K]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const currentParams = paramsRef.current;
    const currentView = viewRef.current;
    const matrix = matrixRef.current;
    const palette = paletteRef.current;
    const tick = tickRef.current;

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const cells = generateGrid(currentView.gridRadius);

    for (const [q, r] of cells) {
      const [px, py] = projectAxial(q, r, currentView.hexSize);
      const x = cx + px;
      const y = cy + py;

      if (currentView.showPerspective) {
        const pres = evalCellPerspective(q, r, tick, currentParams, matrix);
        if (pres.isEmpty) {
          if (pres.echoColor !== null && pres.blinkOn) {
            const alpha = 1 - (pres.echoDepth - 1) / Math.max(1, currentParams.P);
            const [er, eg, eb] = hexToRgb(palette[pres.echoColor % palette.length]);
            ctx.fillStyle = `rgba(${er},${eg},${eb},${(alpha * 0.6).toFixed(3)})`;
          } else {
            ctx.fillStyle = '#0a0e1a';
          }
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          const baseColor = palette[pres.colorIndex % palette.length];
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          if (pres.decayDepth !== null && pres.blinkOn) {
            const proximity = (currentParams.P - (pres.decayDepth - 1)) / Math.max(1, currentParams.P);
            const overlayAlpha = 0.2 + 0.4 * proximity;
            const [br, bg, bb] = hexToRgb(baseColor);
            const wr = Math.round(br + (255 - br) * overlayAlpha);
            const wg = Math.round(bg + (255 - bg) * overlayAlpha);
            const wb = Math.round(bb + (255 - bb) * overlayAlpha);
            ctx.fillStyle = `rgb(${wr},${wg},${wb})`;
          } else {
            ctx.fillStyle = baseColor;
          }
          ctx.fill();
        }
      } else {
        const res = evalCell(q, r, tick, currentParams, matrix);
        if (res.isEmpty) {
          ctx.fillStyle = '#0a0e1a';
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = palette[res.colorIndex % palette.length];
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          ctx.fill();
        }
      }
    }
  }, []);

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
          tick {displayTick} · t={(displayTick / 12).toFixed(1)}s
        </div>
      </div>

      <div className="field-lab__controls">
        <div className="field-lab__controls-header">
          <h1>Field Lab</h1>
          <div className="field-lab__playback">
            {[0, 1, 2, 4].map((s) => (
              <button
                key={s}
                className={view.speed === s ? 'active' : ''}
                onClick={() => {
                  setViewValue('speed', s);
                  lastTickTimeRef.current = Date.now();
                }}
              >
                {s === 0 ? 'pause' : `${s}x`}
              </button>
            ))}
          </div>
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">World</p>
          <div className="field-lab__row">
            <span className="field-lab__label">Seed</span>
            <input
              className="field-lab__number"
              type="number"
              value={params.seed}
              onChange={(e) => setParam('seed', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <Slider
            label="Colors (K)"
            min={2}
            max={16}
            step={1}
            value={params.K}
            onChange={(v) => setParam('K', Math.round(v))}
            format={fmt0}
          />
          <div className="field-lab__row">
            <span className="field-lab__label">Mode</span>
            <select
              className="field-lab__mode-select"
              value={params.mode}
              onChange={(e) => setParam('mode', e.target.value as 'value' | 'hash')}
            >
              <option value="value">Value (smooth)</option>
              <option value="hash">Hash (crispy)</option>
            </select>
          </div>
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Dynamics</p>
          <Slider label="Time Scale" min={0} max={5} step={0.05} value={params.timeScale} onChange={(v) => setParam('timeScale', v)} format={fmt2} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Structure</p>
          <Slider label="Base Freq" min={0.1} max={4} step={0.05} value={params.baseFreq} onChange={(v) => setParam('baseFreq', v)} format={fmt2} />
          <Slider label="Density Thr." min={0} max={1} step={0.01} value={params.densityThreshold} onChange={(v) => setParam('densityThreshold', v)} format={fmt2} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Exploration (extra dims)</p>
          <Slider label="u1 (X4 offset)" min={-10} max={10} step={0.1} value={params.u1} onChange={(v) => setParam('u1', v)} format={fmt2} />
          <Slider label="u2 (X5 offset)" min={-10} max={10} step={0.1} value={params.u2} onChange={(v) => setParam('u2', v)} format={fmt2} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Time Perspective</p>
          <div className="field-lab__toggle-row">
            <span className="field-lab__label">Enable</span>
            <label className="field-lab__toggle">
              <input
                type="checkbox"
                checked={view.showPerspective}
                onChange={(e) => setViewValue('showPerspective', e.target.checked)}
              />
              <span className="field-lab__toggle-track" />
            </label>
          </div>
          <Slider label="Lookahead P" min={0} max={60} step={1} value={params.P} onChange={(v) => setParam('P', Math.round(v))} format={fmt0} />
          <Slider label="Blink ON" min={1} max={24} step={1} value={params.blinkOnTicks} onChange={(v) => setParam('blinkOnTicks', Math.round(v))} format={fmt0} />
          <Slider label="Blink OFF" min={1} max={24} step={1} value={params.blinkOffTicks} onChange={(v) => setParam('blinkOffTicks', Math.round(v))} format={fmt0} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">View</p>
          <Slider label="Grid Radius" min={3} max={14} step={1} value={view.gridRadius} onChange={(v) => setViewValue('gridRadius', Math.round(v))} format={fmt0} />
          <Slider label="Hex Size" min={10} max={50} step={1} value={view.hexSize} onChange={(v) => setViewValue('hexSize', Math.round(v))} format={fmt0} />
        </div>

        <div className="field-lab__section">
          <div className="field-lab__row">
            <button
              style={{
                flex: 1,
                padding: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4,
                color: '#c8d4e8',
                cursor: 'pointer',
              }}
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
