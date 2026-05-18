import type { HexRecord } from './HexStorage';

export class HexiObject {
  public id: string;
  public name: string;
  public hexs: HexRecord;

  public constructor(id: string, name: string, hexs?: HexRecord) {
    this.id = id;
    this.name = name;
    this.hexs = hexs ?? {};
  }
}
