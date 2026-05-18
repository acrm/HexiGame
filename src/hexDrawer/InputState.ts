import { Vec2 } from './Vec2';

export class InputState {
  public time: number;
  public canvasSize: Vec2;
  public mousePosition: Vec2;
  public mouseLeftButtonDown: boolean;
  public mouseRightButtonDown: boolean;
  public mouseWheel: number;
  public keyPressed: string | null;
  public caliber: number;
  public zoomFactor: number;
  public pointyUpward: boolean;

  public constructor() {
    this.time = 0;
    this.canvasSize = new Vec2();
    this.mousePosition = new Vec2();
    this.mouseLeftButtonDown = false;
    this.mouseRightButtonDown = false;
    this.mouseWheel = 0;
    this.keyPressed = null;
    this.caliber = -6;
    this.zoomFactor = 1;
    this.pointyUpward = true;
  }
}
