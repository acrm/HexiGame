import { EventSourceBase } from './EventSourceBase';
import { Hex, type HexData } from './Hex';
import { HexCell } from './HexCell';
import { HexStorage } from './HexStorage';
import type { HexiObjectsStorage } from './HexiObjectsStorage';
import type { InputState } from './InputState';
import { Vec2 } from './Vec2';

interface HexGridEvents {
  cellSelected: { index: string | null; data: HexData | null };
}

type HexDataUpdate = Partial<HexData> | ((data: HexData) => Partial<HexData>);

interface MutableHierarchyNode {
  index: string;
  depth: number;
  level: number;
  hasHex: boolean;
  childrenMap: Map<string, MutableHierarchyNode>;
}

export interface HexHierarchyNode {
  index: string;
  depth: number;
  level: number;
  hasHex: boolean;
  children: HexHierarchyNode[];
}

export interface HexGridMetrics {
  caliber: number;
  level: number;
  depth: number;
  requestedDepth: number;
  depthLimited: boolean;
  halfStep: boolean;
  cellsOnCurrentLevel: number;
  cellsFromRootToCurrent: number;
  hexesOnCurrentLevel: number;
  totalHexes: number;
  zoomFactor: number;
  baseFitZoom: number;
  effectiveZoom: number;
}

const MIN_LEVEL = -6;
const MAX_LEVEL = 6;
const LEVEL_STEP = 0.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 729;
const ZOOM_DIVISIONS = 12;
const MAX_ACTIVE_DEPTH = 8;
const ROOT_HEX_FILL_RATIO = 0.9;

export class HexGrid extends EventSourceBase<HexGridEvents> {
  private readonly objectsStorage: HexiObjectsStorage;
  private readonly rootCell: HexCell;
  private readonly hexStorage: HexStorage;

  private origin: Vec2;
  private cameraPosition: Vec2;
  private hoverCellIndex: string | null;

  private selectedHex: Hex | null;
  private currentColor: string;
  private currentCaliber: number;
  private currentDepth: number;
  private renderDepth: number;
  private requestedDepth: number;
  private isHalfStep: boolean;
  private orientationOffset: number;
  private hoverCellInWorkArea: boolean;

  private zoomFactor: number;
  private zoom: number;
  private baseFitZoom: number;
  private showGrid: boolean;

  public constructor(objectsStorage: HexiObjectsStorage) {
    super(['cellSelected']);
    this.objectsStorage = objectsStorage;
    this.rootCell = new HexCell();

    this.origin = new Vec2();
    this.cameraPosition = new Vec2();
    this.hexStorage = new HexStorage();
    this.hoverCellIndex = null;
    this.selectedHex = null;
    this.currentColor = '#face8d';

    this.currentCaliber = MIN_LEVEL;
    this.currentDepth = 0;
    this.renderDepth = 0;
    this.requestedDepth = 0;
    this.isHalfStep = false;
    this.orientationOffset = Math.PI / 6;
    this.hoverCellInWorkArea = false;

    this.zoomFactor = 1;
    this.baseFitZoom = 1;
    this.zoom = 1;
    this.showGrid = true;
  }

  public load(objectId: string): void {
    const object = this.objectsStorage.get(objectId);
    if (!object) {
      throw new Error(`Unknown object id: ${objectId}`);
    }

    this.hexStorage.set(object.hexs);
  }

  public setShowGrid(value: boolean): void {
    this.showGrid = value;
  }

  public setCaliber(value: number): number {
    this.currentCaliber = this.clampCaliber(value);
    return this.currentCaliber;
  }

  public setZoomFactor(value: number): number {
    this.zoomFactor = this.clampZoomFactor(value);
    return this.zoomFactor;
  }

  public panBy(delta: Vec2): void {
    this.cameraPosition = this.cameraPosition.add(delta);
  }

  public primaryClickAtPointer(): void {
    if (!this.hoverCellIndex) {
      return;
    }

    this.selectCellByIndex(this.hoverCellIndex, this.hoverCellInWorkArea);
  }

  public secondaryClickAtPointerRemove(): void {
    if (!this.hoverCellIndex) {
      return;
    }

    this.removeCellByIndex(this.hoverCellIndex);
  }

  public removeSelectedHex(): void {
    if (!this.selectedHex) {
      return;
    }

    this.removeCellByIndex(this.selectedHex.index);
  }

  public clearSelection(): void {
    this.selectCellByIndex(null, false);
  }

  public selectCellByIndex(index: string | null, createIfMissing: boolean): void {
    if (!index) {
      this.selectedHex = null;
      this.notifyCellSelected(null, null);
      return;
    }

    let hex = this.hexStorage.get(index);
    if (!hex && createIfMissing) {
      hex = new Hex(index, this.currentColor);
      this.hexStorage.add(hex);
    }

    if (!hex) {
      return;
    }

    this.selectedHex = hex;
    this.notifyCellSelected(index, this.selectedHex.data);
  }

