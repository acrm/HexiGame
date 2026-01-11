export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'hexigame.lang';

let current: Lang = (localStorage.getItem(STORAGE_KEY) as Lang) || 'en';

const dict: Record<Lang, Record<string, string>> = {
  en: {
    'tab.world': 'World',
    'tab.self': 'Self',
    'tab.wiki': 'Wiki',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'language.en': 'English',
    'action.startGuest': 'Start as Guest',
    'wiki.elapsed': 'Elapsed Time',
    'settings.open': 'Settings',
    'settings.close': 'Close',
    'settings.resetSession': 'Reset Session',
    'settings.resetConfirm': 'Are you sure? This will clear your current session.',
    'settings.sound': 'Sound',
    'settings.showFPS': 'Show FPS',
    'settings.mascot': 'Mascot',
    'action.reset': 'Reset',
    'action.cancel': 'Cancel',
  },
  ru: {
    // Placeholder for future Russian localization
    'tab.world': 'World',
    'tab.self': 'Self',
    'tab.wiki': 'Wiki',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'language.en': 'English',
    'action.startGuest': 'Start as Guest',
    'wiki.elapsed': 'Elapsed Time',
    'settings.open': 'Settings',
    'settings.close': 'Close',
    'settings.resetSession': 'Reset Session',
    'settings.resetConfirm': 'Are you sure? This will clear your current session.',
    'settings.sound': 'Sound',
    'settings.showFPS': 'Show FPS',
    'settings.mascot': 'Mascot',
    'action.reset': 'Reset',
    'action.cancel': 'Cancel',
  },
};

export function t(key: string): string {
  return dict[current][key] ?? key;
}

export function getLanguage(): Lang {
  return current;
}

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
}
