import { Vec2 } from './Vec2';

export interface HexData {
  color: string;
  shift: Vec2;
  elongatingFactor: number;
  rotation: number;
}

interface SerializedShift {
  x?: number;
  y?: number;
}

interface SerializedHexData {
  color?: string;
  shift?: SerializedShift;
  elongatingFactor?: number;
  rotation?: number;
}

interface SerializedHex {
  index?: string;
  data?: SerializedHexData;
}

export class Hex {
  public index: string;
  public data: HexData;

  public constructor(index: string, color: string) {
    this.index = index;
    this.data = {
      color,
      shift: new Vec2(),
      elongatingFactor: 1,
      rotation: 0,
    };
  }

  public static fromUnknown(raw: unknown, fallbackIndex?: string): Hex | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    if (raw instanceof Hex) {
      return raw;
    }

    const candidate = raw as SerializedHex;
    const index = candidate.index ?? fallbackIndex;
    if (!index) {
      return null;
    }

    const color = candidate.data?.color ?? '#face8d';
    const hex = new Hex(index, color);
    const shift = candidate.data?.shift;
    hex.data = {
      color,
      shift: new Vec2(shift?.x ?? 0, shift?.y ?? 0),
      elongatingFactor: candidate.data?.elongatingFactor ?? 1,
      rotation: candidate.data?.rotation ?? 0,
    };

    return hex;
  }
}
