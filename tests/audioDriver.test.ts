import { beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerMap = Map<string, Set<() => void>>;

class MockAudioElement {
  public currentTime = 0;
  public duration = Number.NaN;
  public volume = 1;
  public readyState = 0;
  private listeners: ListenerMap = new Map();

  addEventListener(event: string, listener: () => void): void {
    const listeners = this.listeners.get(event) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeEventListener(event: string, listener: () => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  dispatch(event: string): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener();
    }
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  load(): void {}

  cloneNode(): MockAudioElement {
    return new MockAudioElement();
  }
}

describe('audioDriver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('applies pending seek after metadata is loaded', async () => {
    const created: MockAudioElement[] = [];

    class MockAudioConstructor {
      constructor() {
        const audio = new MockAudioElement();
        created.push(audio);
        return audio;
      }
    }

    vi.stubGlobal('window', {});
    vi.stubGlobal('Audio', MockAudioConstructor as unknown as typeof Audio);

    const { audioDriver } = await import('../src/audio/audioDriver');
    const track = audioDriver.loadMusicTrack(0);
    const trackAudio = created.at(-1);

    expect(trackAudio).toBeDefined();

    track.seek(42.75);
    expect(trackAudio?.currentTime).toBe(0);

    if (trackAudio) {
      trackAudio.duration = 120;
      trackAudio.dispatch('loadedmetadata');
      expect(trackAudio.currentTime).toBe(42.75);
    }
  });
});
