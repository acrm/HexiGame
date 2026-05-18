import { Hex } from './Hex';
import { HexStorage } from './HexStorage';
import { Vec2 } from './Vec2';

interface CellInput {
  maxDepth: number;
  workingDepth: number;
  rootRadius: number;
  rootOrientation: number;
  selectedIndex: string | null;
  mousePosition: Vec2;
  pointyUpward: boolean;
  setHoverCellIndex: (index: string | null, inWorkArea: boolean) => void;
}

export class HexCell {
  public static fractalizationFactor = 1 / Math.sqrt(3);
  public static debugCellsCount = 0;

  public hover: boolean;
  public selected: boolean;
  public pointyUpward: boolean;
  public radius: number;
  public position: Vec2;
  public subIndex: number;
  public childrenLimit: number;
  public angleShift: number;
  public selfCaliber: number;
  public globalDepth: number;
  public workingDepth: number;
  public scale: number;
  public name: string;
  public inWorkArea: boolean;
  public children: HexCell[];
  public hex: Hex | null;

  public constructor(parent?: HexCell, subIndex?: number, position?: Vec2) {
    if (HexCell.debugCellsCount === 0) {
      HexCell.debugCellsCount = 1;
    }

    this.hover = false;
    this.selected = false;
    this.pointyUpward = true;
    this.radius = 300;
    this.position = position ?? new Vec2();
    this.subIndex = subIndex ?? 0;
    this.childrenLimit = this.subIndex === 0 ? 7 : 1;
    this.selfCaliber = (parent?.selfCaliber ?? -1) + 1;
    this.angleShift = this.computeAngleShift(this.pointyUpward);
    this.globalDepth = 0;
    this.workingDepth = 0;
    this.scale = Math.pow(HexCell.fractalizationFactor, this.selfCaliber);
    this.name = `${parent?.name ?? 'A'}${parent ? this.subIndex : ''}`;
    this.inWorkArea = true;
    this.children = [];
    this.hex = null;
  }

  public update(input: CellInput, hexStorage: HexStorage): void {
    this.globalDepth = input.maxDepth;
    this.workingDepth = input.workingDepth;
    this.hex = hexStorage.get(this.name);

    if (this.pointyUpward !== input.pointyUpward) {
      this.pointyUpward = input.pointyUpward;
      this.angleShift = this.computeAngleShift(this.pointyUpward);
      this.createChildren();
    }

    this.checkChildren();
    this.selected = input.selectedIndex === this.name;
    const dx = input.mousePosition.x - this.position.x;
    const dy = input.mousePosition.y - this.position.y;
    const hitRadius = this.radius * this.scale;
    this.hover = this.workingDepth === this.selfCaliber
      && dx * dx + dy * dy <= hitRadius * hitRadius;
    this.inWorkArea = this.computeInWorkArea(input.rootRadius, input.rootOrientation);

    if (this.hover) {
      input.setHoverCellIndex(this.name, this.inWorkArea);
    }

    for (const child of this.children) {
      child.update(input, hexStorage);
    }
  }

  public collectLevelCounts(maxDepth: number, counts: Map<number, number>): void {
    if (this.selfCaliber > maxDepth) {
      return;
    }

    counts.set(this.selfCaliber, (counts.get(this.selfCaliber) ?? 0) + 1);
    for (const child of this.children) {
      child.collectLevelCounts(maxDepth, counts);
    }
  }

  public drawContent(context2D: CanvasRenderingContext2D, drawingCaliber: number): void {
    if (this.selfCaliber === drawingCaliber && this.hex) {
      context2D.save();
      context2D.scale(this.scale, this.scale);
      context2D.translate(this.position.x / this.scale, this.position.y / this.scale);

      context2D.beginPath();
      const sin = Math.sin((Math.PI / 180) * this.hex.data.rotation);
      const cos = Math.cos((Math.PI / 180) * this.hex.data.rotation);
      context2D.transform(
        cos,
        sin,
        -sin,
        cos,
        this.hex.data.shift.x * this.radius,
        this.hex.data.shift.y * this.radius,
      );

      const elFactor = this.hex.data.elongatingFactor;
      const flexibleRadius = (elFactor * this.radius) / 2;
      const diagonRadiusFactor = Math.sqrt(elFactor * elFactor + 3);
      const diagonRadius = (this.radius / 2) * diagonRadiusFactor;
      const phiElongatedDelta = Math.PI / 3 - Math.acos(elFactor / diagonRadiusFactor);

      for (let i = 0; i < 6; i += 1) {
        const basePhi = (Math.PI * 2 * i) / 6 + this.angleShift;
        const phi = basePhi + (
          i === 1 || i === 4 ? -phiElongatedDelta
            : i === 2 || i === 5 ? phiElongatedDelta
              : 0
        );
        const radius = i === 0 || i === 3 ? this.radius / 2 + flexibleRadius : diagonRadius;
        const x = Math.cos(phi) * radius;
        const y = Math.sin(phi) * radius;

        if (i === 0) {
          context2D.moveTo(x, y);
        } else {
          context2D.lineTo(x, y);
        }
      }

      context2D.closePath();
      context2D.fillStyle = this.hex.data.color;
      context2D.fill();

      context2D.restore();
    }

    if (drawingCaliber > this.selfCaliber) {
      for (const child of this.children) {
        child.drawContent(context2D, drawingCaliber);
      }
    }
  }

