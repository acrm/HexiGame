import { CONFIG } from '../config';

export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'hexigame.lang';

let current: Lang | null = null;

function getCurrentLanguage(): Lang {
  if (current === null) {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored) {
      current = stored;
    } else {
      const winLang = typeof window !== 'undefined' ? ((window as any).__HEXIGAME_DEFAULT_LANGUAGE as Lang | undefined) : undefined;
      current = winLang || CONFIG.DEFAULT_LANGUAGE;
    }
  }
  return current;
}

const dict: Record<Lang, Record<string, string>> = {
  en: {
    'tab.heximap': 'HexiMap',
    'tab.hexilab': 'HexiLab',
    'tab.hexipedia': 'HexiPedia',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'language.en': '🇬🇧 English',
    'language.ru': '🇷🇺 Русский',
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
    'settings.soundEnabled': 'Sound Effects',
    'settings.soundVolume': 'SFX Volume',
    'settings.musicEnabled': 'Music',
    'settings.musicVolume': 'Music Volume',
    'settings.showFPS': 'Show FPS',
    'settings.mascot': 'Mascot',
    'settings.handedness': 'Interface Handedness',
    'settings.rightHanded': 'Right-handed',
    'settings.leftHanded': 'Left-handed',
    'action.reset': 'Reset',
    'action.cancel': 'Cancel',
    'tutorial.cellsVisited': 'cells visited',
    'tutorial.levelComplete': 'Level Complete!',
    'tutorial.excellentWork': 'Excellent work! You have mastered this skill.',
    'tutorial.nextLevelHint': 'Ready for the next challenge?',
    'tutorial.nextLevel': 'Next Level',
    'tutorial.skipTutorial': 'Skip Tutorial',
    'tutorial.completeTutorial': 'Complete Tutorial',
    'hexipedia.title': 'HexiPedia',
    'tutorial.currentTask': 'Current Task',
    'tutorial.hint': 'Hint',
    'tutorial.targets': 'Target Cells',
    'tutorial.progress': 'Progress',
    'tutorial.noActiveTask': 'No active tutorial task.',
    'tutorial.taskInProgress': 'Complete the task on HexiMap.',
    'tutorial.taskCompleteTap': 'Task complete — tap to continue.',
    'tutorial.controlHint': 'Tap on a cell to move the focus to it. The agent will follow the focus.',
    'tutorial.followFocusNote': 'The agent will follow the focus.',
    'tutorial.tasksTitle': 'Tasks',
    'stats.title': 'Statistics',
    'stats.sessionTime': 'Session Time',
    'stats.sessionTicks': 'Session Ticks',
  },
  ru: {
    'tab.heximap': 'HexiMap',
    'tab.hexilab': 'HexiLab',
    'tab.hexipedia': 'HexiPedia',
    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'language.en': '🇬🇧 English',
    'language.ru': '🇷🇺 Русский',
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
    'settings.soundEnabled': 'Звуки',
    'settings.soundVolume': 'Громкость звуков',
    'settings.musicEnabled': 'Музыка',
    'settings.musicVolume': 'Громкость музыки',
    'settings.showFPS': 'Показать FPS',
    'settings.mascot': 'Маскот',
    'settings.handedness': 'Сторона интерфейса',
    'settings.rightHanded': 'Правосторонний',
    'settings.leftHanded': 'Левосторонний',
    'action.reset': 'Сбросить',
    'action.cancel': 'Отмена',
    'tutorial.cellsVisited': 'клеток посещено',
    'tutorial.levelComplete': 'Уровень пройден!',
    'tutorial.excellentWork': 'Отлично! Вы овладели этим навыком.',
    'tutorial.nextLevelHint': 'Готовы к следующему испытанию?',
    'tutorial.nextLevel': 'Следующий уровень',
    'tutorial.skipTutorial': 'Пропустить обучение',
    'tutorial.completeTutorial': 'Завершить обучение',
    'hexipedia.title': 'HexiPedia',
    'tutorial.currentTask': 'Текущая задача',
    'tutorial.hint': 'Подсказка',
    'tutorial.targets': 'Целевые клетки',
    'tutorial.progress': 'Прогресс',
    'tutorial.noActiveTask': 'Нет активной задачи обучения.',
    'tutorial.taskInProgress': 'Выполните задание в HexiMap.',
    'tutorial.taskCompleteTap': 'Задание выполнено — нажмите, чтобы продолжить.',
    'tutorial.controlHint': 'Тапните по клетке, чтобы подойти к ней. Агент будет следовать за фокусом.',
    'tutorial.followFocusNote': 'Агент будет следовать за фокусом.',
    'tutorial.tasksTitle': 'Задания',
    'stats.title': 'Статистика',
    'stats.sessionTime': 'Время сессии',
    'stats.sessionTicks': 'Такты сессии',
  },
};

export function t(key: string): string {
  return dict[getCurrentLanguage()][key] ?? key;
}

export function getLanguage(): Lang {
  return getCurrentLanguage();
}

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
}
