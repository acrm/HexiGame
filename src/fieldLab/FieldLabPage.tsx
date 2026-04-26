import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMatrix,
  DEFAULT_FRACTAL_PARAMS,
  evalCell,
  evalCellFractalInfluence,
  evalCellPerspective,
  DEFAULT_FIELD_PARAMS,
  type FractalInfluenceResult,
  type FractalParams,
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
  visualizationMode: 'noise' | 'timePerspective' | 'fractalStack';
  fractalOverlayMode: 'matter' | 'influence' | 'causality';
  speed: number;
}

const DEFAULT_VIEW: ViewState = {
  gridRadius: 8,
  hexSize: 26,
  visualizationMode: 'timePerspective',
  fractalOverlayMode: 'matter',
  speed: 1,
};

interface FractalMetrics {
  avgAlpha: number;
  avgConfidence: number;
  avgInstability: number;
}

const DEFAULT_FRACTAL_METRICS: FractalMetrics = {
  avgAlpha: 0,
  avgConfidence: 0,
  avgInstability: 0,
};

function axialRound(qf: number, rf: number): [number, number] {
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  let s = Math.round(sf);

  const qDiff = Math.abs(q - qf);
  const rDiff = Math.abs(r - rf);
  const sDiff = Math.abs(s - sf);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  void s;
  return [q, r];
}

