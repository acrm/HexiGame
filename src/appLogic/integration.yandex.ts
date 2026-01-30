import { CONFIG } from '../config';
import type { SDK } from 'ysdk';

interface PlatformIntegration {
  init(): Promise<void> | void;
  onGameReady(): void;
  onGameplayStart(): void;
  onGameplayStop(): void;
  onPause(): void;
  onResume(): void;
}

// Yandex SDK integration (Yandex build only)
class YandexIntegration implements PlatformIntegration {
  private ysdk: SDK | null = null;
  private sdkLoaded = false;

  constructor() {
    // Default language for Yandex build
    CONFIG.DEFAULT_LANGUAGE = 'ru';
    if (typeof window !== 'undefined') {
      (window as any).__HEXIGAME_DEFAULT_LANGUAGE = 'ru';
    }
  }

  async init() {
    if (typeof window === 'undefined') return;
    if (this.sdkLoaded) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/sdk.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Yandex SDK failed to load'));
      document.head.appendChild(script);
    }).catch(() => {});

    if ((window as any).YaGames?.init) {
      try {
        this.ysdk = await (window as any).YaGames.init();
        const sdkLang = this.ysdk?.environment?.i18n?.lang;
        const mapped = typeof sdkLang === 'string' && sdkLang.startsWith('ru') ? 'ru' : 'en';
        CONFIG.DEFAULT_LANGUAGE = mapped;
        (window as any).__HEXIGAME_DEFAULT_LANGUAGE = mapped;
        if (typeof localStorage !== 'undefined' && !localStorage.getItem('hexigame.lang')) {
          localStorage.setItem('hexigame.lang', mapped);
        }
      } catch {
        this.ysdk = null;
      }
    }

    this.sdkLoaded = true;
  }

  onGameReady() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.LoadingAPI?.ready) ysdk.LoadingAPI.ready();
    } catch {}
  }

  onGameplayStart() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.GameplayAPI?.start) ysdk.GameplayAPI.start();
    } catch {}
  }

  onGameplayStop() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.GameplayAPI?.stop) ysdk.GameplayAPI.stop();
    } catch {}
  }

  onPause() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.GameplayAPI?.stop) ysdk.GameplayAPI.stop();
    } catch {}
  }

  onResume() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.GameplayAPI?.start) ysdk.GameplayAPI.start();
    } catch {}
  }
}

export const integration: PlatformIntegration = new YandexIntegration();

if (typeof window !== 'undefined') {
  integration.init();
}
