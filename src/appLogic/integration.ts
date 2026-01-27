// Platform integration abstraction (agnostic main code)
// Only binds Yandex SDK when built with mode 'yandex'.

import { CONFIG } from '../config';

export interface PlatformIntegration {
  init(): Promise<void> | void;
  onGameReady(): void;
  onGameplayStart(): void;
  onGameplayStop(): void;
  onPause(): void;
  onResume(): void;
}

class NullIntegration implements PlatformIntegration {
  init() {}
  onGameReady() {}
  onGameplayStart() {}
  onGameplayStop() {}
  onPause() {}
  onResume() {}
}

// Minimal Yandex SDK integration; loaded only in yandex build mode
class YandexIntegration implements PlatformIntegration {
  private ysdk: any | null = null;
  private sdkLoaded = false;

  constructor() {
    // Override default language for Yandex build
    if (import.meta.env.MODE === 'yandex') {
      (CONFIG as any).DEFAULT_LANGUAGE = 'ru';
      // Share initial language choice so i18n can pick it lazily
      if (typeof window !== 'undefined') {
        (window as any).__HEXIGAME_DEFAULT_LANGUAGE = 'ru';
      }
    }
  }

  async init() {
    if (typeof window === 'undefined') return;
    if (this.sdkLoaded) return;

    // Dynamically load SDK script only in yandex mode
    if (import.meta.env.MODE === 'yandex') {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://yandex.ru/games/sdk.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Yandex SDK failed to load'));
        document.head.appendChild(script);
      }).catch(() => {});

      if ((window as any).YaGames?.init) {
        try {
          this.ysdk = await (window as any).YaGames.init();
          // After SDK init, take language from SDK environment
          const sdkLang = this.ysdk?.environment?.i18n?.lang || this.ysdk?.i18n?.lang;
          const mapped = typeof sdkLang === 'string' && sdkLang.startsWith('ru') ? 'ru' : 'en';
          (CONFIG as any).DEFAULT_LANGUAGE = mapped;
          (window as any).__HEXIGAME_DEFAULT_LANGUAGE = mapped;
          // If пользователь ещё не выбрал язык, зафиксируем автоопределённый
          if (typeof localStorage !== 'undefined' && !localStorage.getItem('hexigame.lang')) {
            localStorage.setItem('hexigame.lang', mapped);
          }
        } catch {
          this.ysdk = null;
        }
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
    // Yandex SDK pause/resume are event subscriptions; we send gameplay stop as a proxy
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

export const integration: PlatformIntegration =
  import.meta.env.MODE === 'yandex' ? new YandexIntegration() : new NullIntegration();

// Initialize integration early to set up config overrides
if (typeof window !== 'undefined') {
  integration.init();
}
