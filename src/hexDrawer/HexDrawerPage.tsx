import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import type { HexData } from './Hex';
import {
  HexGrid,
  type HexGridMetrics,
  type HexHierarchyNode,
} from './HexGrid';
import { HexiObjectsStorage } from './HexiObjectsStorage';
import { InputState } from './InputState';
import { Vec2 } from './Vec2';
import './HexDrawerPage.css';

interface CellFormState {
  color: string;
  shiftX: number;
  shiftY: number;
  elongatingFactor: number;
  rotation: number;
}

interface PointerState {
  rightDown: boolean;
  rightDrag: boolean;
  rightStart: Vec2 | null;
  rightLast: Vec2 | null;
}

const DEFAULT_CELL_FORM: CellFormState = {
  color: '#face8d',
  shiftX: 0,
  shiftY: 0,
  elongatingFactor: 1,
  rotation: 0,
};

const CALIBER_STORAGE_KEY = 'hexdrawer.caliber';
const POINTY_STORAGE_KEY = 'hexdrawer.pointyUpward';
const ZOOM_STORAGE_KEY = 'hexdrawer.zoomFactor';

const MIN_CALIBER = -6;
const MAX_CALIBER = 6;
const CALIBER_STEP = 0.5;
const MIN_ZOOM_FACTOR = 1;
const MAX_ZOOM_FACTOR = 729;
const ZOOM_MIN = 1;
const ZOOM_MAX = 729;
const ZOOM_DIVISIONS = 12;
const ZOOM_MARKS = Array.from(
  { length: ZOOM_DIVISIONS + 1 },
  (_, index) => zoomFromStepIndex(ZOOM_DIVISIONS - index),
);
const CALIBER_STEPS = Array.from(
  { length: Math.round((MAX_CALIBER - MIN_CALIBER) / CALIBER_STEP) + 1 },
  (_, index) => Number((MIN_CALIBER + index * CALIBER_STEP).toFixed(1)),
);
const RMB_DRAG_THRESHOLD = 4;
const INPUT_UPDATE_MIN_INTERVAL_MS = 16;
const METRICS_REFRESH_MIN_INTERVAL_MS = 100;

function sanitizeFileName(value: string): string {
  const trimmed = value.trim();
  const fallback = trimmed.length > 0 ? trimmed : 'hexi-object';
  return fallback.replace(/[^a-z0-9_-]+/gi, '_').replace(/_+/g, '_');
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampCaliber(value: number): number {
  const snapped = Math.round(value / CALIBER_STEP) * CALIBER_STEP;
  return Math.max(MIN_CALIBER, Math.min(MAX_CALIBER, snapped));
}

function clampZoomRange(value: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

function clampZoomFactor(value: number): number {
  const clamped = clampZoomRange(value);
  return zoomFromStepIndex(zoomSliderIndexFromValue(clamped));
}

function clampStepIndex(value: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, value));
}

function stepIndexFromValue(value: number, steps: readonly number[]): number {
  let nearestIndex = 0;
  let minDistance = Math.abs(value - steps[0]);

  for (let index = 1; index < steps.length; index += 1) {
    const distance = Math.abs(value - steps[index]);
    if (distance < minDistance) {
      nearestIndex = index;
      minDistance = distance;
    }
  }

  return nearestIndex;
}

function caliberFromStepIndex(index: number): number {
  return CALIBER_STEPS[clampStepIndex(index, CALIBER_STEPS.length - 1)] ?? CALIBER_STEPS[0];
}

function zoomFromStepIndex(index: number): number {
  const safeIndex = clampStepIndex(index, ZOOM_DIVISIONS);
  const t = safeIndex / ZOOM_DIVISIONS;
  return ZOOM_MIN * (ZOOM_MAX / ZOOM_MIN) ** t;
}

