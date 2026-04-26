import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildMatrix,
  evalCell,
  evalCellPerspective,
  parseManualLayerDefinition,
  DEFAULT_FIELD_PARAMS,
  DEFAULT_MANUAL_LAYER_TEXT,
  type FieldMatrix,
  type FieldParams,
  type ManualFractalHex,
  type ManualFractalLayerIndex,
} from './fieldLogic';
import './FieldLabPage.css';

const TICK_RATE = 12;
const TICK_MS = 1000 / TICK_RATE;
const LAYERS: ManualFractalLayerIndex[] = [-2, -1, 0, 1, 2];

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

function buildPalette(k: number): string[] {
  const safeCount = Math.max(1, k);
  const step = 360 / safeCount;
  return Array.from({ length: safeCount }, (_, i) => hsvToHex((30 + i * step) % 360, 70, 75));
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
  visualizationMode: 'noise' | 'fractalStructures';
  noiseView: 'plain' | 'timePerspective';
  speed: number;
  activeLayer: ManualFractalLayerIndex;
  layerScaleBase: number;
  layerDisplayScale: number;
}

const DEFAULT_VIEW: ViewState = {
  gridRadius: 8,
  hexSize: 26,
  visualizationMode: 'noise',
  noiseView: 'timePerspective',
  speed: 1,
  activeLayer: 0,
  layerScaleBase: 3,
  layerDisplayScale: 1,
};

type LayerCellsByIndex = Record<ManualFractalLayerIndex, ManualFractalHex[]>;
type LayerTextByIndex = Record<ManualFractalLayerIndex, string>;
type LayerErrorsByIndex = Record<ManualFractalLayerIndex, string[]>;

