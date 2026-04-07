// Audio orchestration layer (manages state and persistence)
import { audioDriver, type MusicTrackHandle } from '../audio/audioDriver';

const MUSIC_STATE_KEY = 'hexigame.music.state';

interface MusicPlaybackState {
  currentTrackIndex: number;
  currentTime: number;
}

interface AudioControllerInterface {
  init: (initialMusicVolume?: number, initialSoundVolume?: number) => void;
  preload: () => Promise<void>;
  setMusicEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  playMusic: (enabled: boolean, volume: number) => Promise<void>;
  pauseMusic: () => void;
  resumeMusic: (enabled: boolean, volume: number) => void;
  updateMusicVolume: (volume: number) => void;
  updateSoundVolume: (volume: number) => void;
  playRandomSound: (enabled: boolean, volume: number) => void;
  playSound: (path: string, enabled: boolean, volume: number) => void;
  invalidMove: (enabled: boolean, volume: number) => void;
  templateCellCorrect: (enabled: boolean, volume: number) => void;
  templateCellWrong: (enabled: boolean, volume: number) => void;
  templateCompleted: (enabled: boolean, volume: number) => void;
}

class AudioController implements AudioControllerInterface {
  private currentTrack: MusicTrackHandle | null = null;
  private playbackState: MusicPlaybackState;
  private musicEnabled = true;
  private musicVolume = 0.5;
  private soundEnabled = true;
  private soundVolume = 0.5;
  private lastPersistedSecond = -1;

  constructor() {
    const savedState = this.loadMusicState();
    if (savedState) {
      this.playbackState = savedState;
    } else {
      // Random initial track
      const trackCount = audioDriver.getMusicTrackCount();
      this.playbackState = {
        currentTrackIndex: Math.floor(Math.random() * trackCount),
        currentTime: 0,
      };
    }
  }

  init(initialMusicVolume?: number, initialSoundVolume?: number): void {
    // Apply initial volumes BEFORE loading the track so the first track
    // is created at the user-configured volume, not the hardcoded default.
    if (initialMusicVolume !== undefined) this.musicVolume = initialMusicVolume;
    if (initialSoundVolume !== undefined) this.soundVolume = initialSoundVolume;
    this.loadTrack();
  }

  /**
   * Preload critical audio assets before showing the game.
   * Should be called during app initialization.
   */
  async preload(): Promise<void> {
    await audioDriver.preloadCriticalAssets();
  }

  private loadTrack(): void {
    // Destroy previous track
    if (this.currentTrack) {
      this.currentTrack.destroy();
      this.currentTrack = null;
    }

    // Load new track
    this.currentTrack = audioDriver.loadMusicTrack(this.playbackState.currentTrackIndex);
    this.currentTrack.setVolume(this.musicVolume);
    
    // Set up event listeners
    this.currentTrack.onEnded(() => {
      this.handleTrackEnd();
    });

    this.currentTrack.onTimeUpdate((time) => {
      this.handleTimeUpdate(time);
    });

    // Seek to saved time if available
    if (this.playbackState.currentTime > 0) {
      this.currentTrack.seek(this.playbackState.currentTime);
      this.playbackState.currentTime = 0; // Clear after use
    }
  }

  private handleTrackEnd(): void {
    const trackCount = audioDriver.getMusicTrackCount();
    this.playbackState.currentTrackIndex = (this.playbackState.currentTrackIndex + 1) % trackCount;
    this.playbackState.currentTime = 0;
    this.persistMusicState(0);
    this.loadTrack();

    if (this.musicEnabled && this.currentTrack) {
      this.currentTrack.setVolume(this.musicVolume);
      this.currentTrack.play().catch(() => {});
    }
  }

  private handleTimeUpdate(time: number): void {
    const currentSecond = Math.floor(time);
    if (currentSecond === this.lastPersistedSecond) return;
    this.persistMusicState(currentSecond);
  }

  private persistMusicState(timeOverride?: number): void {
    if (typeof window === 'undefined') return;
    try {
      const time = timeOverride ?? this.currentTrack?.getCurrentTime() ?? 0;
      this.lastPersistedSecond = Math.floor(time);
      localStorage.setItem(
        MUSIC_STATE_KEY,
        JSON.stringify({
          trackIndex: this.playbackState.currentTrackIndex,
          time,
        })
      );
    } catch (err) {
      // Ignore storage errors
    }
  }

  private loadMusicState(): MusicPlaybackState | null {
    try {
      const raw = localStorage.getItem(MUSIC_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { trackIndex?: number; time?: number };
      if (typeof parsed.trackIndex !== 'number' || typeof parsed.time !== 'number') {
        return null;
      }
      const trackCount = audioDriver.getMusicTrackCount();
      if (parsed.trackIndex < 0 || parsed.trackIndex >= trackCount) {
        return null;
      }
      return { currentTrackIndex: parsed.trackIndex, currentTime: Math.max(0, parsed.time) };
    } catch (err) {
      return null;
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;

    if (!enabled) {
      this.pauseMusic();
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  async playMusic(enabled: boolean, volume: number): Promise<void> {
    this.musicEnabled = enabled;
    this.musicVolume = volume;

    if (!enabled || !this.currentTrack) return;
    
    this.currentTrack.setVolume(volume);
    try {
      await this.currentTrack.play();
    } catch (err) {
      // Autoplay blocked - will retry on user interaction
    }
  }

  pauseMusic(): void {
    this.persistMusicState();
    this.currentTrack?.pause();
  }

  resumeMusic(enabled: boolean, volume: number): void {
    this.musicEnabled = enabled;
    this.musicVolume = volume;

    if (enabled) {
      this.playMusic(enabled, volume);
    }
  }

  updateMusicVolume(volume: number): void {
    this.musicVolume = volume;
    this.currentTrack?.setVolume(volume);
  }

  updateSoundVolume(volume: number): void {
    this.soundVolume = volume;
  }

  playRandomSound(enabled: boolean, volume: number): void {
    if (!enabled) return;
    audioDriver.playRandomSound(volume);
  }

  playSound(path: string, enabled: boolean, volume: number): void {
    if (!enabled) return;
    audioDriver.playSound(path, volume);
  }

  invalidMove(enabled: boolean, volume: number): void {
    this.playSound('audio/mixkit-video-game-retro-click-237.wav', enabled, volume);
  }

  templateCellCorrect(enabled: boolean, volume: number): void {
    this.playSound('audio/mixkit-game-user-interface-tone-2570.wav', enabled, volume);
  }

  templateCellWrong(enabled: boolean, volume: number): void {
    this.playSound('audio/mixkit-video-game-retro-click-237.wav', enabled, volume);
  }

  templateCompleted(enabled: boolean, volume: number): void {
    this.playSound('audio/mixkit-game-click-1114.wav', enabled, volume);
  }
}

export const audioController = new AudioController();
