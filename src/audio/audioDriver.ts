// Low-level HTML5 Audio driver (pure, no state management)

const MUSIC_TRACKS = [
  'audio/Desert Pixels.mp3',
  'audio/Monsoon Cartridge.mp3',
  'audio/Starfog Caravan.mp3',
];

const SOUND_EFFECTS = [
  'audio/mixkit-game-click-1114.wav',
  'audio/mixkit-game-user-interface-tone-2570.wav',
  'audio/mixkit-interface-device-click-2577.wav',
  'audio/mixkit-video-game-retro-click-237.wav',
];

export interface MusicTrackHandle {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  onEnded: (callback: () => void) => void;
  onTimeUpdate: (callback: (time: number) => void) => void;
  destroy: () => void;
}

class MusicTrack implements MusicTrackHandle {
  private audio: HTMLAudioElement;
  private endedCallback: (() => void) | null = null;
  private timeUpdateCallback: ((time: number) => void) | null = null;

  constructor(trackPath: string) {
    this.audio = new Audio(trackPath);
    this.audio.addEventListener('ended', this.handleEnded);
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.addEventListener('loadedmetadata', this.handleMetadataLoaded);
  }

  private handleMetadataLoaded = () => {
    // Metadata loaded, safe to seek/play
  };

  private handleEnded = () => {
    this.endedCallback?.();
  };

  private handleTimeUpdate = () => {
    this.timeUpdateCallback?.(this.audio.currentTime);
  };

  play(): Promise<void> {
    return this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  seek(time: number): void {
    if (isNaN(this.audio.duration)) return;
    const safeTime = Math.min(Math.max(time, 0), Math.max(0, this.audio.duration - 0.25));
    this.audio.currentTime = safeTime;
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    return this.audio.duration;
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  onEnded(callback: () => void): void {
    this.endedCallback = callback;
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallback = callback;
  }

  destroy(): void {
    this.audio.pause();
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.removeEventListener('loadedmetadata', this.handleMetadataLoaded);
    this.endedCallback = null;
    this.timeUpdateCallback = null;
  }
}

export interface AudioDriverInterface {
  getMusicTrackCount: () => number;
  loadMusicTrack: (index: number) => MusicTrackHandle;
  playRandomSound: (volume: number) => void;
  playSound: (path: string, volume: number) => void;
  preloadCriticalAssets: () => Promise<void>;
}

class AudioDriver implements AudioDriverInterface {
  private soundPool: HTMLAudioElement[] = [];
  private preloadPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-load sound effects pool
      for (const sfxPath of SOUND_EFFECTS) {
        const audio = new Audio(sfxPath);
        this.soundPool.push(audio);
      }
    }
  }

  getMusicTrackCount(): number {
    return MUSIC_TRACKS.length;
  }

  loadMusicTrack(index: number): MusicTrackHandle {
    const trackPath = MUSIC_TRACKS[index % MUSIC_TRACKS.length];
    return new MusicTrack(trackPath);
  }

  /**
   * Preload critical audio assets (sound effects + random music track).
   * Returns a promise that resolves when assets are ready to play.
   */
  preloadCriticalAssets(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = (async () => {
      const promises: Promise<void>[] = [];

      // Preload all sound effects
      for (const audio of this.soundPool) {
        promises.push(
          new Promise<void>((resolve) => {
            if (audio.readyState >= 3) {
              // HAVE_FUTURE_DATA or better
              resolve();
            } else {
              const onCanPlay = () => {
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                // Resolve anyway - don't block on failed audio
                resolve();
              };
              audio.addEventListener('canplaythrough', onCanPlay);
              audio.addEventListener('error', onError);
              // Trigger loading
              audio.load();
            }
          })
        );
      }

      // Preload random music track
      const randomIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
      const randomTrackPath = MUSIC_TRACKS[randomIndex];
      const musicPreload = new Audio(randomTrackPath);
      promises.push(
        new Promise<void>((resolve) => {
          const onCanPlay = () => {
            musicPreload.removeEventListener('canplaythrough', onCanPlay);
            musicPreload.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            musicPreload.removeEventListener('canplaythrough', onCanPlay);
            musicPreload.removeEventListener('error', onError);
            resolve();
          };
          musicPreload.addEventListener('canplaythrough', onCanPlay);
          musicPreload.addEventListener('error', onError);
          musicPreload.load();
        })
      );

      await Promise.all(promises);
    })();

    return this.preloadPromise;
  }

  playRandomSound(volume: number): void {
    if (this.soundPool.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * this.soundPool.length);
    const audio = this.soundPool[randomIndex];
    
    // Clone and play to allow overlapping sounds
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = Math.max(0, Math.min(1, volume));
    clone.play().catch(() => {});
  }

  playSound(path: string, volume: number): void {
    const audio = new Audio(path);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {});
  }
}

export const audioDriver = new AudioDriver();