function parseAllManualLayers(textByLayer: LayerTextByIndex, colorCount: number): {
  cellsByLayer: LayerCellsByIndex;
  errorsByLayer: LayerErrorsByIndex;
} {
  const cellsByLayer = {} as LayerCellsByIndex;
  const errorsByLayer = {} as LayerErrorsByIndex;
  for (const layer of LAYERS) {
    const parsed = parseManualLayerDefinition(textByLayer[layer], colorCount);
    cellsByLayer[layer] = parsed.cells;
    errorsByLayer[layer] = parsed.errors;
  }
  return { cellsByLayer, errorsByLayer };
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

  const [params, setParams] = useState<FieldParams>(DEFAULT_FIELD_PARAMS);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const [displayTick, setDisplayTick] = useState(0);
  const [layerText, setLayerText] = useState<LayerTextByIndex>(DEFAULT_MANUAL_LAYER_TEXT);

  const initialManual = parseAllManualLayers(DEFAULT_MANUAL_LAYER_TEXT, DEFAULT_FIELD_PARAMS.K);
  const [manualCellsByLayer, setManualCellsByLayer] = useState<LayerCellsByIndex>(initialManual.cellsByLayer);
  const [manualErrorsByLayer, setManualErrorsByLayer] = useState<LayerErrorsByIndex>(initialManual.errorsByLayer);

  const paramsRef = useRef(params);
  const viewRef = useRef(view);
  const manualCellsRef = useRef(manualCellsByLayer);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { manualCellsRef.current = manualCellsByLayer; }, [manualCellsByLayer]);

  const setParam = useCallback(<K extends keyof FieldParams>(key: K, value: FieldParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setViewValue = useCallback(<K extends keyof ViewState>(key: K, value: ViewState[K]) => {
    setView((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateLayerText = useCallback((layer: ManualFractalLayerIndex, nextText: string) => {
    setLayerText((prev) => {
      const next = { ...prev, [layer]: nextText };
      const parsed = parseAllManualLayers(next, paramsRef.current.K);
      setManualCellsByLayer(parsed.cellsByLayer);
      setManualErrorsByLayer(parsed.errorsByLayer);
      return next;
    });
  }, []);

  useEffect(() => {
    matrixRef.current = buildMatrix(params.seed);
  }, [params.seed]);

  useEffect(() => {
    paletteRef.current = buildPalette(params.K);
    const parsed = parseAllManualLayers(layerText, params.K);
    setManualCellsByLayer(parsed.cellsByLayer);
    setManualErrorsByLayer(parsed.errorsByLayer);
  }, [params.K, layerText]);

  const drawNoiseFrame = (
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
          if (pres.echoColor !== null && pres.blinkOn) {
            const alpha = 1 - (pres.echoDepth - 1) / Math.max(1, currentParams.P);
            const color = palette[pres.echoColor % palette.length];
            const rr = parseInt(color.slice(1, 3), 16);
            const rg = parseInt(color.slice(3, 5), 16);
            const rb = parseInt(color.slice(5, 7), 16);
            ctx.fillStyle = `rgba(${rr},${rg},${rb},${(alpha * 0.6).toFixed(3)})`;
          } else {
            ctx.fillStyle = '#0a0e1a';
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

  const drawFractalStructureFrame = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentView: ViewState,
    palette: string[],
    cellsByLayer: LayerCellsByIndex,
  ) => {
    const cx = width / 2;
    const cy = height / 2;
    const baseSize = currentView.hexSize * currentView.layerDisplayScale;

    const guideCells = generateGrid(currentView.gridRadius);
    for (const [q, r] of guideCells) {
      const [gx, gy] = projectAxial(q, r, baseSize);
      drawHexPath(ctx, cx + gx, cy + gy, Math.max(2, baseSize - 1.5));
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    for (const layer of [...LAYERS].sort((a, b) => b - a)) {
      const delta = layer - currentView.activeLayer;
      const layerFactor = Math.pow(currentView.layerScaleBase, delta);
      const layerAlpha = layer === currentView.activeLayer
        ? 0.95
        : Math.max(0.16, 0.55 - Math.abs(delta) * 0.12);

      for (const cell of cellsByLayer[layer]) {
        const displayQ = cell.q * layerFactor;
        const displayR = cell.r * layerFactor;
        const cellSize = baseSize * layerFactor;
        if (!Number.isFinite(cellSize) || cellSize < 1 || cellSize > 1200) {
          continue;
        }

        const [px, py] = projectAxial(displayQ, displayR, baseSize);
        const x = cx + px;
        const y = cy + py;
        const color = palette[cell.colorIndex % palette.length];

        drawHexPath(ctx, x, y, cellSize - 0.8);
        ctx.globalAlpha = layerAlpha;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = layer === currentView.activeLayer
          ? 'rgba(255,255,255,0.82)'
          : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = layer === currentView.activeLayer ? 1.25 : 0.8;
        ctx.stroke();
      }
    }
  };

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
    const cellsByLayer = manualCellsRef.current;
    const tick = tickRef.current;

    ctx.clearRect(0, 0, width, height);
    if (currentView.visualizationMode === 'noise') {
      drawNoiseFrame(ctx, width, height, tick, currentParams, currentView, matrix, palette);
    } else {
      drawFractalStructureFrame(ctx, width, height, currentView, palette, cellsByLayer);
    }
  }, []);

  useEffect(() => {
    let active = true;
    function loop() {
      if (!active) return;
      const currentView = viewRef.current;
      if (currentView.visualizationMode === 'noise' && currentView.speed > 0) {
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
  }, [params, view, manualCellsByLayer, drawFrame]);

  const fmt2 = (v: number) => v.toFixed(2);
  const fmt0 = (v: number) => String(Math.round(v));

  return (
    <div className="field-lab">
      <div className="field-lab__canvas-panel">
        <canvas ref={canvasRef} className="field-lab__canvas" />
        <div className="field-lab__overlay">
          mode={view.visualizationMode} · tick {displayTick} · layer {view.activeLayer}
        </div>
      </div>

      <div className="field-lab__controls">
        <div className="field-lab__controls-header">
          <h1>Field Lab</h1>
          {view.visualizationMode === 'noise' ? (
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
          ) : null}
        </div>

        <div className="field-lab__section">
          <p className="field-lab__section-title">Mode</p>
          <div className="field-lab__row">
            <span className="field-lab__label">Visualization</span>
            <select
              className="field-lab__mode-select"
              value={view.visualizationMode}
              onChange={(e) => setViewValue('visualizationMode', e.target.value as ViewState['visualizationMode'])}
            >
              <option value="noise">Noise (random)</option>
              <option value="fractalStructures">Fractal structures (manual)</option>
            </select>
          </div>
        </div>

        {view.visualizationMode === 'noise' ? (
          <>
            <div className="field-lab__section">
              <p className="field-lab__section-title">Noise World</p>
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
                <span className="field-lab__label">Noise mode</span>
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
                <span className="field-lab__label">Render view</span>
                <select
                  className="field-lab__mode-select"
                  value={view.noiseView}
                  onChange={(e) => setViewValue('noiseView', e.target.value as ViewState['noiseView'])}
                >
                  <option value="plain">Plain</option>
                  <option value="timePerspective">Time perspective</option>
                </select>
              </div>
            </div>

            <div className="field-lab__section">
              <p className="field-lab__section-title">Noise Dynamics</p>
              <Slider label="Time Scale" min={0} max={5} step={0.05} value={params.timeScale} onChange={(v) => setParam('timeScale', v)} format={fmt2} />
              <Slider label="Base Freq" min={0.1} max={4} step={0.05} value={params.baseFreq} onChange={(v) => setParam('baseFreq', v)} format={fmt2} />
              <Slider label="Density Thr." min={0} max={1} step={0.01} value={params.densityThreshold} onChange={(v) => setParam('densityThreshold', v)} format={fmt2} />
              <Slider label="u1 (X4 offset)" min={-10} max={10} step={0.1} value={params.u1} onChange={(v) => setParam('u1', v)} format={fmt2} />
              <Slider label="u2 (X5 offset)" min={-10} max={10} step={0.1} value={params.u2} onChange={(v) => setParam('u2', v)} format={fmt2} />
              <Slider label="Lookahead P" min={0} max={60} step={1} value={params.P} onChange={(v) => setParam('P', Math.round(v))} format={fmt0} />
              <Slider label="Blink ON" min={1} max={24} step={1} value={params.blinkOnTicks} onChange={(v) => setParam('blinkOnTicks', Math.round(v))} format={fmt0} />
              <Slider label="Blink OFF" min={1} max={24} step={1} value={params.blinkOffTicks} onChange={(v) => setParam('blinkOffTicks', Math.round(v))} format={fmt0} />
            </div>
          </>
        ) : (
          <>
            <div className="field-lab__section">
              <p className="field-lab__section-title">Fractal Structures</p>
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
                <span className="field-lab__label">Active layer</span>
                <select
                  className="field-lab__mode-select"
                  value={view.activeLayer}
                  onChange={(e) => setViewValue('activeLayer', Number(e.target.value) as ManualFractalLayerIndex)}
                >
                  {LAYERS.map((layer) => (
                    <option key={layer} value={layer}>{layer}</option>
                  ))}
                </select>
              </div>
              <Slider label="Scale base" min={2} max={4} step={0.1} value={view.layerScaleBase} onChange={(v) => setViewValue('layerScaleBase', v)} format={fmt2} />
              <Slider label="Display scale" min={0.3} max={2.5} step={0.05} value={view.layerDisplayScale} onChange={(v) => setViewValue('layerDisplayScale', v)} format={fmt2} />
            </div>

            {LAYERS.map((layer) => (
              <div className="field-lab__section" key={`layer-editor-${layer}`}>
                <p className="field-lab__section-title">Layer {layer}</p>
                <textarea
                  className="field-lab__textarea"
                  value={layerText[layer]}
                  onChange={(e) => updateLayerText(layer, e.target.value)}
                  rows={5}
                  spellCheck={false}
                />
                <p className="field-lab__hint">Format: q r colorIndex</p>
                {manualErrorsByLayer[layer].slice(0, 2).map((error) => (
                  <p className="field-lab__error" key={`${layer}-${error}`}>{error}</p>
                ))}
                {manualErrorsByLayer[layer].length > 2 ? (
                  <p className="field-lab__error">...and {manualErrorsByLayer[layer].length - 2} more</p>
                ) : null}
              </div>
            ))}
          </>
        )}

        <div className="field-lab__section">
          <p className="field-lab__section-title">View</p>
          <Slider label="Grid Radius" min={3} max={16} step={1} value={view.gridRadius} onChange={(v) => setViewValue('gridRadius', Math.round(v))} format={fmt0} />
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
                setLayerText(DEFAULT_MANUAL_LAYER_TEXT);
                const parsed = parseAllManualLayers(DEFAULT_MANUAL_LAYER_TEXT, DEFAULT_FIELD_PARAMS.K);
                setManualCellsByLayer(parsed.cellsByLayer);
                setManualErrorsByLayer(parsed.errorsByLayer);
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
