import { HexCell } from './HexCell';

interface RenderContent {
  draw: (context2D: CanvasRenderingContext2D) => void;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly content: RenderContent;
  private readonly context2D: CanvasRenderingContext2D;

  private frames = 0;
  private previousTimestamp = 0;
  private previousTimestampFrames = 0;
  private elapsedMilliseconds = 0;
  private fps = 0;

  private rafId = 0;
  private isStarted = false;

  public constructor(canvas: HTMLCanvasElement, content: RenderContent) {
    this.canvas = canvas;
    this.content = content;

    const context2D = canvas.getContext('2d');
    if (!context2D) {
      throw new Error('Failed to initialize canvas 2D context');
    }

    this.context2D = context2D;
  }

  public start(): void {
    this.stop();
    this.previousTimestamp = 0;
    this.previousTimestampFrames = 0;
    this.frames = 0;
    this.fps = 0;
    this.isStarted = true;

    const loop = (elapsedMilliseconds: number) => {
      if (!this.isStarted) {
        return;
      }

      this.elapsedMilliseconds = elapsedMilliseconds;
      this.context2D.save();
      this.frames += 1;

      if (elapsedMilliseconds - this.previousTimestamp > 1000) {
        this.fps = ((this.frames - this.previousTimestampFrames) / (elapsedMilliseconds - this.previousTimestamp)) * 1000;
        this.previousTimestampFrames = this.frames;
        this.previousTimestamp = elapsedMilliseconds;
      }

      this.context2D.fillStyle = '#111116';
      this.context2D.strokeStyle = '#ee8800';
      this.context2D.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.content.draw(this.context2D);
      this.drawDebug();

      this.context2D.restore();
      this.rafId = window.requestAnimationFrame(loop);
    };

    this.rafId = window.requestAnimationFrame(loop);
  }

  public stop(): void {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;
    window.cancelAnimationFrame(this.rafId);
  }

  private drawDebug(): void {
    const lines = [
      `Canvas size: ${this.canvas.width}x${this.canvas.height}`,
      `ElapsedTime: ${(this.elapsedMilliseconds / 1000).toFixed(1)}s`,
      `Frames: ${this.frames}, FPS: ${this.fps.toFixed(0)}`,
      `Hex Cells: ${HexCell.debugCellsCount}`,
    ];

    this.drawMultiline(lines);
  }

  private drawMultiline(lines: string[]): void {
    this.context2D.save();

    const fontSize = 10;
    this.context2D.font = `${fontSize}px monospace`;
    const spacing = 2;

    let offset = 0;
    let maxWidth = 0;
    for (const line of lines) {
      offset += spacing + fontSize;
      maxWidth = Math.max(maxWidth, this.context2D.measureText(line).width);
    }

    this.context2D.fillStyle = '#aacccccc';
    this.context2D.fillRect(0, 0, 4 * spacing + maxWidth, offset + 4 * spacing);

    this.context2D.fillStyle = '#000000';
    offset = spacing;

    for (const line of lines) {
      offset += spacing + fontSize;
      this.context2D.fillText(line, 2 * spacing, offset);
    }

    this.context2D.restore();
  }
}