  public drawGrid(context2D: CanvasRenderingContext2D, drawingCaliber: number): void {
    if (this.selfCaliber === drawingCaliber) {
      context2D.save();
      context2D.scale(this.scale, this.scale);
      context2D.translate(this.position.x / this.scale, this.position.y / this.scale);

      context2D.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const x = Math.cos((Math.PI * 2 * i) / 6 + this.angleShift) * this.radius;
        const y = Math.sin((Math.PI * 2 * i) / 6 + this.angleShift) * this.radius;
        if (i === 0) {
          context2D.moveTo(x, y);
        } else {
          context2D.lineTo(x, y);
        }
      }
      context2D.closePath();

      if (!this.inWorkArea) {
        if (this.hover && this.workingDepth === this.selfCaliber) {
          this.drawName(context2D, '#9aa4bb');
        }
        context2D.restore();
        return;
      }

      if (this.hover && this.workingDepth === this.selfCaliber) {
        context2D.globalAlpha = 1;
        context2D.strokeStyle = '#4cc2ff';
        context2D.lineWidth = 5;
        this.drawName(context2D, '#4cc2ff');
      } else {
        context2D.globalAlpha = 1;
        context2D.strokeStyle = '#0075ff';
        context2D.lineWidth = 3;
      }

      context2D.stroke();
      context2D.restore();
    }

    if (drawingCaliber > this.selfCaliber) {
      for (const child of this.children) {
        child.drawGrid(context2D, drawingCaliber);
      }
    }
  }

  public drawSelectedOutline(context2D: CanvasRenderingContext2D, selectedIndex: string | null): boolean {
    if (!selectedIndex) {
      return false;
    }

    if (this.name === selectedIndex) {
      context2D.save();
      context2D.scale(this.scale, this.scale);
      context2D.translate(this.position.x / this.scale, this.position.y / this.scale);

      context2D.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const x = Math.cos((Math.PI * 2 * i) / 6 + this.angleShift) * this.radius;
        const y = Math.sin((Math.PI * 2 * i) / 6 + this.angleShift) * this.radius;
        if (i === 0) {
          context2D.moveTo(x, y);
        } else {
          context2D.lineTo(x, y);
        }
      }
      context2D.closePath();
      context2D.globalAlpha = 1;
      context2D.strokeStyle = '#ffffff';
      context2D.lineWidth = 10;
      context2D.lineJoin = 'round';
      context2D.stroke();
      context2D.restore();
      return true;
    }

    for (const child of this.children) {
      if (child.drawSelectedOutline(context2D, selectedIndex)) {
        return true;
      }
    }

    return false;
  }

  private drawName(context2D: CanvasRenderingContext2D, fillColor: string, strokeColor?: string): void {
    context2D.save();
    const textHeight = 200;
    context2D.font = `${textHeight}px monospace`;
    const textMetric = context2D.measureText(this.name);

    if (textMetric.width > 200) {
      const factor = 200 / textMetric.width;
      context2D.scale(factor, factor);
    }

    const offset = new Vec2(
      -textMetric.width / 2,
      (textMetric.actualBoundingBoxAscent + textMetric.actualBoundingBoxDescent) / 2,
    );

    context2D.fillStyle = fillColor;
    context2D.fillText(this.name, offset.x, offset.y);
    if (strokeColor) {
      context2D.strokeStyle = strokeColor;
      context2D.lineWidth = 12;
      context2D.strokeText(this.name, offset.x, offset.y);
    }

    context2D.restore();
  }

  private computeInWorkArea(rootRadius: number, rootOrientation: number): boolean {
    if (this.selfCaliber !== this.workingDepth) {
      return true;
    }

    const cellRadius = this.radius * this.scale;
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + this.angleShift;
      const point = new Vec2(
        this.position.x + Math.cos(angle) * cellRadius,
        this.position.y + Math.sin(angle) * cellRadius,
      );

      if (!this.isInsideRootHex(point, rootRadius, rootOrientation)) {
        return false;
      }
    }

    return true;
  }

  private isInsideRootHex(point: Vec2, rootRadius: number, rootOrientation: number): boolean {
    const epsilon = 1e-6;

    for (let i = 0; i < 6; i += 1) {
      const angleA = rootOrientation + (Math.PI * 2 * i) / 6;
      const angleB = rootOrientation + (Math.PI * 2 * ((i + 1) % 6)) / 6;

      const ax = Math.cos(angleA) * rootRadius;
      const ay = Math.sin(angleA) * rootRadius;
      const bx = Math.cos(angleB) * rootRadius;
      const by = Math.sin(angleB) * rootRadius;

      const cross = (bx - ax) * (point.y - ay) - (by - ay) * (point.x - ax);
      if (cross < -epsilon) {
        return false;
      }
    }

    return true;
  }

  private checkChildren(): void {
    if (this.globalDepth >= this.selfCaliber && this.children.length === 0) {
      this.createChildren();
    }

    if (this.globalDepth < this.selfCaliber && this.children.length > 0) {
      this.clearChildren();
    }
  }

  private createChildren(): void {
    this.clearChildren();

    for (let i = 0; i < this.childrenLimit; i += 1) {
      const position = this.position.clone();
      if (i > 0) {
        position.x += Math.cos((Math.PI * 2 * (i - 1)) / 6 + this.angleShift) * this.radius * this.scale;
        position.y += Math.sin((Math.PI * 2 * (i - 1)) / 6 + this.angleShift) * this.radius * this.scale;
      }

      this.children.push(new HexCell(this, i, position));
    }

    HexCell.debugCellsCount += this.children.length;
  }

  private clearChildren(): void {
    HexCell.debugCellsCount -= this.children.length;
    this.children = [];
  }

  private computeAngleShift(pointyUpward: boolean): number {
    const evenDepth = this.selfCaliber % 2 === 0;
    const useAlternativeShift = evenDepth === pointyUpward;
    return useAlternativeShift ? Math.PI / 6 : 0;
  }
}
