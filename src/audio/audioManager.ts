// Audio manager for background music
class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('audio/Desert Pixels.mp3');
      this.audio.loop = true;
      this.audio.volume = 0.5;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.initialized) {
      if (enabled) {
        this.play();
      } else {
        this.pause();
      }
    }
  }

  async play() {
    if (!this.audio || !this.enabled) return;
    try {
      await this.audio.play();
      this.initialized = true;
    } catch (err) {
      // Autoplay blocked - will retry on user interaction
    }
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  resume() {
    if (this.enabled) {
      this.play();
    }
  }
}

export const audioManager = new AudioManager();