function pixelToAxial(x: number, y: number, size: number): [number, number] {
  const qf = (2 / 3) * x / size;
  const rf = ((-1 / 3) * x + (1 / Math.sqrt(3)) * y) / size;
  return axialRound(qf, rf);
}

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
  const hoverCellRef = useRef<[number, number] | null>(null);

  const [params, setParams] = useState<FieldParams>(DEFAULT_FIELD_PARAMS);
  const [fractal, setFractal] = useState<FractalParams>(DEFAULT_FRACTAL_PARAMS);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [displayTick, setDisplayTick] = useState(0);
  const [fractalMetrics, setFractalMetrics] = useState<FractalMetrics>(DEFAULT_FRACTAL_METRICS);
  const [hoverInfluence, setHoverInfluence] = useState<FractalInfluenceResult | null>(null);

  const paramsRef = useRef(params);
  const fractalRef = useRef(fractal);
  const viewRef = useRef(view);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { fractalRef.current = fractal; }, [fractal]);
  useEffect(() => { viewRef.current = view; }, [view]);

  const setParam = useCallback(<K extends keyof FieldParams>(key: K, value: FieldParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setViewValue = useCallback(<K extends keyof ViewState>(key: K, value: ViewState[K]) => {
    setView((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFractalValue = useCallback(<K extends keyof FractalParams>(key: K, value: FractalParams[K]) => {
    setFractal((prev) => ({ ...prev, [key]: value }));
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
    const currentFractal = fractalRef.current;
    const matrix = matrixRef.current;
    const palette = paletteRef.current;
    const tick = tickRef.current;

    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const cells = generateGrid(currentView.gridRadius);
    let metricsCount = 0;
    let metricsAlpha = 0;
    let metricsConfidence = 0;
    let metricsInstability = 0;
    const hovered = hoverCellRef.current;
    let hoveredInfluence: FractalInfluenceResult | null = null;

    for (const [q, r] of cells) {
      const [px, py] = projectAxial(q, r, currentView.hexSize);
      const x = cx + px;
      const y = cy + py;

      if (currentView.visualizationMode === 'timePerspective') {
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
      } else if (currentView.visualizationMode === 'noise') {
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
      } else {
        const base = evalCell(q, r, tick, currentParams, matrix);
        if (!base.isEmpty) {
          ctx.fillStyle = palette[base.colorIndex % palette.length];
          drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
          ctx.fill();
        } else {
          const influence = evalCellFractalInfluence(q, r, tick, currentParams, matrix, currentFractal);
          metricsCount += 1;
          metricsAlpha += influence.alpha;
          metricsConfidence += influence.confidence;
          metricsInstability += influence.instability;
          if (hovered && hovered[0] === q && hovered[1] === r) {
            hoveredInfluence = influence;
          }

          if (influence.dominantColor !== null && influence.alpha > 0) {
            const color = palette[influence.dominantColor % palette.length];
            const [rr, rg, rb] = hexToRgb(color);
            if (currentView.fractalOverlayMode === 'causality') {
              const tint = Math.round(120 + 135 * influence.confidence);
              ctx.fillStyle = `rgba(${tint},${tint},${tint},${(0.08 + 0.45 * influence.alpha).toFixed(3)})`;
              drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
              ctx.fill();
              ctx.strokeStyle = `rgba(${rr},${rg},${rb},${(0.2 + 0.7 * influence.confidence).toFixed(3)})`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            } else {
              const alpha = influence.alpha * currentFractal.overlayStrength;
              const strength = currentView.fractalOverlayMode === 'influence' ? 0.95 : 0.7;
              ctx.fillStyle = `rgba(${rr},${rg},${rb},${(alpha * strength).toFixed(3)})`;
              drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
              ctx.fill();
              ctx.strokeStyle = 'rgba(255,255,255,0.06)';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = '#0a0e1a';
            drawHexPath(ctx, x, y, currentView.hexSize - 1.5);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        if (hovered && hovered[0] === q && hovered[1] === r) {
          drawHexPath(ctx, x, y, currentView.hexSize - 1);
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.stroke();
        }
      }
    }

    if (currentView.visualizationMode === 'fractalStack') {
      if (metricsCount > 0) {
        setFractalMetrics({
          avgAlpha: metricsAlpha / metricsCount,
          avgConfidence: metricsConfidence / metricsCount,
          avgInstability: metricsInstability / metricsCount,
        });
      } else {
        setFractalMetrics(DEFAULT_FRACTAL_METRICS);
      }
      setHoverInfluence(hoveredInfluence);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left - rect.width / 2;
      const localY = event.clientY - rect.top - rect.height / 2;
      const [q, r] = pixelToAxial(localX, localY, viewRef.current.hexSize);
      hoverCellRef.current = [q, r];
      if (viewRef.current.speed === 0) {
        drawFrame();
      }
    };

    const onLeave = () => {
      hoverCellRef.current = null;
      setHoverInfluence(null);
      if (viewRef.current.speed === 0) {
        drawFrame();
      }
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
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
          {view.visualizationMode === 'fractalStack' ? ` · α=${fractalMetrics.avgAlpha.toFixed(2)} · conf=${fractalMetrics.avgConfidence.toFixed(2)}` : ''}
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
          <div className="field-lab__row">
            <span className="field-lab__label">Visualization</span>
            <select
              className="field-lab__mode-select"
              value={view.visualizationMode}
              onChange={(e) => setViewValue('visualizationMode', e.target.value as ViewState['visualizationMode'])}
            >
              <option value="noise">Noise</option>
              <option value="timePerspective">Time perspective</option>
              <option value="fractalStack">Fractal stack</option>
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
          <Slider label="Lookahead P" min={0} max={60} step={1} value={params.P} onChange={(v) => setParam('P', Math.round(v))} format={fmt0} />
          <Slider label="Blink ON" min={1} max={24} step={1} value={params.blinkOnTicks} onChange={(v) => setParam('blinkOnTicks', Math.round(v))} format={fmt0} />
          <Slider label="Blink OFF" min={1} max={24} step={1} value={params.blinkOffTicks} onChange={(v) => setParam('blinkOffTicks', Math.round(v))} format={fmt0} />
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Fractal Stack</p>
          <div className="field-lab__row">
            <span className="field-lab__label">Overlay mode</span>
            <select
              className="field-lab__mode-select"
              value={view.fractalOverlayMode}
              onChange={(e) => setViewValue('fractalOverlayMode', e.target.value as ViewState['fractalOverlayMode'])}
            >
              <option value="matter">Matter</option>
              <option value="influence">Influence</option>
              <option value="causality">Causality</option>
            </select>
          </div>
          <Slider label="Max depth" min={1} max={4} step={1} value={fractal.maxDepth} onChange={(v) => setFractalValue('maxDepth', Math.round(v))} format={fmt0} />
          <Slider label="Layer gain" min={0} max={2} step={0.01} value={fractal.layerGain} onChange={(v) => setFractalValue('layerGain', v)} format={fmt2} />
          <Slider label="Layer falloff" min={2} max={16} step={0.1} value={fractal.layerFalloff} onChange={(v) => setFractalValue('layerFalloff', v)} format={fmt2} />
          <Slider label="Core weight" min={0} max={2} step={0.01} value={fractal.coreWeight} onChange={(v) => setFractalValue('coreWeight', v)} format={fmt2} />
          <Slider label="Ring weight" min={0} max={1} step={0.01} value={fractal.ringWeight} onChange={(v) => setFractalValue('ringWeight', v)} format={fmt2} />
          <Slider label="Antagonism" min={0} max={2} step={0.01} value={fractal.antagonism} onChange={(v) => setFractalValue('antagonism', v)} format={fmt2} />
          <Slider label="Purity exp" min={0.2} max={3} step={0.05} value={fractal.purityExponent} onChange={(v) => setFractalValue('purityExponent', v)} format={fmt2} />
          <Slider label="Alpha gain" min={0} max={4} step={0.05} value={fractal.alphaGain} onChange={(v) => setFractalValue('alphaGain', v)} format={fmt2} />
          <Slider label="Alpha cutoff" min={0} max={0.2} step={0.005} value={fractal.alphaCutoff} onChange={(v) => setFractalValue('alphaCutoff', v)} format={fmt2} />
          <Slider label="Overlay str." min={0} max={1} step={0.01} value={fractal.overlayStrength} onChange={(v) => setFractalValue('overlayStrength', v)} format={fmt2} />
          <div className="field-lab__row">
            <span className="field-lab__label">Avg instability</span>
            <span className="field-lab__value">{fractalMetrics.avgInstability.toFixed(2)}</span>
          </div>
          {hoverInfluence ? (
            <>
              <div className="field-lab__row">
                <span className="field-lab__label">Hover α/conf</span>
                <span className="field-lab__value">{hoverInfluence.alpha.toFixed(2)} / {hoverInfluence.confidence.toFixed(2)}</span>
              </div>
              <div className="field-lab__row">
                <span className="field-lab__label">Hover contrib</span>
                <span className="field-lab__value">{hoverInfluence.contributions.length}</span>
              </div>
            </>
          ) : null}
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
                setFractal(DEFAULT_FRACTAL_PARAMS);
                setView(DEFAULT_VIEW);
                setFractalMetrics(DEFAULT_FRACTAL_METRICS);
                setHoverInfluence(null);
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
