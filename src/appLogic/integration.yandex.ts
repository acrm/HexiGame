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
        (window as any).ysdk = this.ysdk;
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
      if (ysdk?.features?.LoadingAPI?.ready) {
        ysdk.features.LoadingAPI.ready();
        console.log('[Yandex SDK] ✓ LoadingAPI.ready() called successfully');
      } else {
        console.warn('[Yandex SDK] ⚠ LoadingAPI.ready() not available');
      }
    } catch (err) {
      console.error('[Yandex SDK] ✗ LoadingAPI.ready() failed:', err);
    }
  }

  onGameplayStart() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.features?.GameplayAPI?.start) {
        ysdk.features.GameplayAPI.start();
        console.log('[Yandex SDK] ▶ GameplayAPI.start() called successfully');
      } else {
        console.warn('[Yandex SDK] ⚠ GameplayAPI.start() not available');
      }
    } catch (err) {
      console.error('[Yandex SDK] ✗ GameplayAPI.start() failed:', err);
    }
  }

  onGameplayStop() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.features?.GameplayAPI?.stop) {
        ysdk.features.GameplayAPI.stop();
        console.log('[Yandex SDK] ⏹ GameplayAPI.stop() called successfully');
      } else {
        console.warn('[Yandex SDK] ⚠ GameplayAPI.stop() not available');
      }
    } catch (err) {
      console.error('[Yandex SDK] ✗ GameplayAPI.stop() failed:', err);
    }
  }

  onPause() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.features?.GameplayAPI?.stop) {
        ysdk.features.GameplayAPI.stop();
        console.log('[Yandex SDK] ⏸ GameplayAPI.stop() (pause) called successfully');
      } else {
        console.warn('[Yandex SDK] ⚠ GameplayAPI.stop() (pause) not available');
      }
    } catch (err) {
      console.error('[Yandex SDK] ✗ GameplayAPI.stop() (pause) failed:', err);
    }
  }

  onResume() {
    const ysdk = this.ysdk ?? (window as any).ysdk;
    try {
      if (ysdk?.features?.GameplayAPI?.start) {
        ysdk.features.GameplayAPI.start();
        console.log('[Yandex SDK] ▶ GameplayAPI.start() (resume) called successfully');
      } else {
        console.warn('[Yandex SDK] ⚠ GameplayAPI.start() (resume) not available');
      }
    } catch (err) {
      console.error('[Yandex SDK] ✗ GameplayAPI.start() (resume) failed:', err);
    }
  }
}

export const integration: PlatformIntegration = new YandexIntegration();

if (typeof window !== 'undefined') {
  integration.init();
}
