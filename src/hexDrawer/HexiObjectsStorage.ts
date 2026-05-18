import type { HexRecord } from './HexStorage';
import { HexiObject } from './HexiObject';

const SNAPSHOT_KEY = 'hexdrawer.snapshot';

interface ImportedHexiObject {
  id?: string;
  name?: string;
  hexs?: HexRecord;
}

function createObjectId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `hex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class HexiObjectsStorage {
  private readonly map = new Map<string, HexiObject>();

  public constructor() {
    this.loadSnapshot();
  }

  public create(name: string, hexs?: HexRecord): string {
    const objectName = name.trim().length > 0 ? name.trim() : 'New hexi-object';
    const object = new HexiObject(createObjectId(), objectName, hexs ?? {});
    this.map.set(object.id, object);
    return object.id;
  }

  public remove(id: string): void {
    this.map.delete(id);
  }

  public get(id: string): HexiObject | null {
    return this.map.get(id) ?? null;
  }

  public list(): Array<{ id: string; name: string }> {
    return Array.from(this.map.values()).map((value) => ({ id: value.id, name: value.name }));
  }

  public import(data: string): string {
    const parsed = JSON.parse(data) as ImportedHexiObject;
    const object = new HexiObject(
      parsed.id ?? createObjectId(),
      parsed.name?.trim() ? parsed.name : 'Imported object',
      parsed.hexs ?? {},
    );
    this.map.set(object.id, object);
    return object.id;
  }

  public export(id: string): string | null {
    const object = this.map.get(id);
    if (!object) {
      return null;
    }

    return JSON.stringify(object, null, 2);
  }

  public sync(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const objects = Array.from(this.map.values());
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(objects));
  }

  private loadSnapshot(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const snapshot = localStorage.getItem(SNAPSHOT_KEY);
    if (!snapshot) {
      return;
    }

    try {
      const parsed = JSON.parse(snapshot) as ImportedHexiObject[];
      for (const candidate of parsed) {
        const object = new HexiObject(
          candidate.id ?? createObjectId(),
          candidate.name?.trim() ? candidate.name : 'Recovered object',
          candidate.hexs ?? {},
        );
        this.map.set(object.id, object);
      }
    } catch (error) {
      console.error('Failed to parse HexDrawer snapshot', error);
    }
  }
}
