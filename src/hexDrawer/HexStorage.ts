import { Hex } from './Hex';

export type HexRecord = Record<string, Hex | null>;

export class HexStorage {
  private hexs: HexRecord = {};

  public set(hexs: HexRecord | null | undefined): void {
    this.hexs = hexs ?? {};

    for (const [index, rawHex] of Object.entries(this.hexs)) {
      this.hexs[index] = Hex.fromUnknown(rawHex, index);
    }
  }

  public add(hex: Hex): void {
    this.hexs[hex.index] = hex;
  }

  public get(index: string): Hex | null {
    return this.hexs[index] ?? null;
  }

  public remove(index: string): void {
    this.hexs[index] = null;
  }

  public has(index: string): boolean {
    return this.hexs[index] instanceof Hex;
  }

  public listEntries(): Array<[string, Hex]> {
    const entries: Array<[string, Hex]> = [];
    for (const [index, value] of Object.entries(this.hexs)) {
      if (value instanceof Hex) {
        entries.push([index, value]);
      }
    }
    return entries;
  }

  public listIndices(): string[] {
    return this.listEntries().map(([index]) => index);
  }

  public count(): number {
    return this.listEntries().length;
  }
}
