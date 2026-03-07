// Audio orchestration layer (manages state and persistence)
import { audioDriver, type MusicTrackHandle } from '../audio/audioDriver';

const MUSIC_STATE_KEY = 'hexigame.music.state';

interface MusicPlaybackState {
  currentTrackIndex: number;
  currentTime: number;
}

interface AudioControllerInterface {
  init: () => void;
  playMusic: (enabled: boolean, volume: number) => Promise<void>;
  pauseMusic: () => void;
  resumeMusic: (enabled: boolean, volume: number) => void;
  updateMusicVolume: (volume: number) => void;
  playRandomSound: (enabled: boolean, volume: number) => void;
  playSound: (path: string, enabled: boolean, volume: number) => void;
  templateCellCorrect: (enabled: boolean, volume: number) => void;
  templateCellWrong: (enabled: boolean, volume: number) => void;
  templateCompleted: (enabled: boolean, volume: number) => void;
}

class AudioController implements AudioControllerInterface {
  private currentTrack: MusicTrackHandle | null = null;
  private playbackState: MusicPlaybackState;
  private musicInitialized = false;
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

  init(): void {
    // Load initial track (not playing yet, waiting for user interaction)
    this.loadTrack();
  }

  private loadTrack(): void {
    // Destroy previous track
    if (this.currentTrack) {
      this.currentTrack.destroy();
      this.currentTrack = null;
    }

    // Load new track
    this.currentTrack = audioDriver.loadMusicTrack(this.playbackState.currentTrackIndex);
    
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

    // Auto-play next track if music is considered "initialized" (playing)
    if (this.musicInitialized && this.currentTrack) {
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

  async playMusic(enabled: boolean, volume: number): Promise<void> {
    if (!enabled || !this.currentTrack) return;
    
    this.currentTrack.setVolume(volume);
    try {
      await this.currentTrack.play();
      this.musicInitialized = true;
    } catch (err) {
      // Autoplay blocked - will retry on user interaction
    }
  }

  pauseMusic(): void {
    this.persistMusicState();
    this.currentTrack?.pause();
  }

  resumeMusic(enabled: boolean, volume: number): void {
    if (enabled && this.musicInitialized) {
      this.playMusic(enabled, volume);
    }
  }

  updateMusicVolume(volume: number): void {
    this.currentTrack?.setVolume(volume);
  }

  playRandomSound(enabled: boolean, volume: number): void {
    if (!enabled) return;
    audioDriver.playRandomSound(volume);
  }

  playSound(path: string, enabled: boolean, volume: number): void {
    if (!enabled) return;
    audioDriver.playSound(path, volume);
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
