import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockTrack = {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  getDuration: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  onEnded: ReturnType<typeof vi.fn>;
  onTimeUpdate: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  emitEnded: () => void;
};

function createMockTrack(): MockTrack {
  let endedCallback: (() => void) | null = null;
  let timeUpdateCallback: ((time: number) => void) | null = null;

  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(12),
    getDuration: vi.fn().mockReturnValue(120),
    setVolume: vi.fn(),
    onEnded: vi.fn((callback: () => void) => {
      endedCallback = callback;
    }),
    onTimeUpdate: vi.fn((callback: (time: number) => void) => {
      timeUpdateCallback = callback;
    }),
    destroy: vi.fn(),
    emitEnded: () => {
      endedCallback?.();
    },
  };
}

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

async function loadAudioController() {
  vi.resetModules();

  const tracks: MockTrack[] = [];
  const storage = createStorage();
  vi.stubGlobal('localStorage', storage);

  vi.doMock('../src/audio/audioDriver', () => ({
    audioDriver: {
      getMusicTrackCount: () => 3,
      loadMusicTrack: () => {
        const track = createMockTrack();
        tracks.push(track);
        return track;
      },
      playRandomSound: vi.fn(),
      playSound: vi.fn(),
      preloadCriticalAssets: vi.fn().mockResolvedValue(undefined),
    },
  }));

  const module = await import('../src/appLogic/audioController');
  return {
    audioController: module.audioController,
    tracks,
    storage,
  };
}

describe('audioController', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not autoplay the next track after music has been disabled', async () => {
    const { audioController, tracks } = await loadAudioController();

    audioController.init();
    await audioController.playMusic(true, 0.25);
    audioController.setMusicEnabled(false);

    tracks[0].emitEnded();

    expect(tracks).toHaveLength(2);
    expect(tracks[0].pause).toHaveBeenCalledTimes(1);
    expect(tracks[1].play).not.toHaveBeenCalled();
  });

  it('preserves volume and autoplays next track when music is still enabled', async () => {
    const { audioController, tracks } = await loadAudioController();

    audioController.init();
    await audioController.playMusic(true, 0.33);

    tracks[0].emitEnded();

    expect(tracks).toHaveLength(2);
    expect(tracks[1].setVolume).toHaveBeenCalledWith(0.33);
    expect(tracks[1].play).toHaveBeenCalledTimes(1);
  });

  it('resumeMusic replays current track when enabled', async () => {
    const { audioController, tracks } = await loadAudioController();

    audioController.init();
    audioController.resumeMusic(true, 0.4);

    expect(tracks[0].setVolume).toHaveBeenCalledWith(0.4);
    expect(tracks[0].play).toHaveBeenCalledTimes(1);
  });
});