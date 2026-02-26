// Audio manager for background music and sound effects
const MUSIC_TRACKS = [
  'audio/Desert Pixels.mp3',
  'audio/Monsoon Cartridge.mp3',
  'audio/Starfog Caravan.mp3',
];

const SOUND_EFFECTS = [
//   'audio/mixkit-cinematic-whoosh-stutter-787.wav',
//   'audio/mixkit-epic-orchestra-transition-2290.wav',
  'audio/mixkit-game-click-1114.wav',
//   'audio/mixkit-game-spinning-machine-2645.wav',
  'audio/mixkit-game-user-interface-tone-2570.wav',
  'audio/mixkit-interface-device-click-2577.wav',
//   'audio/mixkit-select-click-1109.wav',
//   'audio/mixkit-spacey-swish-spin-1500.wav',
//   'audio/mixkit-swirling-whoosh-1493.wav',
  'audio/mixkit-video-game-retro-click-237.wav',
];

class AudioManager {
  private musicAudio: HTMLAudioElement | null = null;
  private musicEnabled: boolean = true;
  private musicVolume: number = 0.5;
  private musicInitialized: boolean = false;
  private currentTrackIndex: number = 0;
  
  private soundEnabled: boolean = true;
  private soundVolume: number = 0.6;
  private soundPool: HTMLAudioElement[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.shuffleTracks();
      this.loadNextTrack();
      
      // Pre-load sound effects pool
      for (const sfxPath of SOUND_EFFECTS) {
        const audio = new Audio(sfxPath);
        audio.volume = this.soundVolume;
        this.soundPool.push(audio);
      }
    }
  }

  private shuffleTracks() {
    // Fisher-Yates shuffle for music tracks
    const tracks = [...MUSIC_TRACKS];
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    // Store shuffled order (simple approach: just randomize currentTrackIndex)
    this.currentTrackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
  }

  private loadNextTrack() {
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.removeEventListener('ended', this.handleTrackEnd);
    }
    
    this.musicAudio = new Audio(MUSIC_TRACKS[this.currentTrackIndex]);
    this.musicAudio.volume = this.musicVolume;
    this.musicAudio.addEventListener('ended', this.handleTrackEnd);
    
    if (this.musicInitialized && this.musicEnabled) {
      this.musicAudio.play().catch(() => {});
    }
  }

  private handleTrackEnd = () => {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % MUSIC_TRACKS.length;
    this.loadNextTrack();
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicAudio) {
      this.musicAudio.volume = this.musicVolume;
    }
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (this.musicInitialized) {
      if (enabled) {
        this.playMusic();
      } else {
        this.pauseMusic();
      }
    }
  }

  async playMusic() {
    if (!this.musicAudio || !this.musicEnabled) return;
    try {
      await this.musicAudio.play();
      this.musicInitialized = true;
    } catch (err) {
      // Autoplay blocked - will retry on user interaction
    }
  }

  pauseMusic() {
    if (!this.musicAudio) return;
    this.musicAudio.pause();
  }

  resumeMusic() {
    if (this.musicEnabled) {
      this.playMusic();
    }
  }

  // Sound effects methods
  setSoundVolume(volume: number) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    for (const audio of this.soundPool) {
      audio.volume = this.soundVolume;
    }
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  playRandomSound() {
    if (!this.soundEnabled || this.soundPool.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * this.soundPool.length);
    const audio = this.soundPool[randomIndex];
    
    // Clone and play to allow overlapping sounds
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = this.soundVolume;
    clone.play().catch(() => {});
  }

  playSound(soundPath: string) {
    if (!this.soundEnabled) return;
    const audio = new Audio(soundPath);
    audio.volume = this.soundVolume;
    audio.play().catch(() => {});
  }

  // Template system sounds
  templateCellCorrect() {
    // Play a pleasant confirmation sound
    if (!this.soundEnabled) return;
    this.playSound('audio/mixkit-game-user-interface-tone-2570.wav');
  }

  templateCellWrong() {
    // Play a negative feedback sound
    if (!this.soundEnabled) return;
    this.playSound('audio/mixkit-video-game-retro-click-237.wav');
  }

  templateCompleted() {
    // Play a celebration/fanfare sound (currently using a positive sound)
    // TODO: Add actual fanfare sound file
    if (!this.soundEnabled) return;
    this.playSound('audio/mixkit-game-click-1114.wav');
  }

  // Legacy compatibility methods
  setVolume(volume: number) {
    this.setMusicVolume(volume);
  }

  setEnabled(enabled: boolean) {
    this.setMusicEnabled(enabled);
  }

  async play() {
    return this.playMusic();
  }

  pause() {
    this.pauseMusic();
  }

  resume() {
    this.resumeMusic();
  }
}

export const audioManager = new AudioManager();
