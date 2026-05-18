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
const PALETTE_SIZE = 6;

function hsvToHex(h: number, s: number, v: number): string {
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vv - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const hex = (n: number) => {
    const sHex = Math.round((n + m) * 255).toString(16);
    return sHex.length === 1 ? `0${sHex}` : sHex;
  };

  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function buildPalette(k: number): string[] {
  const step = 360 / Math.max(1, k);
  return Array.from({ length: Math.max(1, k) }, (_, i) => hsvToHex((30 + i * step) % 360, 70, 75));
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
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
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
      if (axialDistance(q, r) <= radius) {
        cells.push([q, r]);
      }
    }
  }

  return cells;
}

interface ViewState {
  gridRadius: number;
  hexSize: number;
  noiseView: 'plain' | 'timePerspective';
  speed: number;
}

const DEFAULT_VIEW: ViewState = {
  gridRadius: 8,
  hexSize: 26,
  noiseView: 'timePerspective',
  speed: 1,
};

function Slider(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
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
        onChange={(event) => onChange(parseFloat(event.target.value))}
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
  const paletteRef = useRef<string[]>(buildPalette(PALETTE_SIZE));

  const [params, setParams] = useState<FieldParams>(DEFAULT_FIELD_PARAMS);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [displayTick, setDisplayTick] = useState(0);

  const paramsRef = useRef(params);
  const viewRef = useRef(view);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const setParam = useCallback(<K extends keyof FieldParams>(key: K, value: FieldParams[K]) => {
    setParams((previous) => ({ ...previous, [key]: value }));
  }, []);

  const setViewValue = useCallback(<K extends keyof ViewState>(key: K, value: ViewState[K]) => {
    setView((previous) => ({ ...previous, [key]: value }));
  }, []);

  useEffect(() => {
    matrixRef.current = buildMatrix(params.seed);
  }, [params.seed]);

  useEffect(() => {
    paletteRef.current = buildPalette(PALETTE_SIZE);
  }, []);

  const drawNoise = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tick: number,
    currentParams: FieldParams,
    currentView: ViewState,
    matrix: FieldMatrix,
    palette: string[],
  ) => {
    const cx = width / 2;
    const cy = height / 2;
    const cells = generateGrid(currentView.gridRadius);

    for (const [q, r] of cells) {
      const [px, py] = projectAxial(q, r, currentView.hexSize);
      const x = cx + px;
      const y = cy + py;

      if (currentView.noiseView === 'timePerspective') {
        const pres = evalCellPerspective(q, r, tick, currentParams, matrix);
        if (pres.isEmpty) {
          ctx.fillStyle = '#0a0e1a';
          if (pres.echoColor !== null && pres.blinkOn) {
            const color = palette[pres.echoColor % palette.length];
            const rr = parseInt(color.slice(1, 3), 16);
            const rg = parseInt(color.slice(3, 5), 16);
            const rb = parseInt(color.slice(5, 7), 16);
            const alpha = 1 - (pres.echoDepth - 1) / Math.max(1, currentParams.P);
            ctx.fillStyle = `rgba(${rr},${rg},${rb},${(alpha * 0.6).toFixed(3)})`;
          }

          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = palette[pres.colorIndex % palette.length];
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
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
  };

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const { width, height } = canvas;
    const currentParams = paramsRef.current;
    const currentView = viewRef.current;
    const matrix = matrixRef.current;
    const palette = paletteRef.current;

    ctx.clearRect(0, 0, width, height);
    drawNoise(ctx, width, height, tickRef.current, currentParams, currentView, matrix, palette);
  }, []);

  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) {
        return;
      }

      const currentView = viewRef.current;
      if (currentView.speed > 0) {
        const now = Date.now();
        const elapsed = now - lastTickTimeRef.current;
        const ticksElapsed = Math.floor(elapsed / (TICK_MS / currentView.speed));

        if (ticksElapsed > 0) {
          tickRef.current += ticksElapsed;
          lastTickTimeRef.current += ticksElapsed * (TICK_MS / currentView.speed);
          setDisplayTick(tickRef.current);
          drawFrame();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

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
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawFrame();
    });

    resizeObserver.observe(parent);
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    drawFrame();

    return () => {
      resizeObserver.disconnect();
    };
  }, [drawFrame]);

  useEffect(() => {
    drawFrame();
  }, [params, view, drawFrame]);

  const fmt2 = (value: number) => value.toFixed(2);
  const fmt0 = (value: number) => String(Math.round(value));

  return (
    <div className="field-lab">
      <div className="field-lab__canvas-panel">
        <canvas ref={canvasRef} className="field-lab__canvas" />
        <div className="field-lab__overlay">noise · tick {displayTick}</div>
      </div>

      <div className="field-lab__controls">
        <div className="field-lab__controls-header">
          <h1>Field Lab</h1>
          <div className="field-lab__playback">
            {[0, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                className={view.speed === speed ? 'active' : ''}
                onClick={() => {
                  setViewValue('speed', speed);
                  lastTickTimeRef.current = Date.now();
                }}
              >
                {speed === 0 ? 'pause' : `${speed}x`}
              </button>
            ))}
          </div>
          <a className="field-lab__devlab-link" href="../devlab/">DevLab index</a>
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Noise</p>
          <div className="field-lab__row">
            <span className="field-lab__label">Seed</span>
            <input
              className="field-lab__number"
              type="number"
              value={params.seed}
              onChange={(event) => setParam('seed', parseInt(event.target.value, 10) || 0)}
            />
          </div>
          <div className="field-lab__row">
            <span className="field-lab__label">Render</span>
            <select
              className="field-lab__mode-select"
              value={view.noiseView}
              onChange={(event) => setViewValue('noiseView', event.target.value as ViewState['noiseView'])}
            >
              <option value="plain">Plain</option>
              <option value="timePerspective">Time perspective</option>
            </select>
          </div>
          <Slider label="Time Scale" min={0} max={5} step={0.05} value={params.timeScale} onChange={(value) => setParam('timeScale', value)} format={fmt2} />
          <Slider label="Base Freq" min={0.1} max={4} step={0.05} value={params.baseFreq} onChange={(value) => setParam('baseFreq', value)} format={fmt2} />
          <Slider label="Density Thr." min={0} max={1} step={0.01} value={params.densityThreshold} onChange={(value) => setParam('densityThreshold', value)} format={fmt2} />
          <Slider label="u1" min={-10} max={10} step={0.1} value={params.u1} onChange={(value) => setParam('u1', value)} format={fmt2} />
          <Slider label="u2" min={-10} max={10} step={0.1} value={params.u2} onChange={(value) => setParam('u2', value)} format={fmt2} />
          <Slider label="Lookahead P" min={0} max={60} step={1} value={params.P} onChange={(value) => setParam('P', Math.round(value))} format={fmt0} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">View</p>
          <Slider label="Grid Radius" min={3} max={16} step={1} value={view.gridRadius} onChange={(value) => setViewValue('gridRadius', Math.round(value))} format={fmt0} />
          <Slider label="Hex Size" min={10} max={50} step={1} value={view.hexSize} onChange={(value) => setViewValue('hexSize', Math.round(value))} format={fmt0} />
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
                setDisplayTick(0);
                lastTickTimeRef.current = Date.now();
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