function zoomSliderIndexFromValue(value: number): number {
  const clamped = clampZoomRange(value);
  const t = Math.log(clamped / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
  return clampStepIndex(Math.round(t * ZOOM_DIVISIONS), ZOOM_DIVISIONS);
}

function normalizeSavedZoomFactor(value: number): number {
  if (!Number.isFinite(value)) {
    return ZOOM_MIN;
  }

  return clampZoomFactor(value);
}

function zoomPowerFromFactor(value: number): number {
  const clamped = clampZoomRange(value);
  const exponent = Math.log(clamped) / Math.log(3);
  return Math.round(exponent * 2) / 2;
}

function formatZoomPower(value: number): string {
  const exponent = zoomPowerFromFactor(value);
  return exponent.toFixed(1);
}

function caliberFromCellIndex(index: string): number {
  const depth = Math.max(0, index.length - 1);
  return clampCaliber(MIN_CALIBER + depth);
}

function getCanvasPosition(event: React.MouseEvent<HTMLCanvasElement>): Vec2 {
  const rect = event.currentTarget.getBoundingClientRect();
  return new Vec2(event.clientX - rect.left, event.clientY - rect.top);
}

function renderHierarchyNodes(
  nodes: HexHierarchyNode[],
  selectedIndex: string,
  onSelect: (index: string) => void,
): React.ReactNode {
  return nodes.map((node) => (
    <li key={node.index} className="hex-drawer__tree-item">
      <button
        type="button"
        className={`hex-drawer__tree-node ${selectedIndex === node.index ? 'active' : ''}`}
        onClick={() => onSelect(node.index)}
        disabled={!node.hasHex}
      >
        <span className="hex-drawer__tree-index">{node.index}</span>
        <span className="hex-drawer__tree-level">L{node.level}</span>
        <span className="hex-drawer__tree-dot">{node.hasHex ? '●' : '○'}</span>
      </button>
      {node.children.length > 0 ? (
        <ul className="hex-drawer__tree-list">
          {renderHierarchyNodes(node.children, selectedIndex, onSelect)}
        </ul>
      ) : null}
    </li>
  ));
}

export default function HexDrawerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const objectsStorageRef = useRef<HexiObjectsStorage | null>(null);
  const hexGridRef = useRef<HexGrid | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inputRef = useRef(new InputState());
  const openedObjectIdRef = useRef<string | null>(null);
  const lastInputUpdateMsRef = useRef(0);
  const lastMetricsRefreshMsRef = useRef(0);
  const pointerRef = useRef<PointerState>({
    rightDown: false,
    rightDrag: false,
    rightStart: null,
    rightLast: null,
  });

  const [objects, setObjects] = useState<Array<{ id: string; name: string }>>([]);
  const [openedObjectId, setOpenedObjectId] = useState<string | null>(null);
  const [objectName, setObjectName] = useState('');
  const [caliber, setCaliber] = useState(MIN_CALIBER);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pointyUpward, setPointyUpward] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCellIndex, setSelectedCellIndex] = useState('');
  const [cellForm, setCellForm] = useState<CellFormState>(DEFAULT_CELL_FORM);
  const [hierarchy, setHierarchy] = useState<HexHierarchyNode[]>([]);
  const [metrics, setMetrics] = useState<HexGridMetrics | null>(null);

  const refreshObjectsList = useCallback(() => {
    setObjects(objectsStorageRef.current?.list() ?? []);
  }, []);

  const refreshHierarchy = useCallback(() => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    setHierarchy(grid.getHierarchy());
  }, []);

  const refreshMetrics = useCallback(() => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    setMetrics(grid.getMetrics());
  }, []);

  const notifyInputUpdate = useCallback((force = false) => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    const now = performance.now();
    if (!force && now - lastInputUpdateMsRef.current < INPUT_UPDATE_MIN_INTERVAL_MS) {
      return;
    }

    lastInputUpdateMsRef.current = now;

    grid.update(inputRef.current);

    if (force || now - lastMetricsRefreshMsRef.current >= METRICS_REFRESH_MIN_INTERVAL_MS) {
      lastMetricsRefreshMsRef.current = now;
      refreshMetrics();
    }
  }, [refreshMetrics]);

  const syncStorage = useCallback(() => {
    objectsStorageRef.current?.sync();
    refreshObjectsList();
  }, [refreshObjectsList]);

  const openObject = useCallback((objectId: string) => {
    const storage = objectsStorageRef.current;
    const grid = hexGridRef.current;
    if (!storage || !grid) {
      return;
    }

    const object = storage.get(objectId);
    if (!object) {
      return;
    }

    openedObjectIdRef.current = objectId;
    setOpenedObjectId(objectId);
    setObjectName(object.name);
    grid.load(objectId);
    grid.clearSelection();
    setSelectedCellIndex('');
    setCellForm(DEFAULT_CELL_FORM);

    refreshObjectsList();
    refreshHierarchy();
    notifyInputUpdate(true);
  }, [notifyInputUpdate, refreshHierarchy, refreshObjectsList]);

  const applySelectedHexUpdate = useCallback((update: Partial<HexData> | ((data: HexData) => Partial<HexData>)) => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    grid.updateSelectedHexData(update);
    syncStorage();
    refreshMetrics();
  }, [refreshMetrics, syncStorage]);

  useEffect(() => {
    const storage = new HexiObjectsStorage();
    const grid = new HexGrid(storage);

    objectsStorageRef.current = storage;
    hexGridRef.current = grid;

    const savedCaliber = Number.parseFloat(localStorage.getItem(CALIBER_STORAGE_KEY) ?? String(MIN_CALIBER));
    const initialCaliber = Number.isFinite(savedCaliber) ? clampCaliber(savedCaliber) : MIN_CALIBER;

    const savedZoom = Number.parseFloat(localStorage.getItem(ZOOM_STORAGE_KEY) ?? '1');
    const initialZoomFactor = normalizeSavedZoomFactor(savedZoom);

    const savedPointy = localStorage.getItem(POINTY_STORAGE_KEY);
    const initialPointy = savedPointy === null ? true : savedPointy === 'true';

    inputRef.current.caliber = initialCaliber;
    inputRef.current.zoomFactor = initialZoomFactor;
    inputRef.current.pointyUpward = initialPointy;

    setCaliber(initialCaliber);
    setZoomFactor(initialZoomFactor);
    setPointyUpward(initialPointy);

    const onCellSelected = ({ index, data }: { index: string | null; data: HexData | null }) => {
      setSelectedCellIndex(index ?? '');
      if (!data) {
        setCellForm(DEFAULT_CELL_FORM);
      } else {
        setCellForm({
          color: data.color,
          shiftX: data.shift.x,
          shiftY: data.shift.y,
          elongatingFactor: data.elongatingFactor,
          rotation: data.rotation,
        });
      }
    };

    grid.addListener('cellSelected', onCellSelected);

    let existingObjects = storage.list();
    if (existingObjects.length === 0) {
      const objectId = storage.create('New world');
      storage.sync();
      existingObjects = storage.list();
      openObject(objectId);
    } else {
      openObject(existingObjects[0].id);
    }

    refreshObjectsList();

    const canvas = canvasRef.current;
    if (canvas) {
      const renderer = new CanvasRenderer(canvas, grid);
      renderer.start();
      rendererRef.current = renderer;
    }

    return () => {
      rendererRef.current?.stop();
      rendererRef.current = null;
      grid.removeListener('cellSelected', onCellSelected);
      hexGridRef.current = null;
      objectsStorageRef.current = null;
    };
  }, [openObject, refreshObjectsList]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = canvasViewportRef.current;
    if (!canvas || !viewport) {
      return;
    }

    const resize = () => {
      canvas.width = viewport.clientWidth;
      canvas.height = viewport.clientHeight;
      inputRef.current.canvasSize = new Vec2(canvas.width, canvas.height);
      notifyInputUpdate(true);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);

    resize();
    window.addEventListener('resize', resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [notifyInputUpdate]);

  useEffect(() => {
    if (!selectedCellIndex) {
      return;
    }

    const nextCaliber = caliberFromCellIndex(selectedCellIndex);
    if (nextCaliber === inputRef.current.caliber) {
      return;
    }

    setCaliber(nextCaliber);
    inputRef.current.caliber = nextCaliber;
    localStorage.setItem(CALIBER_STORAGE_KEY, String(nextCaliber));
    notifyInputUpdate(true);
  }, [notifyInputUpdate, selectedCellIndex]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getCanvasPosition(event);
    inputRef.current.mousePosition = position;

    const pointer = pointerRef.current;
    if (pointer.rightDown && pointer.rightStart && pointer.rightLast) {
      if (!pointer.rightDrag && position.sub(pointer.rightStart).length() >= RMB_DRAG_THRESHOLD) {
        pointer.rightDrag = true;
      }

      if (pointer.rightDrag) {
        const grid = hexGridRef.current;
        if (grid) {
          grid.panBy(position.sub(pointer.rightLast));
        }
        pointer.rightLast = position;
      }
    }

    notifyInputUpdate(false);
  }, [notifyInputUpdate]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getCanvasPosition(event);
    inputRef.current.mousePosition = position;

    if (event.button === 2) {
      pointerRef.current.rightDown = true;
      pointerRef.current.rightDrag = false;
      pointerRef.current.rightStart = position;
      pointerRef.current.rightLast = position;
      inputRef.current.mouseRightButtonDown = true;
    }

    if (event.button === 0) {
      inputRef.current.mouseLeftButtonDown = true;
    }

    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handleCanvasMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getCanvasPosition(event);
    inputRef.current.mousePosition = position;
    const grid = hexGridRef.current;

    if (event.button === 0) {
      inputRef.current.mouseLeftButtonDown = false;
      if (grid) {
        grid.primaryClickAtPointer();
        syncStorage();
        refreshHierarchy();
      }
    }

    if (event.button === 2) {
      inputRef.current.mouseRightButtonDown = false;
      if (grid && pointerRef.current.rightDown && !pointerRef.current.rightDrag) {
        grid.secondaryClickAtPointerRemove();
        syncStorage();
        refreshHierarchy();
      }

      pointerRef.current.rightDown = false;
      pointerRef.current.rightDrag = false;
      pointerRef.current.rightStart = null;
      pointerRef.current.rightLast = null;
    }

    notifyInputUpdate(true);
  }, [notifyInputUpdate, refreshHierarchy, syncStorage]);

  const handleCanvasLeave = useCallback(() => {
    inputRef.current.mouseLeftButtonDown = false;
    inputRef.current.mouseRightButtonDown = false;
    pointerRef.current.rightDown = false;
    pointerRef.current.rightDrag = false;
    pointerRef.current.rightStart = null;
    pointerRef.current.rightLast = null;
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handleCanvasWheel = useCallback((deltaY: number, shiftKey: boolean) => {
    if (!shiftKey) {
      const currentCaliberIndex = stepIndexFromValue(caliber, CALIBER_STEPS);
      const direction = deltaY > 0 ? 1 : -1;
      const nextCaliber = caliberFromStepIndex(currentCaliberIndex + direction);
      setCaliber(nextCaliber);
      inputRef.current.caliber = nextCaliber;
      localStorage.setItem(CALIBER_STORAGE_KEY, String(nextCaliber));
    } else {
      const currentZoomIndex = zoomSliderIndexFromValue(zoomFactor);
      const direction = deltaY < 0 ? 1 : -1;
      const nextZoomFactor = zoomFromStepIndex(currentZoomIndex + direction);
      setZoomFactor(nextZoomFactor);
      inputRef.current.zoomFactor = nextZoomFactor;
      localStorage.setItem(ZOOM_STORAGE_KEY, String(nextZoomFactor));
    }

    notifyInputUpdate(false);
  }, [caliber, notifyInputUpdate, zoomFactor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleCanvasWheel(event.deltaY, event.shiftKey);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [handleCanvasWheel]);

  const handleObjectNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setObjectName(nextName);

    const storage = objectsStorageRef.current;
    const currentObjectId = openedObjectIdRef.current;
    if (!storage || !currentObjectId) {
      return;
    }

    const object = storage.get(currentObjectId);
    if (!object) {
      return;
    }

    object.name = nextName;
    syncStorage();
  }, [syncStorage]);

  const handleCreateObject = useCallback(() => {
    const storage = objectsStorageRef.current;
    if (!storage) {
      return;
    }

    const objectId = storage.create('New hexi-object');
    syncStorage();
    openObject(objectId);
  }, [openObject, syncStorage]);

  const handleRemoveObject = useCallback(() => {
    const storage = objectsStorageRef.current;
    const currentObjectId = openedObjectIdRef.current;
    if (!storage || !currentObjectId) {
      return;
    }

    storage.remove(currentObjectId);

    let remainingObjects = storage.list();
    if (remainingObjects.length === 0) {
      const objectId = storage.create('New world');
      remainingObjects = storage.list();
      syncStorage();
      openObject(objectId);
      return;
    }

    syncStorage();
    openObject(remainingObjects[0].id);
  }, [openObject, syncStorage]);

  const handleExportObject = useCallback(() => {
    const storage = objectsStorageRef.current;
    const currentObjectId = openedObjectIdRef.current;
    if (!storage || !currentObjectId) {
      return;
    }

    const data = storage.export(currentObjectId);
    if (!data) {
      return;
    }

    const objectNameForFile = sanitizeFileName(storage.get(currentObjectId)?.name ?? 'hexi-object');
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${objectNameForFile}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportObject = useCallback(() => {
    const storage = objectsStorageRef.current;
    if (!storage) {
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';

    fileInput.addEventListener('change', () => {
      const selectedFile = fileInput.files?.[0];
      if (!selectedFile) {
        return;
      }

      selectedFile
        .text()
        .then((jsonText) => {
          const objectId = storage.import(jsonText);
          syncStorage();
          openObject(objectId);
        })
        .catch((error) => {
          console.error('Failed to import object JSON', error);
        });
    }, { once: true });

    fileInput.click();
  }, [openObject, syncStorage]);

  const handleCaliberChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextCaliber = clampCaliber(parseNumber(event.target.value, caliber));
    setCaliber(nextCaliber);
    inputRef.current.caliber = nextCaliber;
    localStorage.setItem(CALIBER_STORAGE_KEY, String(nextCaliber));
    notifyInputUpdate(true);
  }, [caliber, notifyInputUpdate]);

  const handleZoomChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextRawValue = clampZoomRange(parseNumber(event.target.value, zoomFactor));
    const currentIndex = zoomSliderIndexFromValue(zoomFactor);
    let nextIndex = zoomSliderIndexFromValue(nextRawValue);

    // Number input arrows change value in tiny linear steps (0.1),
    // so force movement to the neighboring logarithmic stop when needed.
    if (nextIndex === currentIndex && Math.abs(nextRawValue - zoomFactor) > 0.05) {
      const direction = nextRawValue > zoomFactor ? 1 : -1;
      nextIndex = clampStepIndex(currentIndex + direction, ZOOM_DIVISIONS);
    }

    const nextZoomFactor = zoomFromStepIndex(nextIndex);
    setZoomFactor(nextZoomFactor);
    inputRef.current.zoomFactor = nextZoomFactor;
    localStorage.setItem(ZOOM_STORAGE_KEY, String(nextZoomFactor));
    notifyInputUpdate(true);
  }, [notifyInputUpdate, zoomFactor]);

  const handleCaliberSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextCaliber = caliberFromStepIndex(Number.parseInt(event.target.value, 10));
    setCaliber(nextCaliber);
    inputRef.current.caliber = nextCaliber;
    localStorage.setItem(CALIBER_STORAGE_KEY, String(nextCaliber));
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handleZoomSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderIndex = Number.parseInt(event.target.value, 10);
    const nextZoomFactor = zoomFromStepIndex(clampStepIndex(sliderIndex, ZOOM_DIVISIONS));
    setZoomFactor(nextZoomFactor);
    inputRef.current.zoomFactor = nextZoomFactor;
    localStorage.setItem(ZOOM_STORAGE_KEY, String(nextZoomFactor));
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handlePointyChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const isPointyUpward = event.target.checked;
    setPointyUpward(isPointyUpward);
    inputRef.current.pointyUpward = isPointyUpward;
    localStorage.setItem(POINTY_STORAGE_KEY, String(isPointyUpward));
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handleShowGridChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextShowGrid = event.target.checked;
    setShowGrid(nextShowGrid);
    hexGridRef.current?.setShowGrid(nextShowGrid);
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const handleCellColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setCellForm((previous) => ({ ...previous, color }));
    applySelectedHexUpdate({ color });
  }, [applySelectedHexUpdate]);

  const handleCellShiftXChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const shiftX = parseNumber(event.target.value, cellForm.shiftX);
    setCellForm((previous) => ({ ...previous, shiftX }));
    applySelectedHexUpdate((data) => ({
      shift: new Vec2(shiftX, data.shift.y),
    }));
  }, [applySelectedHexUpdate, cellForm.shiftX]);

  const handleCellShiftYChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const shiftY = parseNumber(event.target.value, cellForm.shiftY);
    setCellForm((previous) => ({ ...previous, shiftY }));
    applySelectedHexUpdate((data) => ({
      shift: new Vec2(data.shift.x, shiftY),
    }));
  }, [applySelectedHexUpdate, cellForm.shiftY]);

  const handleCellElongatingChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const elongatingFactor = parseNumber(event.target.value, cellForm.elongatingFactor);
    setCellForm((previous) => ({ ...previous, elongatingFactor }));
    applySelectedHexUpdate({ elongatingFactor });
  }, [applySelectedHexUpdate, cellForm.elongatingFactor]);

  const handleCellRotationChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const rotation = parseNumber(event.target.value, cellForm.rotation);
    setCellForm((previous) => ({ ...previous, rotation }));
    applySelectedHexUpdate({ rotation });
  }, [applySelectedHexUpdate, cellForm.rotation]);

  const handleRemoveCell = useCallback(() => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    grid.removeSelectedHex();
    syncStorage();
    refreshHierarchy();
    notifyInputUpdate(true);
  }, [notifyInputUpdate, refreshHierarchy, syncStorage]);

  const handleHierarchySelect = useCallback((index: string) => {
    const grid = hexGridRef.current;
    if (!grid) {
      return;
    }

    grid.selectCellByIndex(index, false);
    notifyInputUpdate(true);
  }, [notifyInputUpdate]);

  const hierarchyTree = useMemo(
    () => renderHierarchyNodes(hierarchy, selectedCellIndex, handleHierarchySelect),
    [handleHierarchySelect, hierarchy, selectedCellIndex],
  );

  const caliberStepIndex = useMemo(
    () => stepIndexFromValue(caliber, CALIBER_STEPS),
    [caliber],
  );

  const zoomStepIndex = useMemo(() => {
    return zoomSliderIndexFromValue(zoomFactor);
  }, [zoomFactor]);

  const zoomInputValue = useMemo(
    () => Number(zoomFactor.toFixed(1)),
    [zoomFactor],
  );

  const zoomPowerDisplay = useMemo(
    () => formatZoomPower(zoomFactor),
    [zoomFactor],
  );

  return (
    <div className="hex-drawer">
      <div className="hex-drawer__canvas-panel">
        <div className="hex-drawer__field-layout">
          <div className="hex-drawer__zoom-rail">
            <div className="hex-drawer__zoom-marks">
              {ZOOM_MARKS.map((mark, idx) => (
                <span key={`${mark}-${idx}`} className={idx % 2 === 0 ? 'major' : 'minor'}>
                  {idx % 2 === 0 ? mark.toFixed(0) : ''}
                </span>
              ))}
            </div>
            <input
              className="hex-drawer__zoom-slider"
              type="range"
              min={0}
              max={ZOOM_DIVISIONS}
              step={1}
              value={zoomStepIndex}
              onChange={handleZoomSliderChange}
              aria-label="Zoom"
            />
          </div>

          <div className="hex-drawer__canvas-column">
            <div ref={canvasViewportRef} className="hex-drawer__canvas-viewport">
              <canvas
                ref={canvasRef}
                className="hex-drawer__canvas"
                onMouseMove={handleCanvasMouseMove}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasLeave}
                onContextMenu={(event) => event.preventDefault()}
              />
            </div>

            <div className="hex-drawer__caliber-rail">
              <input
                className="hex-drawer__caliber-slider"
                type="range"
                min={0}
                max={CALIBER_STEPS.length - 1}
                step={1}
                value={caliberStepIndex}
                onChange={handleCaliberSliderChange}
                aria-label="Caliber"
              />
              <div className="hex-drawer__caliber-marks">
                {CALIBER_STEPS.map((step) => (
                  <span key={step}>{step.toFixed(1)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="hex-drawer__sidebar">
        <section className="hex-drawer__section">
          <h1 className="hex-drawer__title">Hex Drawer</h1>
          <div className="hex-drawer__top-links">
            <a className="hex-drawer__nav-link" href="../devlab/">DevLab index</a>
            <a className="hex-drawer__nav-link" href="../">Open game</a>
          </div>
          <div className="hex-drawer__row">
            <label htmlFor="object-name" className="hex-drawer__label">Object name</label>
            <input
              id="object-name"
              className="hex-drawer__input"
              type="text"
              maxLength={50}
              value={objectName}
              onChange={handleObjectNameChange}
            />
          </div>
          <div className="hex-drawer__actions">
            <button type="button" onClick={handleCreateObject}>New</button>
            <button type="button" onClick={handleImportObject}>Import</button>
            <button type="button" onClick={handleExportObject}>Export</button>
            <button type="button" onClick={handleRemoveObject} className="hex-drawer__danger">Remove</button>
          </div>
        </section>

        <section className="hex-drawer__section">
          <p className="hex-drawer__section-title">View</p>
          <div className="hex-drawer__row">
            <label htmlFor="caliber-input" className="hex-drawer__label">Caliber</label>
            <input
              id="caliber-input"
              className="hex-drawer__input hex-drawer__input--number"
              type="number"
              min={MIN_CALIBER}
              max={MAX_CALIBER}
              step={CALIBER_STEP}
              value={caliber}
              onChange={handleCaliberChange}
            />
          </div>
          <div className="hex-drawer__row">
            <label htmlFor="zoom-factor-input" className="hex-drawer__label">Zoom factor</label>
            <div className="hex-drawer__zoom-value">
              <input
                id="zoom-factor-input"
                className="hex-drawer__input hex-drawer__input--number"
                type="number"
                min={MIN_ZOOM_FACTOR}
                max={MAX_ZOOM_FACTOR}
                step={0.1}
                value={zoomInputValue}
                onChange={handleZoomChange}
              />
              <span className="hex-drawer__zoom-power">3^{zoomPowerDisplay}</span>
            </div>
          </div>
          <label className="hex-drawer__toggle-row">
            <input type="checkbox" checked={pointyUpward} onChange={handlePointyChange} />
            Pointy upward
          </label>
          <label className="hex-drawer__toggle-row">
            <input type="checkbox" checked={showGrid} onChange={handleShowGridChange} />
            Show grid
          </label>
          <p className="hex-drawer__hint">Wheel = caliber, Shift+Wheel = zoom, LMB = create/select, RMB click = remove, RMB drag = pan.</p>
        </section>

        <section className="hex-drawer__section">
          <p className="hex-drawer__section-title">Stats</p>
          <div className="hex-drawer__stats-grid">
            <div className="hex-drawer__stat-item"><span>Cells level</span><strong>{metrics?.cellsOnCurrentLevel ?? '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Cells root..cur</span><strong>{metrics?.cellsFromRootToCurrent ?? '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Hexes level</span><strong>{metrics?.hexesOnCurrentLevel ?? '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Hexes total</span><strong>{metrics?.totalHexes ?? '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Base fit zoom</span><strong>{metrics ? metrics.baseFitZoom.toFixed(3) : '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Half step</span><strong>{metrics?.halfStep ? 'yes' : 'no'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Depth active</span><strong>{metrics ? `${metrics.depth}${metrics.depthLimited ? ` / ${metrics.requestedDepth}` : ''}` : '-'}</strong></div>
            <div className="hex-drawer__stat-item"><span>Depth limit</span><strong>{metrics?.depthLimited ? 'active' : 'off'}</strong></div>
          </div>
        </section>

        <section className="hex-drawer__section">
          <p className="hex-drawer__section-title">Hierarchy</p>
          <div className="hex-drawer__hierarchy-wrap">
            <ul className="hex-drawer__tree-list">{hierarchyTree}</ul>
          </div>
        </section>

        {selectedCellIndex ? (
          <section className="hex-drawer__section hex-drawer__section--cell">
            <div className="hex-drawer__cell-header">
              <div>
                <p className="hex-drawer__section-title">Cell</p>
                <p className="hex-drawer__cell-index">{selectedCellIndex}</p>
              </div>
              <button type="button" className="hex-drawer__danger" onClick={handleRemoveCell}>X</button>
            </div>

            <div className="hex-drawer__row">
              <label htmlFor="cell-color" className="hex-drawer__label">Color</label>
              <input
                id="cell-color"
                className="hex-drawer__input"
                type="color"
                value={cellForm.color}
                onChange={handleCellColorChange}
              />
            </div>

            <div className="hex-drawer__row">
              <label htmlFor="cell-shift-x" className="hex-drawer__label">Shift X</label>
              <input
                id="cell-shift-x"
                className="hex-drawer__input hex-drawer__input--number"
                type="number"
                min={-2}
                max={2}
                step={0.25}
                value={cellForm.shiftX}
                onChange={handleCellShiftXChange}
              />
            </div>

            <div className="hex-drawer__row">
              <label htmlFor="cell-shift-y" className="hex-drawer__label">Shift Y</label>
              <input
                id="cell-shift-y"
                className="hex-drawer__input hex-drawer__input--number"
                type="number"
                min={-2}
                max={2}
                step={0.25}
                value={cellForm.shiftY}
                onChange={handleCellShiftYChange}
              />
            </div>

            <div className="hex-drawer__row">
              <label htmlFor="cell-elongating" className="hex-drawer__label">Elongating</label>
              <input
                id="cell-elongating"
                className="hex-drawer__input hex-drawer__input--number"
                type="number"
                min={0}
                max={3}
                step={0.2}
                value={cellForm.elongatingFactor}
                onChange={handleCellElongatingChange}
              />
            </div>

            <div className="hex-drawer__row">
              <label htmlFor="cell-rotation" className="hex-drawer__label">Rotation</label>
              <input
                id="cell-rotation"
                className="hex-drawer__input hex-drawer__input--number"
                type="number"
                min={0}
                max={330}
                step={30}
                value={cellForm.rotation}
                onChange={handleCellRotationChange}
              />
            </div>
          </section>
        ) : null}

        <section className="hex-drawer__section hex-drawer__section--objects">
          <p className="hex-drawer__section-title">Objects</p>
          <div className="hex-drawer__objects-list">
            {objects.map((object) => (
              <div key={object.id} className="hex-drawer__object-item">
                <span className="hex-drawer__object-name" title={object.name}>{object.name || 'Untitled'}</span>
                {object.id === openedObjectId ? (
                  <span className="hex-drawer__opened-label">Opened</span>
                ) : (
                  <button type="button" onClick={() => openObject(object.id)}>Open</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
