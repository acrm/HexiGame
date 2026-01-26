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
    'language.ru': 'Русский',
    'action.startGuest': 'Start as Guest',
    'wiki.elapsed': 'Elapsed Time',
    'wiki.instructions.title': 'How to Play',
    'wiki.instructions.desktop.step1': 'Move the turtle using arrow keys',
    'wiki.instructions.desktop.step2': 'Hold Space to charge capture on colored cells',
    'wiki.instructions.desktop.step3': 'Success chance depends on color distance from orange',
    'wiki.instructions.desktop.step4': 'Carry captured cells to empty spots',
    'wiki.instructions.desktop.step5': 'Release Space to drop the cell',
    'wiki.instructions.mobile.step1': 'Tap cells to move the turtle',
    'wiki.instructions.mobile.step2': 'Tap ACT button to attempt capture on colored cells',
    'wiki.instructions.mobile.step3': 'Success chance depends on color distance from orange',
    'wiki.instructions.mobile.step4': 'Move to empty spots while carrying',
    'wiki.instructions.mobile.step5': 'Tap ACT again to drop the cell',
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
    'tab.world': 'Мир',
    'tab.self': 'Я',
    'tab.wiki': 'Вики',
    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'language.en': 'English',
    'language.ru': 'Русский',
    'action.startGuest': 'Начать как гость',
    'wiki.elapsed': 'Прошло времени',
    'wiki.instructions.title': 'Как играть',
    'wiki.instructions.desktop.step1': 'Перемещайте черепашку стрелками на клавиатуре',
    'wiki.instructions.desktop.step2': 'Удерживайте Пробел для захвата цветных клеток',
    'wiki.instructions.desktop.step3': 'Шанс успеха зависит от расстояния цвета от оранжевого',
    'wiki.instructions.desktop.step4': 'Переносите захваченные клетки на пустые места',
    'wiki.instructions.desktop.step5': 'Отпустите Пробел, чтобы поставить клетку',
    'wiki.instructions.mobile.step1': 'Тапайте по клеткам для перемещения черепашки',
    'wiki.instructions.mobile.step2': 'Тапайте ACT для попытки захвата цветных клеток',
    'wiki.instructions.mobile.step3': 'Шанс успеха зависит от расстояния цвета от оранжевого',
    'wiki.instructions.mobile.step4': 'Перемещайтесь на пустые места с клеткой',
    'wiki.instructions.mobile.step5': 'Тапните ACT снова, чтобы поставить клетку',
    'settings.open': 'Настройки',
    'settings.close': 'Закрыть',
    'settings.resetSession': 'Сбросить сессию',
    'settings.resetConfirm': 'Вы уверены? Это очистит текущую сессию.',
    'settings.sound': 'Звук',
    'settings.showFPS': 'Показать FPS',
    'settings.mascot': 'Маскот',
    'action.reset': 'Сбросить',
    'action.cancel': 'Отмена',
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