  public removeCellByIndex(index: string): boolean {
    if (!this.hexStorage.has(index)) {
      return false;
    }

    this.hexStorage.remove(index);
    if (this.selectedHex?.index === index) {
      this.selectedHex = null;
      this.notifyCellSelected(null, null);
    }

    return true;
  }

  public updateSelectedHexData(arg: HexDataUpdate): void {
    const updater = (newData: Partial<HexData>) => {
      if (!this.selectedHex) {
        return;
      }

      this.selectedHex.data = {
        ...this.selectedHex.data,
        ...newData,
      };
      this.currentColor = this.selectedHex.data.color;
      this.notifyCellSelected(this.selectedHex.index, this.selectedHex.data);
    };

    if (typeof arg === 'function') {
      if (!this.selectedHex) {
        return;
      }
      updater(arg(this.selectedHex.data));
      return;
    }

    updater(arg);
  }

  public update(input: InputState): void {
    this.currentCaliber = this.clampCaliber(input.caliber);
    this.zoomFactor = this.clampZoomFactor(input.zoomFactor);

    const depthInfo = this.computeDepthInfo(this.currentCaliber);
    this.requestedDepth = depthInfo.depth;
    this.currentDepth = Math.min(this.requestedDepth, MAX_ACTIVE_DEPTH);
    this.renderDepth = Math.min(
      Math.max(this.currentDepth, this.computeMaxHexDepth()),
      MAX_ACTIVE_DEPTH,
    );
    this.isHalfStep = depthInfo.halfStep;

    this.orientationOffset = this.computeOrientationOffset(input.pointyUpward);

    this.baseFitZoom = this.computeBaseFitZoom(input.canvasSize, this.orientationOffset);
    this.zoom = this.baseFitZoom * this.zoomFactor;
    this.origin = input.canvasSize.mul(0.5).add(this.cameraPosition);

    this.hoverCellIndex = null;
    this.hoverCellInWorkArea = false;
    this.rootCell.update(
      {
        maxDepth: this.renderDepth,
        workingDepth: this.currentDepth,
        rootRadius: this.rootCell.radius,
        rootOrientation: this.orientationOffset,
        selectedIndex: this.selectedHex?.index ?? null,
        mousePosition: input.mousePosition.sub(this.origin).mul(1 / this.zoom),
        pointyUpward: input.pointyUpward,
        setHoverCellIndex: this.setHoverCellIndex.bind(this),
      },
      this.hexStorage,
    );
  }

  public draw(context2D: CanvasRenderingContext2D): void {
    context2D.save();

    context2D.scale(this.zoom, this.zoom);
    context2D.translate(this.origin.x / this.zoom, this.origin.y / this.zoom);

    for (let drawingDepth = 0; drawingDepth <= this.renderDepth; drawingDepth += 1) {
      this.rootCell.drawContent(context2D, drawingDepth);
    }

    if (this.showGrid) {
      this.rootCell.drawGrid(context2D, this.currentDepth);
    }

    this.rootCell.drawSelectedOutline(context2D, this.selectedHex?.index ?? null);

    context2D.restore();
  }

  public getHierarchy(): HexHierarchyNode[] {
    const root = this.createMutableNode('A');
    root.hasHex = this.hexStorage.has('A');

    const sortedIndices = this.hexStorage
      .listIndices()
      .sort((left, right) => left.length - right.length || left.localeCompare(right));

    for (const index of sortedIndices) {
      if (!index.startsWith('A')) {
        continue;
      }

      let currentNode = root;
      for (let position = 1; position < index.length; position += 1) {
        const pathIndex = index.slice(0, position + 1);
        let childNode = currentNode.childrenMap.get(pathIndex);
        if (!childNode) {
          childNode = this.createMutableNode(pathIndex);
          currentNode.childrenMap.set(pathIndex, childNode);
        }
        currentNode = childNode;
      }

      currentNode.hasHex = true;
    }

    return [this.toReadonlyHierarchy(root)];
  }

  public getMetrics(): HexGridMetrics {
    const cellsOnCurrentLevel = this.computeCellsOnDepth(this.currentDepth);
    const cellsFromRootToCurrent = this.computeCellsFromRootToDepth(this.currentDepth);

    const entries = this.hexStorage.listEntries();
    const currentDepthHexes = entries.filter(([index]) => this.depthFromIndex(index) === this.currentDepth).length;

    return {
      caliber: this.currentCaliber,
      level: Math.round(this.currentCaliber),
      depth: this.currentDepth,
      requestedDepth: this.requestedDepth,
      depthLimited: this.requestedDepth > this.currentDepth,
      halfStep: this.isHalfStep,
      cellsOnCurrentLevel,
      cellsFromRootToCurrent,
      hexesOnCurrentLevel: currentDepthHexes,
      totalHexes: entries.length,
      zoomFactor: this.zoomFactor,
      baseFitZoom: this.baseFitZoom,
      effectiveZoom: this.zoom,
    };
  }

  private notifyCellSelected(index: string | null, data: HexData | null): void {
    this.notify('cellSelected', { index, data });
  }

  private setHoverCellIndex(index: string | null, inWorkArea: boolean): void {
    this.hoverCellIndex = index;
    this.hoverCellInWorkArea = inWorkArea;
  }

  private clampCaliber(value: number): number {
    const snapped = Math.round(value / LEVEL_STEP) * LEVEL_STEP;
    return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, snapped));
  }

  private clampZoomFactor(value: number): number {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
    const ratio = ZOOM_MAX / ZOOM_MIN;
    const position = Math.log(clamped / ZOOM_MIN) / Math.log(ratio);
    const snappedIndex = Math.max(0, Math.min(ZOOM_DIVISIONS, Math.round(position * ZOOM_DIVISIONS)));
    return ZOOM_MIN * ratio ** (snappedIndex / ZOOM_DIVISIONS);
  }

  private computeDepthInfo(caliber: number): { depth: number; halfStep: boolean } {
    const stepIndex = Math.round((caliber - MIN_LEVEL) / LEVEL_STEP);
    const depth = Math.floor(stepIndex / 2);
    return {
      depth: Math.max(0, Math.min(MAX_LEVEL - MIN_LEVEL, depth)),
      halfStep: stepIndex % 2 !== 0,
    };
  }

  private computeOrientationOffset(pointyUpward: boolean): number {
    return pointyUpward ? Math.PI / 6 : 0;
  }

  private computeBaseFitZoom(canvasSize: Vec2, orientationOffset: number): number {
    if (canvasSize.x <= 0 || canvasSize.y <= 0) {
      return 1;
    }

    const radius = this.rootCell.radius;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < 6; index += 1) {
      const angle = orientationOffset + index * (Math.PI / 3);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    const hexWidth = maxX - minX;
    const hexHeight = maxY - minY;
    if (hexWidth <= 0 || hexHeight <= 0) {
      return 1;
    }

    const fitWidth = canvasSize.x * ROOT_HEX_FILL_RATIO;
    const fitHeight = canvasSize.y * ROOT_HEX_FILL_RATIO;

    const zoom = Math.min(fitWidth / hexWidth, fitHeight / hexHeight);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  private drawRootHexPath(context2D: CanvasRenderingContext2D): void {
    const radius = this.rootCell.radius;
    context2D.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = this.orientationOffset + index * (Math.PI / 3);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) {
        context2D.moveTo(x, y);
      } else {
        context2D.lineTo(x, y);
      }
    }
    context2D.closePath();
  }

  private depthFromIndex(index: string): number {
    return Math.max(0, index.length - 1);
  }

  private computeMaxHexDepth(): number {
    let maxDepth = 0;
    for (const index of this.hexStorage.listIndices()) {
      maxDepth = Math.max(maxDepth, this.depthFromIndex(index));
    }
    return maxDepth;
  }

  private computeCellsOnDepth(depth: number): number {
    if (depth <= 0) {
      return 1;
    }

    let cellsOnPreviousDepth = 1;
    let zeroOnPreviousDepth = 1;

    for (let currentDepth = 1; currentDepth <= depth; currentDepth += 1) {
      const cellsOnCurrentDepth = cellsOnPreviousDepth + 6 * zeroOnPreviousDepth;
      const zeroOnCurrentDepth = cellsOnPreviousDepth;

      cellsOnPreviousDepth = cellsOnCurrentDepth;
      zeroOnPreviousDepth = zeroOnCurrentDepth;
    }

    return cellsOnPreviousDepth;
  }

  private computeCellsFromRootToDepth(depth: number): number {
    let total = 0;
    for (let currentDepth = 0; currentDepth <= depth; currentDepth += 1) {
      total += this.computeCellsOnDepth(currentDepth);
    }
    return total;
  }

  private createMutableNode(index: string): MutableHierarchyNode {
    const depth = this.depthFromIndex(index);
    return {
      index,
      depth,
      level: MIN_LEVEL + depth,
      hasHex: false,
      childrenMap: new Map<string, MutableHierarchyNode>(),
    };
  }

  private toReadonlyHierarchy(node: MutableHierarchyNode): HexHierarchyNode {
    const children = Array.from(node.childrenMap.values())
      .sort((left, right) => left.index.localeCompare(right.index))
      .map((child) => this.toReadonlyHierarchy(child));

    return {
      index: node.index,
      depth: node.depth,
      level: node.level,
      hasHex: node.hasHex,
      children,
    };
  }
}
